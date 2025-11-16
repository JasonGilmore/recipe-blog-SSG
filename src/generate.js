const fs = require('node:fs');
const piexif = require('piexifjs');
const path = require('node:path');
const marked = require('marked');
const fm = require('front-matter');
const utils = require('./utils.js');
const footerHandler = require('./templates/footer.js');
const generatePost = require('./templates/posts.js');
const generateHomepage = require('./templates/homepage.js');
const generateAssets = require('./templates/assetsHandler.js');
const generateMenuPages = require('./templates/menuPages.js');

const timerLabel = 'Generate site';
console.time(timerLabel);

utils.validateConfigurations();
utils.prepareDirectory(utils.PUBLIC_OUTPUT_DIRECTORY);

// Generate the footer first so it can be used on site pages
footerHandler.generateFooters();

// Generate content and get a list of all post metadata (front matter), grouped by type
// Each post has an additional properties "filename", "typeToDisplay" and "contentFolder" so the templates can link and display these items
const postMetaGroupedByType = generateContent();
const recentPosts = getRecentPosts(postMetaGroupedByType, 5);

// Generate the rest of the site
generateHomepage(recentPosts);
generateMenuPages(postMetaGroupedByType);
generateAssets();

console.timeEnd(timerLabel);

// For each content type, create the output directory and generate the files
// Return all post metadata grouped by type
function generateContent() {
    let postMetaGroupedByType = {};

    for (let contentType in utils.siteConfig.content) {
        const contentFolder = utils.siteConfig.content[contentType].contentFolder;
        const contentDirectory = path.join(utils.CONTENT_DIRECTORY, contentFolder);
        const outputDirectory = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, contentFolder);

        utils.prepareDirectory(outputDirectory);
        let allPostContent = generatePosts(contentDirectory, contentFolder, outputDirectory);
        // Add the content type to the post metadata
        const contentTypeName = utils.siteConfig.content[contentType].contentName;
        postMetaGroupedByType[contentTypeName] = allPostContent.map((post) => ({ ...post, typeToDisplay: contentTypeName, contentFolder: contentFolder }));
    }

    return postMetaGroupedByType;
}

// Generates the content in its own directory, converting .md files to .html
function generatePosts(contentDirectory, contentFolder, outputDirectory) {
    // Read all folder names for the content type
    const contentTypeFolders = fs.readdirSync(contentDirectory, 'utf8');

    // Collect all post metadata for use in generating site
    let postMeta = [];

    // Generate content
    // Content structure is content > content type folder > post folder > post.md + images
    contentTypeFolders.forEach((contentFolderName) => {
        const postContentDirectory = path.join(contentDirectory, contentFolderName);
        const postOutputDirectory = path.join(outputDirectory, contentFolderName);
        const allPostFiles = fs.readdirSync(postContentDirectory, 'utf8');
        // Create a folder for the post
        fs.mkdirSync(postOutputDirectory);

        processMarkdownFiles(allPostFiles, postContentDirectory, contentFolder, contentFolderName, outputDirectory, postMeta);
        processContentImages(allPostFiles, contentDirectory, outputDirectory, contentFolderName);
    });

    return postMeta;
}

// Generate the html page from the md file, and add metadata to postMeta
function processMarkdownFiles(allPostFiles, postContentDirectory, contentFolder, contentFolderName, outputDirectory, postMeta) {
    const markdownFilename = allPostFiles.find((file) => path.extname(file).toLowerCase() === '.md');
    if (markdownFilename) {
        const fileName = markdownFilename.slice(0, -3);
        const fileContent = fs.readFileSync(path.join(postContentDirectory, markdownFilename), 'utf8');
        const content = fm(fileContent);
        postMeta.push({ ...content.attributes, filename: fileName });

        let htmlContent = marked.parse(content.body);
        // Replace the relative image urls, add image css and add other css to the content
        htmlContent = htmlContent
            .replaceAll('./', `/${contentFolder}/${contentFolderName}/`)
            .replaceAll('<img ', '<img class="content-image" ')
            .replaceAll('<p>{recipeboxstart}</p>', '<div class="recipe-box">')
            .replaceAll('<p>{recipeboxend}</p>', '</div>');
        const fullSitePage = generatePost(htmlContent);
        fs.writeFileSync(path.join(outputDirectory, contentFolderName, contentFolderName + '.html'), fullSitePage, 'utf8');
    } else {
        throw new Error(`Missing markdown file for ${fileName}`);
    }
}

// Copy any images from their content directory to the output directory, including with Exif removal
// Exif removal is synchronous as part of the static site generation since it is fast enough (total generation of ~150ms)
// and simplifies code. If this becomes noticeably slower as the site grows, consider changing to an asynchronous approach
function processContentImages(allPostFiles, contentDirectory, outputDirectory, contentFolderName) {
    const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

    const allContentItemImages = allPostFiles.filter((filename) => allowedImageExtensions.includes(path.extname(filename).toLowerCase()));
    allContentItemImages.forEach((imageFile) => {
        const imageFilePath = path.join(contentDirectory, contentFolderName, imageFile);
        const imageOutputPath = path.join(outputDirectory, contentFolderName, imageFile);

        // If contain exif data, remove and write the new image, otherwise copy the image
        const imageAsBinaryString = fs.readFileSync(imageFilePath, 'binary');
        const exifData = piexif.load(imageAsBinaryString);
        const exifSections = ['0th', 'Exif', 'GPS', 'Interop', '1st', 'thumbnail'];
        const containsExifData = exifSections.some((tag) => Object.keys(exifData?.[tag] || {}).length > 0);

        if (containsExifData) {
            const cleanedImage = piexif.remove(imageAsBinaryString);
            const cleanedImageBuffer = Buffer.from(cleanedImage, 'binary');
            fs.writeFileSync(imageOutputPath, cleanedImageBuffer);
        } else {
            fs.copyFileSync(imageFilePath, imageOutputPath);
        }
    });
}

// Get an array of the most recent posts across all content types
function getRecentPosts(postMetaGroupedByType, numberOfPosts) {
    let allPosts = [];
    for (let contentType of Object.keys(postMetaGroupedByType)) {
        allPosts.push(...postMetaGroupedByType[contentType]);
    }
    // Sort posts by created date descending
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allPosts.length < numberOfPosts ? allPosts : allPosts.slice(0, numberOfPosts);
}
