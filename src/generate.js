const path = require('node:path');
const fs = require('node:fs/promises');
const fm = require('front-matter');
const marked = require('marked');
const piexif = require('piexifjs');
const utils = require('./utils.js');
const footerHandler = require('./templates/footer.js');
const generateHomepage = require('./templates/homepage.js');
const generateTopLevelPages = require('./templates/topLevelPages.js');
const generateAssets = require('./templates/assetsHandler.js');
const generatePost = require('./templates/posts.js');
const templateHelper = require('./templates/templateHelper.js');

const timerLabel = 'Generate site async';
generateSite();

// Use sequential awaits to ensure predictable execution order and readable logs
async function generateSite() {
    console.time(timerLabel);
    utils.validateConfigurations();

    // Prepare atomic write. Build into a temporary folder, then swap on success
    const tempOutputPath = path.join(__dirname, '../', utils.siteConfig.outputDirectory + '.tmp');
    utils.setTempOutput(tempOutputPath);
    utils.prepareDirectory(tempOutputPath);

    // Preparation tasks for buliding site
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

    // Generation success, complete atomic swap
    const backupPath = utils.OUTPUT_DIR_PATH + '.old';

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
    console.timeEnd(timerLabel);
}

// Iterate through each post type directory, generate post meta and image hash filenames
async function prepareSiteGeneration() {
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
            await setImageHashPaths(postDirPath, postDirOutputPath, allPostFiles);
            allPostMeta.push(await getPostMeta(postDirPath, postType, postDirName, allPostFiles));
        }
    }
    return allPostMeta;
}

// Set image filename hashes for images in one post directory
async function setImageHashPaths(postDirPath, postDirOutputPath, postFiles) {
    const postImages = getPostImages(postFiles);

    for (const image of postImages) {
        const hashFilename = await getFileHashName(postDirPath, image);
        const logicalImageOutputPath = path.join(postDirOutputPath, image);
        const imageOutputPath = path.join(postDirOutputPath, hashFilename);
        utils.setHashPath(logicalImageOutputPath, imageOutputPath);
    }
}

// Compute the hash and return the hash filename
async function getFileHashName(postDirPath, filename) {
    const imagePath = path.join(postDirPath, filename);
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);

    return utils.getHashFilename(base, await utils.getFileHash(imagePath), ext);
}

// Generate post meta for one post directory
// Call after generateImageHashes so meta contains the hash filename
async function getPostMeta(postDirPath, postType, postDirName, allPostFiles) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const mdFilename = getMdFile(allPostFiles);
    if (!mdFilename) return;

    // Extract front-matter content
    const fileContent = await fs.readFile(path.join(postDirPath, mdFilename), 'utf8');
    const { image, ...restAttributes } = fm(fileContent).attributes;
    const imageOutputPath = `/${postTypeConfig.postTypeDirectory}/${postDirName}/${image}`;
    const link = `/${postTypeConfig.postTypeDirectory}/${postDirName}`;
    const imageHashPath = utils.getHashPath(imageOutputPath);
    return { ...restAttributes, link, imageHashPath, postType, mdFilename };
}

function getPostImages(postFiles) {
    return postFiles.filter((filename) => utils.allowedImageExtensions.includes(path.extname(filename).toLowerCase()));
}

function getMdFile(postFiles) {
    return postFiles.find((file) => path.extname(file).toLowerCase() === '.md');
}

// For each post type, create the output directory and generate the files
async function generateContent() {
    for (const postType of Object.keys(utils.siteConfig.postTypes)) {
        await generatePosts(postType);
    }
}

// Generates the posts for a single post type, converting .md files to .html and saving in the post type output directory
async function generatePosts(postType) {
    // Prepare directories
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const postTypePath = path.join(utils.CONTENT_DIR_PATH, postTypeConfig.postTypeDirectory);
    const postTypeOutputPath = path.join(utils.getOutputPath(), postTypeConfig.postTypeDirectory);
    utils.prepareDirectory(postTypeOutputPath);

    // Read all inner directory names (the posts) for the post type
    const postDirectoryNames = await fs.readdir(postTypePath);

    // Generate posts
    // Content structure is content directory > post type directory > post directory > post.md + images
    for (const postDirectoryName of postDirectoryNames) {
        const postDirectoryPath = path.join(postTypePath, postDirectoryName);
        const postOutputDirectoryPath = path.join(postTypeOutputPath, postDirectoryName);
        const allPostFiles = await fs.readdir(postDirectoryPath);
        // Create an output folder for the post, within the post type folder
        await fs.mkdir(postOutputDirectoryPath);

        // Process post images first so content hash filenames can be used in the post page
        const postContext = {
            postType,
            allPostFiles,
            postTypePath,
            postTypeOutputPath,
            postDirectoryName,
            postDirectoryPath,
        };
        await processPostImages(postContext);
        await generatePostPage(postContext);
    }
}

// Copy any images from their post directory to the output directory, including with Exif removal and content hash filenames
// Image may already have their hash filename computed
async function processPostImages({ postType, allPostFiles, postTypeOutputPath, postDirectoryName, postDirectoryPath }) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const postImages = allPostFiles.filter((filename) => utils.allowedImageExtensions.includes(path.extname(filename).toLowerCase()));

    for (const image of postImages) {
        const imagePath = path.join(postDirectoryPath, image);
        const logicalOutputPath = `/${postTypeConfig.postTypeDirectory}/${postDirectoryName}/${image}`;

        // If image hash already computed use the path, otherwise generate
        if (!utils.getHashPaths()[logicalOutputPath]) {
            utils.setHashPath(logicalOutputPath, path.join(postTypeOutputPath, postDirectoryName, await getFileHashName(postDirectoryPath, image)));
        }
        const hashOutputPathFull = path.join(utils.getOutputPath(), utils.getHashPath(logicalOutputPath));

        // If contain exif data, remove and write the new image, otherwise copy the image
        const fileType = path.extname(imagePath).toLowerCase();
        const exifFileTypes = ['.jpg', '.jpeg'];
        let wasProcessed = false;

        if (exifFileTypes.includes(fileType)) {
            const imageAsBinaryString = await fs.readFile(imagePath, 'binary');
            const exifData = piexif.load(imageAsBinaryString);
            const exifSections = ['0th', 'Exif', 'GPS', 'Interop', '1st', 'thumbnail'];
            const hasExif = exifSections.some((tag) => Object.keys(exifData?.[tag] || {}).length > 0);

            if (hasExif) {
                const cleanedImage = piexif.remove(imageAsBinaryString);
                const cleanedImageBuffer = Buffer.from(cleanedImage, 'binary');
                await fs.writeFile(hashOutputPathFull, cleanedImageBuffer);
                wasProcessed = true;
            }
        }

        if (!wasProcessed) {
            await fs.copyFile(imagePath, hashOutputPathFull);
        }
    }
}

// Generate the html page from the md file
async function generatePostPage({ postType, allPostFiles, postDirectoryPath, postDirectoryName, postTypeOutputPath }) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const postTypeDirectoryName = postTypeConfig.postTypeDirectory;

    // Retrieve and format post html and front-matter attributes
    const markdownFilename = allPostFiles.find((file) => path.extname(file).toLowerCase() === '.md');
    if (!markdownFilename) {
        throw new Error(`Missing markdown file for ${filename}`);
    }

    const filename = markdownFilename.slice(0, -3);
    const fileContent = await fs.readFile(path.join(postDirectoryPath, markdownFilename), 'utf8');
    const content = fm(fileContent);
    let rawPostHtml = marked.parse(content.body);
    htmlContent = templateHelper.formatPostHtml(rawPostHtml, postTypeDirectoryName, postDirectoryName);

    // Generate the post site page
    const postPage = generatePost(postTypeConfig, htmlContent, content.attributes, postTypeDirectoryName, filename);
    const postFilePath = path.join(postTypeOutputPath, postDirectoryName, filename + '.html');
    await fs.writeFile(postFilePath, postPage, 'utf8');
}

// Get an array of the most recent posts across all post types
function getRecentPosts(allPostMeta, numberOfPosts) {
    // Sort posts by created date descending
    allPostMeta.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    return allPostMeta.length < numberOfPosts ? allPostMeta : allPostMeta.slice(0, numberOfPosts);
}
