const path = require('node:path');
const fs = require('node:fs');
let siteConfig;

const PAGE_TYPES = {
    POST: 'post',
    HOMEPAGE: 'homepage',
    MENUPAGE: 'menupage',
    FOOTERPAGE: 'footer',
};

// Fallback to default config if config not present
const configPath = path.join(__dirname, 'config.json');
const defaultConfigPath = path.join(__dirname, 'config.default.json');
if (fs.existsSync(configPath)) {
    siteConfig = require(configPath);
} else {
    siteConfig = require(defaultConfigPath);
}

const CSS_FOLDER = 'css';
const JS_FOLDER = 'js';
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
        clearDirectoryExceptSome(directory);
    }
}

function clearDirectoryExceptSome(directory) {
    const doNotClear = ['robots.txt'];
    const directoryItems = fs.readdirSync(directory, { withFileTypes: true });
    for (const item of directoryItems) {
        if (doNotClear.includes(item.name)) {
            continue;
        }
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(fullPath);
        }
    }
}

const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

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
    PAGE_TYPES,
    PUBLIC_OUTPUT_DIRECTORY,
    CONTENT_DIRECTORY,
    FOOTER_DIRECTORY,
    IMAGE_ASSETS_FOLDER,
    CSS_FOLDER,
    JS_FOLDER,
    siteConfig,
    validateConfigurations,
    prepareDirectory,
    allowedImageExtensions,
    removeLastS,
    removelastSlash,
};
