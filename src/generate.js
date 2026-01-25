const path = require('node:path');
const fs = require('node:fs');
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

const timerLabel = 'Generate site';
console.time(timerLabel);

utils.validateConfigurations();
utils.prepareDirectory(utils.PUBLIC_OUTPUT_DIRECTORY);

// Preparation tasks for buliding site
// Each post meta contains front-matter attributes plus additional properties link, imageHashPath, postType and mdFilename
const allPostMeta = prepareSiteGeneration();

if (utils.isFeatureEnabled('enableSearch')) {
    templateHelper.generateSearchData(allPostMeta);
}

// Generate assets upfront to use filename content hash for cache busting
generateAssets();

// Generate footers upfront so they can be added to all site pages
footerHandler.generateFooters();

// Generate post pages
generateContent();

// Generate the rest of the site
const recentPosts = getRecentPosts(allPostMeta, 5);
generateHomepage(recentPosts);
generateTopLevelPages(allPostMeta);

console.timeEnd(timerLabel);

// Iterate through each post type directory, generate post meta and image hash filenames
function prepareSiteGeneration() {
    let allPostMeta = [];

    // Get contents of post type directory
    for (const postType of Object.keys(utils.siteConfig.postTypes)) {
        const postTypeConfig = utils.getPostTypeConfig(postType);
        const postTypePath = path.join(utils.CONTENT_DIRECTORY, postTypeConfig.postTypeDirectory);
        const postDirNames = fs.readdirSync(postTypePath, 'utf8');

        // Get individiual post directories
        postDirNames.forEach((postDirName) => {
            const postDirPath = path.join(postTypePath, postDirName);
            const allPostFiles = fs.readdirSync(postDirPath, 'utf8');
            const postDirOutputPath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, postTypeConfig.postTypeDirectory, postDirName);
            setImageHashPaths(postDirPath, postDirOutputPath, allPostFiles);
            allPostMeta.push(getPostMeta(postDirPath, postType, postDirName, allPostFiles));
        });
    }
    return allPostMeta;
}

// Set image filename hashes for images in one post directory
function setImageHashPaths(postDirPath, postDirOutputPath, postFiles) {
    const postImages = getPostImages(postFiles);

    postImages.forEach((image) => {
        const hashFilename = getFileHashName(postDirPath, image);
        const logicalImageOutputPath = path.join(postDirOutputPath, image);
        const imageOutputPath = path.join(postDirOutputPath, hashFilename);
        utils.setHashPath(logicalImageOutputPath, imageOutputPath);
    });
}

// Compute the hash and return the hash filename
function getFileHashName(postDirPath, filename) {
    const imagePath = path.join(postDirPath, filename);
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);

    return utils.getHashFilename(base, utils.getFileHash(imagePath), ext);
}

// Generate post meta for one post directory
// Call after generateImageHashes so meta contains the hash filename
function getPostMeta(postDirPath, postType, postDirName, allPostFiles) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const mdFilename = getMdFile(allPostFiles);
    if (!mdFilename) return;

    // Extract front-matter content
    const fileContent = fs.readFileSync(path.join(postDirPath, mdFilename), 'utf8');
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
function generateContent() {
    const allPostTypeConfigs = utils.siteConfig.postTypes;

    for (let postType in allPostTypeConfigs) {
        generatePosts(postType);
    }
}

// Generates the posts for a single post type, converting .md files to .html and saving in the post type output directory
function generatePosts(postType) {
    // Prepare directories
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const postTypePath = path.join(utils.CONTENT_DIRECTORY, postTypeConfig.postTypeDirectory);
    const postTypeOutputPath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, postTypeConfig.postTypeDirectory);
    utils.prepareDirectory(postTypeOutputPath);

    // Read all inner directory names (the posts) for the post type
    const postDirectoryNames = fs.readdirSync(postTypePath, 'utf8');

    // Generate posts
    // Content structure is content directory > post type directory > post directory > post.md + images
    postDirectoryNames.forEach((postDirectoryName) => {
        const postDirectoryPath = path.join(postTypePath, postDirectoryName);
        const postOutputDirectoryPath = path.join(postTypeOutputPath, postDirectoryName);
        const allPostFiles = fs.readdirSync(postDirectoryPath, 'utf8');
        // Create an output folder for the post, within the post type folder
        fs.mkdirSync(postOutputDirectoryPath);

        // Process post images first so content hash filenames can be used in the post page
        const postContext = {
            postType,
            allPostFiles,
            postTypePath,
            postTypeOutputPath,
            postDirectoryName,
            postDirectoryPath,
        };
        processPostImages(postContext);
        generatePostPage(postContext);
    });
}

// Copy any images from their post directory to the output directory, including with Exif removal and content hash filenames
// Image may already have their hash filename computed
function processPostImages({ postType, allPostFiles, postTypeOutputPath, postDirectoryName, postDirectoryPath }) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const postImages = allPostFiles.filter((filename) => utils.allowedImageExtensions.includes(path.extname(filename).toLowerCase()));

    postImages.forEach((image) => {
        const imagePath = path.join(postDirectoryPath, image);
        const logicalOutputPath = `/${postTypeConfig.postTypeDirectory}/${postDirectoryName}/${image}`;

        // If image hash already computed use the path, otherwise generate
        if (!utils.getHashPaths()[logicalOutputPath]) {
            utils.setHashPath(logicalOutputPath, path.join(postTypeOutputPath, postDirectoryName, getFileHashName(postDirectoryPath, image)));
        }
        const hashOutputPathFull = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, utils.getHashPath(logicalOutputPath));

        // If contain exif data, remove and write the new image, otherwise copy the image
        const fileType = path.extname(imagePath).toLowerCase();
        const exifFileTypes = ['.jpg', '.jpeg'];
        let wasProcessed = false;

        if (exifFileTypes.includes(fileType)) {
            const imageAsBinaryString = fs.readFileSync(imagePath, 'binary');
            const exifData = piexif.load(imageAsBinaryString);
            const exifSections = ['0th', 'Exif', 'GPS', 'Interop', '1st', 'thumbnail'];
            const hasExif = exifSections.some((tag) => Object.keys(exifData?.[tag] || {}).length > 0);

            if (hasExif) {
                const cleanedImage = piexif.remove(imageAsBinaryString);
                const cleanedImageBuffer = Buffer.from(cleanedImage, 'binary');
                fs.writeFileSync(hashOutputPathFull, cleanedImageBuffer);
                wasProcessed = true;
            }
        }

        if (!wasProcessed) {
            fs.copyFileSync(imagePath, hashOutputPathFull);
        }
    });
}

// Generate the html page from the md file
function generatePostPage({ postType, allPostFiles, postDirectoryPath, postDirectoryName, postTypeOutputPath }) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const postTypeDirectoryName = postTypeConfig.postTypeDirectory;

    // Retrieve and format post html and front-matter attributes
    const markdownFilename = allPostFiles.find((file) => path.extname(file).toLowerCase() === '.md');
    if (markdownFilename) {
        const filename = markdownFilename.slice(0, -3);
        const fileContent = fs.readFileSync(path.join(postDirectoryPath, markdownFilename), 'utf8');
        const content = fm(fileContent);
        let rawPostHtml = marked.parse(content.body);
        htmlContent = templateHelper.formatPostHtml(rawPostHtml, postTypeDirectoryName, postDirectoryName);

        // Generate the post site page
        const postPage = generatePost(postTypeConfig, htmlContent, content.attributes, postTypeDirectoryName, filename);
        const postFilePath = path.join(postTypeOutputPath, postDirectoryName, filename + '.html');
        fs.writeFileSync(postFilePath, postPage, 'utf8');
    } else {
        throw new Error(`Missing markdown file for ${filename}`);
    }
}

// Get an array of the most recent posts across all post types
function getRecentPosts(allPostMeta, numberOfPosts) {
    // Sort posts by created date descending
    allPostMeta.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    return allPostMeta.length < numberOfPosts ? allPostMeta : allPostMeta.slice(0, numberOfPosts);
}
