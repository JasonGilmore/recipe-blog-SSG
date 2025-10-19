const config = require('./config.json');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');
const generateHomepage = require('../templates/homepage.js');
const generateAssets = require('../templates/assetsHandler.js');
const generateMenuPages = require('../templates/menuPages.js');

// Validate config
if (!config.content) {
    throw new Error('Config file missing required sections: content');
}
for (const contentType in config.content) {
    if (!config.content[contentType].contentFolder) {
        throw new Error(`Config type ${contentType} missing required sections: contentFolder`);
    }
}

const CONTENT_DIRECTORY = path.join(__dirname, config.contentDirectory);
const OUTPUT_DIRECTORY = path.join(__dirname, config.outputDirectory);

if (!fs.existsSync(OUTPUT_DIRECTORY)) {
    fs.mkdirSync(OUTPUT_DIRECTORY);
}

// Generate content and get a list of all post metadata, grouped by type
// Each post has an additional property "filename" and "type" so the templates can link to it
const postMetaGroupedByType = generateContent();
const recentPosts = getRecentPosts(postMetaGroupedByType, 5);

// Generate the site
generateHomepage(recentPosts);
generateMenuPages(postMetaGroupedByType);
generateAssets();

// For each content type, create the output directory and generate the files
// Return all post metadata grouped by type
function generateContent() {
    let postMetaGroupedByType = {};

    for (let contentType in config.content) {
        const contentDirectory = path.join(CONTENT_DIRECTORY, config.content[contentType].contentFolder);
        const outputDirectory = path.join(OUTPUT_DIRECTORY, config.content[contentType].contentFolder);

        preparePublicSubDirectory(outputDirectory);
        let allPostContent = generatePosts(contentDirectory, outputDirectory);
        // Add the content type to the post metadata
        postMetaGroupedByType[contentType] = allPostContent.map((post) => ({ ...post, type: contentType }));
    }

    return postMetaGroupedByType;
}

// Creates the content type directories if not present, and clears all contents
function preparePublicSubDirectory(outputSubDirectory) {
    if (!fs.existsSync(outputSubDirectory)) {
        fs.mkdirSync(outputSubDirectory);
    } else {
        fs.rmSync(outputSubDirectory, { recursive: true, force: true });
        fs.mkdirSync(outputSubDirectory);
    }
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
    contentTypeFolders.forEach((postName) => {
        const postContentDirectory = path.join(contentDirectory, postName);
        const postOutputDirectory = path.join(outputDirectory, postName);
        const postFiles = fs.readdirSync(postContentDirectory, 'utf8');
        // Create a folder for the post
        fs.mkdirSync(postOutputDirectory);

        // Generate the metadata and html from the md file
        const markdownFilename = postFiles.find((file) => path.extname(file).toLowerCase() === '.md');
        if (markdownFilename) {
            const fileContent = fs.readFileSync(path.join(postContentDirectory, markdownFilename), 'utf8');
            const content = fm(fileContent);
            postMeta.push({ ...content.attributes, filename: postName });
            const htmlContent = marked.parse(content.body);
            fs.writeFileSync(path.join(outputDirectory, postName, postName + '.html'), htmlContent, 'utf8');
        } else {
            throw new Error(`Missing markdown file for ${postName}`);
        }

        // Copy any images
        const allContentItemImages = postFiles.filter((filename) => allowedImageExtensions.includes(path.extname(filename).toLowerCase()));
        allContentItemImages.forEach((imageFile) => {
            fs.copyFileSync(path.join(contentDirectory, postName, imageFile), path.join(outputDirectory, postName, imageFile));
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
