const config = require('./config.json');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');
const utils = require('./utils.js');
const footerHandler = require('./templates/footer.js');
const generateHomepage = require('./templates/homepage.js');
const generateAssets = require('./templates/assetsHandler.js');
const generateMenuPages = require('./templates/menuPages.js');

// Validate config
if (!config.content) {
    throw new Error('Config file missing required sections: content');
}
for (const contentType in config.content) {
    if (!config.content[contentType].contentFolder) {
        throw new Error(`Config type ${contentType} missing required sections: contentFolder`);
    }
}

const CONTENT_DIRECTORY = utils.CONTENT_DIRECTORY;
const CONTENT_OUTPUT_DIRECTORY = utils.CONTENT_OUTPUT_DIRECTORY;

if (!fs.existsSync(CONTENT_OUTPUT_DIRECTORY)) {
    fs.mkdirSync(CONTENT_OUTPUT_DIRECTORY);
}

// Generate content and get a list of all post metadata (front matter), grouped by type
// Each post has an additional property "filename", "typeToDisplay" and "contentFolder" so the templates can link and display these items
const postMetaGroupedByType = generateContent();
const recentPosts = getRecentPosts(postMetaGroupedByType, 5);

// Generate the site
footerHandler.generateFooter();
generateHomepage(recentPosts);
generateMenuPages(postMetaGroupedByType);
generateAssets();

// For each content type, create the output directory and generate the files
// Return all post metadata grouped by type
function generateContent() {
    let postMetaGroupedByType = {};

    for (let contentType in config.content) {
        const contentDirectory = path.join(CONTENT_DIRECTORY, config.content[contentType].contentFolder);
        const outputDirectory = path.join(CONTENT_OUTPUT_DIRECTORY, config.content[contentType].contentFolder);

        utils.prepareDirectory(outputDirectory);
        let allPostContent = generatePosts(contentDirectory, outputDirectory);
        // Add the content type to the post metadata
        const contentTypeName = config.content[contentType].contentName;
        postMetaGroupedByType[contentTypeName] = allPostContent.map((post) => ({ ...post, typeToDisplay: contentTypeName, contentFolder: contentType }));
    }

    return postMetaGroupedByType;
}

// Generates the content in its own directory, converting .md files to .html
function generatePosts(contentDirectory, outputDirectory) {
    const allowedImageExtensions = ['.jpg', '.jpeg', '.png'];

    // Read all folder names for the content type
    const contentTypeFolders = fs.readdirSync(contentDirectory, 'utf8');

    // Collect all post metadata for use in generating site
    let postMeta = [];

    // Generate content
    // Content structure is content > content type folder > post folder > post.md + images
    contentTypeFolders.forEach((contentFolderName) => {
        const postContentDirectory = path.join(contentDirectory, contentFolderName);
        const postOutputDirectory = path.join(outputDirectory, contentFolderName);
        const postFiles = fs.readdirSync(postContentDirectory, 'utf8');
        // Create a folder for the post
        fs.mkdirSync(postOutputDirectory);

        // Generate the metadata and html from the md file
        const markdownFilename = postFiles.find((file) => path.extname(file).toLowerCase() === '.md');
        if (markdownFilename) {
            const fileName = markdownFilename.slice(0, -3);
            const fileContent = fs.readFileSync(path.join(postContentDirectory, markdownFilename), 'utf8');
            const content = fm(fileContent);
            postMeta.push({ ...content.attributes, filename: fileName });
            const htmlContent = marked.parse(content.body);
            fs.writeFileSync(path.join(outputDirectory, contentFolderName, contentFolderName + '.html'), htmlContent, 'utf8');
        } else {
            throw new Error(`Missing markdown file for ${fileName}`);
        }

        // Copy any images
        const allContentItemImages = postFiles.filter((filename) => allowedImageExtensions.includes(path.extname(filename).toLowerCase()));
        allContentItemImages.forEach((imageFile) => {
            fs.copyFileSync(path.join(contentDirectory, contentFolderName, imageFile), path.join(outputDirectory, contentFolderName, imageFile));
        });
    });

    return postMeta;
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
