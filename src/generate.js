const path = require('node:path');
const fs = require('node:fs/promises');
const fm = require('front-matter');
const marked = require('marked');
const utils = require('./utils.js');
const footerHandler = require('./templates/footer.js');
const generateHomepage = require('./templates/homepage.js');
const generateTopLevelPages = require('./templates/topLevelPages.js');
const generateAssets = require('./templates/assetsHandler.js');
const generatePost = require('./templates/posts.js');
const templateHelper = require('./templates/templateHelper.js');

// Use sequential awaits to ensure predictable execution order and readable logs
async function generateSite() {
    const timerLabel = 'Generate site async';
    console.time(timerLabel);
    utils.validateConfigurations();

    // Prepare atomic write. Build into a temporary folder, then swap on success
    const tempOutputPath = path.join(__dirname, '../', utils.siteConfig.outputDirectory + '.tmp');
    const backupPath = utils.OUTPUT_DIR_PATH + '.old';
    utils.setTempOutput(tempOutputPath);
    await utils.prepareDirectory(tempOutputPath);

    try {
        // Preparation tasks for buliding site including generating images since their conten hash filenames are required in the next steps
        // Each post meta contains front-matter attributes plus additional properties link, imageHashPath, postType and mdFilename
        const allPostMeta = await prepareSiteGeneration();

        if (utils.isFeatureEnabled('enableSearch')) {
            await templateHelper.generateSearchData(allPostMeta);
        }

        // Generate assets upfront to use filename content hash for cache busting
        await generateAssets();

        // Generate footers upfront so they can be added to all site pages
        await footerHandler.generateFooters();

        // Generate post pages
        await generateContent();

        // Generate the rest of the site
        const recentPosts = getRecentPosts(allPostMeta, 5);
        await generateHomepage(recentPosts);
        await generateTopLevelPages(allPostMeta);
    } catch (err) {
        throw new Error('Error generating site. Existing public directory preserved. ' + err.stack);
    }

    // Generation success, complete atomic swap
    atomicSwap(tempOutputPath, backupPath);
    console.timeEnd(timerLabel);
}

async function atomicSwap(tempOutputPath, backupPath) {
    try {
        // Remove old backup output folder if exists
        await fs.rm(backupPath, { recursive: true, force: true });

        // Rename existing output folder to backup if exists
        if (await utils.dirExistsAsync(utils.OUTPUT_DIR_PATH)) {
            await fs.rename(utils.OUTPUT_DIR_PATH, backupPath);
        }

        // Rename the temp output folder to the output folder
        await fs.rename(tempOutputPath, utils.OUTPUT_DIR_PATH);

        // Remove backup folder
        await fs.rm(backupPath, { recursive: true, force: true });
    } catch (err) {
        let restored = false;
        const hasBackup = await utils.dirExistsAsync(backupPath);
        const hasOutput = await utils.dirExistsAsync(utils.OUTPUT_DIR_PATH);
        if (hasBackup && !hasOutput) {
            await fs.rename(backupPath, utils.OUTPUT_DIR_PATH);
            restored = true;
        }
        const message = 'Atomic swap failed.' + (restored ? ' Restored old public folder.' : ' Did not restore old public folder.') + ' ' + err.stack;
        throw new Error(message);
    }
}

// Iterate through each post type directory, generate images and post meta
async function prepareSiteGeneration(deps = { generateImages, getPostMeta }) {
    let allPostMeta = [];

    // Get contents of post type directory
    for (const postType of Object.keys(utils.siteConfig.postTypes)) {
        const postTypeConfig = utils.getPostTypeConfig(postType);
        const postTypePath = path.join(utils.CONTENT_DIR_PATH, postTypeConfig.postTypeDirectory);
        const postDirNames = await fs.readdir(postTypePath);

        // Get individiual post directories
        for (const postDirName of postDirNames) {
            const postDirPath = path.join(postTypePath, postDirName);
            const allPostFiles = await fs.readdir(postDirPath);
            const postDirOutputPath = path.join(utils.getOutputPath(), postTypeConfig.postTypeDirectory, postDirName);
            await deps.generateImages(postDirPath, postDirOutputPath, allPostFiles);
            allPostMeta.push(await deps.getPostMeta(postDirPath, postType, postDirName, allPostFiles));
        }
    }
    return allPostMeta;
}

// Generate images in one post directory
async function generateImages(postDirPath, postDirOutputPath, postFiles, deps = { getPostImages }) {
    const postImages = deps.getPostImages(postFiles).filter((filename) => utils.ALLOWED_IMAGE_EXTENSIONS.includes(path.extname(filename).toLowerCase()));
    await fs.mkdir(postDirOutputPath, { recursive: true });

    for (const image of postImages) {
        await utils.scrubSaveImage(path.join(postDirPath, image), postDirOutputPath, image);
    }
}

function getPostImages(postFiles) {
    if (!Array.isArray(postFiles)) return [];
    return postFiles.filter((filename) => utils.ALLOWED_IMAGE_EXTENSIONS.includes(path.extname(filename).toLowerCase()));
}

// Generate post meta for one post directory
// Call after generating image hashes so meta contains the hash filename
async function getPostMeta(postDirPath, postType, postDirName, allPostFiles, deps = { getMdFile, fm }) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const mdFilename = deps.getMdFile(allPostFiles);
    if (!mdFilename) return;

    // Extract front-matter content
    const fileContent = await fs.readFile(path.join(postDirPath, mdFilename), 'utf8');
    const { image, ...restAttributes } = deps.fm(fileContent).attributes;
    const imageOutputPath = `/${postTypeConfig.postTypeDirectory}/${postDirName}/${image}`;
    const link = `/${postTypeConfig.postTypeDirectory}/${postDirName}`;
    const imageHashPath = utils.getHashPath(imageOutputPath);
    return { ...restAttributes, link, imageHashPath, postType, mdFilename };
}

function getMdFile(postFiles) {
    if (!Array.isArray(postFiles)) return undefined;
    return postFiles.find((file) => path.extname(file).toLowerCase() === '.md');
}

// For each post type, create the output directory and generate the files
async function generateContent(deps = { generatePosts }) {
    for (const postType of Object.keys(utils.siteConfig.postTypes)) {
        await deps.generatePosts(postType);
    }
}

// Generates the posts for a single post type, converting .md files to .html and saving in the post type output directory
async function generatePosts(postType, deps = { generatePostPage }) {
    // Get all inner directory names (the posts) for the post type
    const postTypeConfig = utils.getPostTypeConfig(postType);
    if (!postTypeConfig?.postTypeDirectory) {
        throw new Error(`Invalid or missing configuration for post type: ${postType}`);
    }
    const postTypePath = path.join(utils.CONTENT_DIR_PATH, postTypeConfig.postTypeDirectory);
    const postDirNames = await fs.readdir(postTypePath);

    // Generate posts
    // Content structure is content directory > post type directory > post directory > post.md + images
    for (const postDirName of postDirNames) {
        const postDirPath = path.join(postTypePath, postDirName);
        const allPostFiles = await fs.readdir(postDirPath);

        // Post images have already been processed so content hash filenames can be used in the post page
        await deps.generatePostPage(postType, allPostFiles, postDirPath, postDirName);
    }
}

// Generate the html page from the md file
async function generatePostPage(postType, allPostFiles, postDirPath, postDirName, deps = { getMdFile, fm, marked, templateHelper, generatePost }) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    // postTypeOutputPath already exists from generateImages
    const postTypeOutputPath = path.join(utils.getOutputPath(), postTypeConfig.postTypeDirectory);
    const postTypeDirName = postTypeConfig.postTypeDirectory;

    // Retrieve and format post html and front-matter attributes
    const markdownFilename = deps.getMdFile(allPostFiles);
    if (!markdownFilename) {
        throw new Error(`Missing markdown file for ${postDirPath}`);
    }

    const filename = markdownFilename.slice(0, -3);
    const fileContent = await fs.readFile(path.join(postDirPath, markdownFilename), 'utf8');
    const content = deps.fm(fileContent);
    let rawPostHtml = deps.marked.parse(content.body);
    htmlContent = deps.templateHelper.formatPostHtml(rawPostHtml, postTypeDirName, postDirName);

    // Generate the post site page
    const html = await deps.templateHelper.processHtml(deps.generatePost(postTypeConfig, htmlContent, content.attributes, postTypeDirName, filename));
    const postFilePath = path.join(postTypeOutputPath, postDirName, filename + '.html');
    await fs.writeFile(postFilePath, html, 'utf8');
}

// Get an array of the most recent posts across all post types
function getRecentPosts(allPostMeta, numberOfPosts) {
    // Sort posts by created date descending
    return [...allPostMeta]
        .sort((a, b) => {
            const dateA = Date.parse(a.date);
            const dateB = Date.parse(b.date);

            // If a date is invalid, treat it as the beginning of time so it goes to the bottom of the list
            const timeA = isNaN(dateA) ? 0 : dateA;
            const timeB = isNaN(dateB) ? 0 : dateB;

            return timeB - timeA;
        })
        .slice(0, numberOfPosts);
}

if (process.env.NODE_ENV === 'test') {
    module.exports = {
        generateSite,
        atomicSwap,
        prepareSiteGeneration,
        generateImages,
        getPostMeta,
        getPostImages,
        getMdFile,
        generateContent,
        generatePosts,
        generatePostPage,
        getRecentPosts,
    };
} else {
    generateSite();
}
