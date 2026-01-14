const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const siteContent = require('./templates/siteContent.json');

// Fallback to default config if config not present
let siteConfig;
const configPath = path.join(__dirname, 'config.json');
const defaultConfigPath = path.join(__dirname, 'config.default.json');
if (fs.existsSync(configPath)) {
    siteConfig = require(configPath);
} else {
    siteConfig = require(defaultConfigPath);
}

const CSS_FOLDER = 'css';
const JS_FOLDER = 'js';
const IMAGE_ASSETS_FOLDER = 'images/site-assets';

const PUBLIC_OUTPUT_DIRECTORY = path.join(__dirname, '../', siteConfig.outputDirectory);
const CONTENT_DIRECTORY = path.join(__dirname, '../', siteConfig.contentDirectory);
const FOOTER_DIRECTORY = path.join(CONTENT_DIRECTORY, 'footers');

function validateConfigurations() {
    if (!siteConfig.postTypes) {
        throw new Error('Config file missing required sections: postTypes');
    }

    for (const postType in siteConfig.postTypes) {
        if (!siteConfig.postTypes[postType].postTypeDisplayName || !siteConfig.postTypes[postType].postTypeDirectory) {
            throw new Error(`Config type ${postType} missing required sections. Check contains postTypeDisplayName and postTypeDirectory.`);
        }
    }
}

const PAGE_TYPES = {
    POST: 'post',
    FOOTER: 'footer',
    TOP_LEVEL: 'top-level',
    HOMEPAGE: 'homepage',
};

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

function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return getBufferHash(fileBuffer);
}

function getStringHash(stringContent) {
    const stringBuffer = Buffer.from(stringContent, 'utf8');
    return getBufferHash(stringBuffer);
}

function getBufferHash(buffer) {
    return crypto.createHash('MD5').update(buffer).digest('hex');
}

function getHashFilename(base, hash, ext) {
    return `${base}.${hash}${ext}`;
}

// Store a manifest for content hash filenames (including ext) of assets, site images and post images
// Uses the relative path from the public folder perspective
// Example: /recipes/tart/tart.jpg: /recipes/tart/tart.353aee35.jpg
// Example: /js/posts.js /js/posts.5499b95b.js
const pathNameMap = {};

function getHashPath(logicalPath) {
    return pathNameMap[logicalPath] || logicalPath;
}

function setHashPath(logicalPath, hashPath) {
    pathNameMap[normalisePath(logicalPath)] = normalisePath(hashPath);
}

function getHashPaths() {
    return { ...pathNameMap };
}

// Normalise the path to the relative path from the public folder
function normalisePath(filePath) {
    let normalisedPath = filePath.split(path.sep).join('/');
    if (normalisedPath.includes('/public/')) {
        normalisedPath = normalisedPath.split('/public/')[1];
    }
    return normalisedPath.startsWith('/') ? normalisedPath : '/' + normalisedPath;
}

const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

function getPostTypeConfig(postType) {
    return siteConfig.postTypes[postType];
}

function removeLastS(word) {
    return removeLast(word, 's');
}

function removeLast(word, text) {
    return word.lastIndexOf(text) === word.length - 1 ? word.slice(0, word.length - 1) : word;
}

module.exports = {
    siteContent,
    PUBLIC_OUTPUT_DIRECTORY,
    CONTENT_DIRECTORY,
    FOOTER_DIRECTORY,
    PAGE_TYPES,
    IMAGE_ASSETS_FOLDER,
    CSS_FOLDER,
    JS_FOLDER,
    siteConfig,
    validateConfigurations,
    prepareDirectory,
    getFileHash,
    getStringHash,
    getHashFilename,
    getHashPath,
    setHashPath,
    getHashPaths,
    allowedImageExtensions,
    getPostTypeConfig,
    removeLastS,
};
