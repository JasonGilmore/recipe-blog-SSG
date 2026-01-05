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

const timerLabel = 'Generate site';
console.time(timerLabel);

utils.validateConfigurations();
utils.prepareDirectory(utils.PUBLIC_OUTPUT_DIRECTORY);

// Generate the footer first so it can be added to all site pages
footerHandler.generateFooters();

// Generate posts and get a list of all post metadata, grouped by post type
// Each post has front-matter attributes plus additional properties "filename", "postTypeToDisplay" and "postTypeDirectoryName" so the templates can link and display these items
const postMetaGroupedByType = generateContent();
const recentPosts = getRecentPosts(postMetaGroupedByType, 5);

// Generate the rest of the site
generateHomepage(recentPosts);
generateTopLevelPages(postMetaGroupedByType);
generateAssets();

console.timeEnd(timerLabel);

// For each post type, create the output directory and generate the files
// Returns all post metadata grouped by post type
function generateContent() {
    let postMetaGroupedByType = {};
    const postTypeInfo = utils.siteConfig.postTypes;

    for (let postType in postTypeInfo) {
        const postTypeDirectoryName = postTypeInfo[postType].postTypeDirectory;
        const postTypeDirectory = path.join(utils.CONTENT_DIRECTORY, postTypeDirectoryName);
        const postTypeOutputDirectory = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, postTypeDirectoryName);

        utils.prepareDirectory(postTypeOutputDirectory);
        let generatedPostMeta = generatePosts(postTypeDirectory, postTypeDirectoryName, postTypeOutputDirectory);
        // Add the post type to the post metadata
        const postTypeName = postTypeInfo[postType].postTypeDisplayName;
        postMetaGroupedByType[postTypeName] = generatedPostMeta.map((post) => ({ ...post, postTypeToDisplay: postTypeName, postTypeDirectoryName: postTypeDirectoryName }));
    }

    return postMetaGroupedByType;
}

// Generates the posts for a single post type, converting .md files to .html and saving in the post type output directory
// Returns an array of objects, where each object is the post metadata
function generatePosts(postTypeDirectory, postTypeDirectoryName, postTypeOutputDirectory) {
    // Read all folder names for the posts
    const postDirectoryNames = fs.readdirSync(postTypeDirectory, 'utf8');

    // Collect all post metadata for use in generating site
    let postMeta = [];

    // Generate posts
    // Content structure is content directory > post type directory > post folder > post.md + images
    postDirectoryNames.forEach((postDirectoryName) => {
        const postDirectory = path.join(postTypeDirectory, postDirectoryName);
        const postOutputDirectory = path.join(postTypeOutputDirectory, postDirectoryName);
        const allPostFiles = fs.readdirSync(postDirectory, 'utf8');
        // Create an output folder for the post, within the post type folder
        fs.mkdirSync(postOutputDirectory);

        // Process the post
        const postContext = {
            allPostFiles,
            postTypeDirectoryName,
            postTypeDirectory,
            postTypeOutputDirectory,
            postDirectoryName,
            postDirectory,
        };
        const generatedMeta = processMarkdownFile(postContext);
        postMeta.push(generatedMeta);
        processPostImages(postContext);
    });

    return postMeta;
}

// Generate the html page from the md file
// Return metadata about the post (post .md filename and front-matter attributes)
function processMarkdownFile({ allPostFiles, postDirectory, postTypeDirectoryName, postDirectoryName, postTypeOutputDirectory }) {
    // Retrieve and format post html and front-matter attributes
    const markdownFilename = allPostFiles.find((file) => path.extname(file).toLowerCase() === '.md');
    if (markdownFilename) {
        const fileName = markdownFilename.slice(0, -3);
        const fileContent = fs.readFileSync(path.join(postDirectory, markdownFilename), 'utf8');
        const content = fm(fileContent);
        let rawPostHtml = marked.parse(content.body);
        htmlContent = formatPostHtml(rawPostHtml, postTypeDirectoryName, postDirectoryName);

        // Generate the post site page
        const postPage = generatePost(htmlContent, content.attributes, postTypeDirectoryName, fileName);
        const postFilePath = path.join(postTypeOutputDirectory, postDirectoryName, fileName + '.html');
        fs.writeFileSync(postFilePath, postPage, 'utf8');
        return { ...content.attributes, filename: fileName };
    } else {
        throw new Error(`Missing markdown file for ${fileName}`);
    }
}

// Replace the relative image urls, add css and other formatting features
function formatPostHtml(htmlContent, postTypeDirectoryName, postDirectoryName) {
    processedHtml = htmlContent
        .replaceAll('src="./', `src="/${postTypeDirectoryName}/${postDirectoryName}/`)
        .replaceAll('<img ', '<img loading="lazy" class="content-image" ')
        .replaceAll('<table>', '<div class="table-wrapper"><table>')
        .replaceAll('</table>', '</table></div>')
        .replaceAll('<p>{recipeboxstart}</p>', '<div id="recipe" class="recipe-box">')
        .replaceAll('<p>{recipeboxend}</p>', '</div>')
        .replaceAll('{jumptorecipebox}', '<button class="jump-to-recipe" type="button"><span class="arrow-down"></span> Jump to recipe</button>');

    // Update checkboxes so they are active and text is crossed out on check
    let checkboxIdCounter = 1;
    processedHtml = processedHtml.replaceAll(/<li><input disabled="" type="checkbox">(.*?)(?=<\/li>|<ul>)/g, (match, text) => {
        const id = `checkbox-${checkboxIdCounter}`;
        checkboxIdCounter++;
        return `<li class="ingredient-item-checkbox"><input type="checkbox" class="test" id="${id}"> <label for="${id}">${text}</label>`;
    });
    return processedHtml;
}

// Copy any images from their post directory to the output directory, including with Exif removal
// Exif removal is synchronous as part of the static site generation since it is fast enough (total generation of ~150ms)
// and simplifies code. If this becomes noticeably slower as the site grows, consider changing to an asynchronous approach
function processPostImages({ allPostFiles, postTypeOutputDirectory, postDirectoryName, postDirectory }) {
    const postImages = allPostFiles.filter((filename) => utils.allowedImageExtensions.includes(path.extname(filename).toLowerCase()));
    postImages.forEach((image) => {
        const imagePath = path.join(postDirectory, image);
        const imageOutputPath = path.join(postTypeOutputDirectory, postDirectoryName, image);

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
    });
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
