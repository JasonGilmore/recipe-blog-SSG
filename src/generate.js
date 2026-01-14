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

// Generate assets upfront to use filename content hash for cache busting
generateAssets();

// Generate footers upfront so they can be added to all site pages
footerHandler.generateFooters();

// Generate posts and get a list of all post metadata, grouped by post type
// Each post has front-matter attributes plus additional properties "filename", "postTypeToDisplay" and "postTypeDirectoryName" so the templates can link and display these items
const postMetaGroupedByType = generateContent();
const recentPosts = getRecentPosts(postMetaGroupedByType, 5);

// Generate the rest of the site
generateHomepage(recentPosts);
generateTopLevelPages(postMetaGroupedByType);

console.timeEnd(timerLabel);

// For each post type, create the output directory and generate the files
// Returns all post metadata grouped by post type
function generateContent() {
    let postMetaGroupedByType = {};
    const allPostTypeConfigs = utils.siteConfig.postTypes;

    for (let postType in allPostTypeConfigs) {
        const postTypeConfig = allPostTypeConfigs[postType];
        let generatedPostMeta = generatePosts(postType);
        // Add additional properties to post metadata
        postMetaGroupedByType[postType] = generatedPostMeta.map((post) => ({
            ...post,
            postTypeToDisplay: postTypeConfig.postTypeDisplayName,
            postTypeDirectoryName: postTypeConfig.postTypeDirectory,
        }));
    }

    return postMetaGroupedByType;
}

// Generates the posts for a single post type, converting .md files to .html and saving in the post type output directory
// Returns an array of objects, where each object is the post metadata
function generatePosts(postType) {
    // Prepare directories
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const postTypePath = path.join(utils.CONTENT_DIRECTORY, postTypeConfig.postTypeDirectory);
    const postTypeOutputPath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, postTypeConfig.postTypeDirectory);
    utils.prepareDirectory(postTypeOutputPath);

    // Read all inner directory names (the posts) for the post type
    const postDirectoryNames = fs.readdirSync(postTypePath, 'utf8');

    // Collect all post metadata for use in generating site
    let postMeta = [];

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
            postTypeConfig,
            allPostFiles,
            postTypePath,
            postTypeOutputPath,
            postDirectoryName,
            postDirectoryPath,
        };
        processPostImages(postContext);
        const generatedMeta = processMarkdownFile(postContext);
        postMeta.push(generatedMeta);
    });

    return postMeta;
}

// Copy any images from their post directory to the output directory, including with Exif removal and content hash filenames
function processPostImages({ allPostFiles, postTypeOutputPath, postDirectoryName, postDirectoryPath }) {
    const postImages = allPostFiles.filter((filename) => utils.allowedImageExtensions.includes(path.extname(filename).toLowerCase()));

    postImages.forEach((image) => {
        const imagePath = path.join(postDirectoryPath, image);
        const ext = path.extname(image);
        const base = path.basename(image, ext);

        // Compute content hash details
        const hash = utils.getFileHash(imagePath);
        const hashFilename = utils.getHashFilename(base, hash, ext);
        const logicalImageOutputPath = path.join(postTypeOutputPath, postDirectoryName, image);
        const imageOutputPath = path.join(postTypeOutputPath, postDirectoryName, hashFilename);

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
                fs.writeFileSync(imageOutputPath, cleanedImageBuffer);
                wasProcessed = true;
            }
        }

        if (!wasProcessed) {
            fs.copyFileSync(imagePath, imageOutputPath);
        }
        utils.setHashPath(logicalImageOutputPath, imageOutputPath);
    });
}

// Generate the html page from the md file
// Return metadata about the post (post .md filename and front-matter attributes)
function processMarkdownFile({ postTypeConfig, allPostFiles, postDirectoryPath, postDirectoryName, postTypeOutputPath }) {
    const postTypeDirectoryName = postTypeConfig.postTypeDirectory;

    // Retrieve and format post html and front-matter attributes
    const markdownFilename = allPostFiles.find((file) => path.extname(file).toLowerCase() === '.md');
    if (markdownFilename) {
        const filename = markdownFilename.slice(0, -3);
        const fileContent = fs.readFileSync(path.join(postDirectoryPath, markdownFilename), 'utf8');
        const content = fm(fileContent);
        let rawPostHtml = marked.parse(content.body);
        htmlContent = formatPostHtml(rawPostHtml, postTypeDirectoryName, postDirectoryName);

        // Generate the post site page
        const postPage = generatePost(postTypeConfig, htmlContent, content.attributes, postTypeDirectoryName, filename);
        const postFilePath = path.join(postTypeOutputPath, postDirectoryName, filename + '.html');
        fs.writeFileSync(postFilePath, postPage, 'utf8');
        return { ...content.attributes, filename: filename };
    } else {
        throw new Error(`Missing markdown file for ${filename}`);
    }
}

// Replace the relative image urls, add css and other formatting features
function formatPostHtml(htmlContent, postTypeDirectoryName, postDirectoryName) {
    const folderPath = `/${postTypeDirectoryName}/${postDirectoryName}/`;

    htmlContent = htmlContent
        .replaceAll('src="./', `src="${folderPath}`)
        .replaceAll('<table>', '<div class="table-wrapper"><table>')
        .replaceAll('</table>', '</table></div>')
        .replaceAll('<p>{recipeboxstart}</p>', '<div id="recipe" class="recipe-box">')
        .replaceAll('<p>{recipeboxend}</p>', '</div>')
        .replaceAll('{jumptorecipebox}', `<button class="jump-to-recipe flex-centre" type="button">${templateHelper.getDownArrow()} Jump to recipe</button>`)
        .replaceAll('<p>{lightstyleboxstart}</p>', '<div class="light-style-box">')
        .replaceAll('<p>{lightstyleboxend}</p>', '</div>')
        .replaceAll('<p>{darkstyleboxstart}</p>', '<div class="dark-style-box">')
        .replaceAll('<p>{darkstyleboxend}</p>', '</div>');

    // Update image references to use the content hash filename
    Object.entries(utils.getHashPaths()).forEach(([logical, hash]) => {
        htmlContent = htmlContent.replaceAll(`src="${logical}`, `src="${hash}`);
    });

    // The first image should be a priority to optimise LCP and avoid layout shifts
    htmlContent = htmlContent.replace('<img', '<img fetchpriority="high" class="content-image"');
    htmlContent = htmlContent.replaceAll('<img src=', '<img loading="lazy" class="content-image" src=');

    // Update checkboxes so they are active and text is crossed out on check
    let checkboxIdCounter = 1;
    htmlContent = htmlContent.replaceAll(/<li><input disabled="" type="checkbox">(.*?)(?=<\/li>|<ul>)/g, (match, text) => {
        const id = `checkbox-${checkboxIdCounter}`;
        checkboxIdCounter++;
        return `<li class="ingredient-item-checkbox"><input type="checkbox" class="test" id="${id}"> <label for="${id}">${text}</label>`;
    });
    return htmlContent;
}

// Get an array of the most recent posts across all post types
function getRecentPosts(postMetaGroupedByType, numberOfPosts) {
    let allPosts = [];
    for (let postType of Object.keys(postMetaGroupedByType)) {
        allPosts.push(...postMetaGroupedByType[postType]);
    }
    // Sort posts by created date descending
    allPosts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    return allPosts.length < numberOfPosts ? allPosts : allPosts.slice(0, numberOfPosts);
}
