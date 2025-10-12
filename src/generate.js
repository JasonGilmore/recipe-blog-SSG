const config = require('./config.json');
const fs = require('fs');
const path = require('path');
const marked = require('marked');

if (!config.content || !config.output) {
    throw new Error('Config file missing required sections: config or output');
}

// Read the content and generate the public files, for each content type
for (let contentType in config.content) {
    const outputDirectory = config.output[contentType];
    const contentDirectory = config.content[contentType];

    preparePublicSubDirectory(outputDirectory);
    generatecontent(contentDirectory, outputDirectory);
}

// Creates the content type directories if not present, and clears all contents
function preparePublicSubDirectory(subDirectory) {
    // Directory must be a valid output directory
    if (!Object.values(config.output).includes(subDirectory)) {
        throw new Error(`Invalid folder path ${subDirectory}. Must be a valid output folder.`);
    }

    if (!fs.existsSync(subDirectory)) {
        fs.mkdirSync(subDirectory);
    } else {
        fs.rmSync(subDirectory, { recursive: true, force: true });
        fs.mkdirSync(subDirectory);
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
        const allContentItemImages = postFiles.filter((item) => allowedImageExtensions.includes(path.extname(item).toLowerCase()));
        allContentItemImages.forEach((imageFile) => {
            fs.copyFileSync(path.join(contentDirectory, postName, imageFile), path.join(outputDirectory, postName, imageFile));
        });
    });
}
