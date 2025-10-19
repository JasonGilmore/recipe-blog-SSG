const config = require('./config.json');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const generateHomepage = require('../templates/homepage.js');
const generateAssets = require('../templates/assetsHandler.js');

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

// Read the content and generate the public files, for each content type
for (let contentType in config.content) {
    const contentDirectory = path.join(CONTENT_DIRECTORY, config.content[contentType].contentFolder);
    const outputDirectory = path.join(OUTPUT_DIRECTORY, config.content[contentType].contentFolder);

    preparePublicSubDirectory(outputDirectory);
    generatecontent(contentDirectory, outputDirectory);
}

// Generate the site
generateHomepage(null);
generateAssets();

// Creates the content type directories if not present, and clears all contents
function preparePublicSubDirectory(outputSubDirectory) {
    // Directory must be a valid output directory
    if (
        !Object.values(config.content)
            .map((contentType) => path.join(OUTPUT_DIRECTORY, contentType.contentFolder))
            .includes(outputSubDirectory)
    ) {
        throw new Error(`Invalid path ${outputSubDirectory}. Must be a valid content type from config.`);
    }

    if (!fs.existsSync(outputSubDirectory)) {
        fs.mkdirSync(outputSubDirectory);
    } else {
        fs.rmSync(outputSubDirectory, { recursive: true, force: true });
        fs.mkdirSync(outputSubDirectory);
    }
}

// Generates the content in its own directory, converting .md files to .html
function generatecontent(contentDirectory, outputDirectory) {
    const allowedImageExtensions = ['.jpg', '.jpeg', '.png'];

    // Read all folder names for the content type
    const contentTypeFolders = fs.readdirSync(contentDirectory, 'utf8');

    // Generate content
    // Content structure is content > content type folder > post folder > post.md + images
    contentTypeFolders.forEach((postName) => {
        const postContentDirectory = path.join(contentDirectory, postName);
        const postOutputDirectory = path.join(outputDirectory, postName);
        const postFiles = fs.readdirSync(postContentDirectory, 'utf8');
        // Create a folder for the post
        fs.mkdirSync(postOutputDirectory);

        // Generate the html from the md file
        const markdownFileName = postFiles.find((file) => path.extname(file).toLowerCase() === '.md');
        if (markdownFileName) {
            const markdownContent = fs.readFileSync(path.join(postContentDirectory, markdownFileName), 'utf8');
            const htmlContent = marked.parse(markdownContent);
            fs.writeFileSync(path.join(outputDirectory, postName, postName + '.html'), htmlContent, 'utf8');
        } else {
            throw new Error(`Missing markdown file for ${postName}`);
        }

        // Copy any images
        const allContentItemImages = postFiles.filter((fileName) => allowedImageExtensions.includes(path.extname(fileName).toLowerCase()));
        allContentItemImages.forEach((imageFile) => {
            fs.copyFileSync(path.join(contentDirectory, postName, imageFile), path.join(outputDirectory, postName, imageFile));
        });
    });
}
