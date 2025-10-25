const path = require('path');
const fs = require('fs');
let siteConfig;

// Fallback to default config if config not present
try {
    siteConfig = require('./config.json');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        siteConfig = require('./config.default.json');
    }
}

const CSS_FOLDER = 'css';
const IMAGE_ASSETS_FOLDER = '/images/site-assets';

const PUBLIC_OUTPUT_DIRECTORY = path.join(__dirname, '../', siteConfig.outputDirectory);
const CONTENT_DIRECTORY = path.join(__dirname, '../', siteConfig.contentDirectory);
const FOOTER_DIRECTORY = path.join(CONTENT_DIRECTORY, 'footers');

function validateConfigurations() {
    if (!siteConfig.content) {
        throw new Error('Config file missing required sections: content');
    }

    for (const contentType in siteConfig.content) {
        if (!siteConfig.content[contentType].contentFolder || !siteConfig.content[contentType].contentName) {
            throw new Error(`Config type ${contentType} missing required sections. Check contains contentName and contentFolder.`);
        }
    }
}

// Creates the directory if not present, and clears all contents
function prepareDirectory(directory) {
    // Directory must be a valid output directory
    if (!directory.startsWith(PUBLIC_OUTPUT_DIRECTORY)) {
        throw new Error(`Invalid path ${directory}. Must be a valid output directory.`);
    }

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory);
    } else {
        fs.rmSync(directory, { recursive: true, force: true });
        fs.mkdirSync(directory);
    }
}

function removeLastS(word) {
    return removeLast(word, 's');
}

function removelastSlash(word) {
    return removeLast(word, '/');
}

function removeLast(word, text) {
    return word.lastIndexOf(text) === word.length - 1 ? word.slice(0, word.length - 1) : word;
}

module.exports = {
    PUBLIC_OUTPUT_DIRECTORY,
    CONTENT_DIRECTORY,
    FOOTER_DIRECTORY,
    IMAGE_ASSETS_FOLDER,
    CSS_FOLDER,
    siteConfig,
    validateConfigurations,
    prepareDirectory,
    removeLastS,
    removelastSlash,
};
