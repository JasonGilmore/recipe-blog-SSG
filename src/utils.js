const path = require('node:path');
const fs = require('node:fs');
const fsProm = require('node:fs/promises');
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
const SEARCH_JS_FILENAME = 'search.js';
const SEARCH_DATA_FILENAME = 'search-data.json';

const OUTPUT_DIR_PATH = path.join(__dirname, '../', siteConfig.outputDirectory);
const CONTENT_DIR_PATH = path.join(__dirname, '../', siteConfig.contentDirectory);
const FOOTER_DIR_PATH = path.join(CONTENT_DIR_PATH, 'footers');
let tempOutputDirName = siteConfig.outputDirectory;
let tempOutputPath = OUTPUT_DIR_PATH;

// Set the temp output dir for atomic write
function setTempOutput(dirPath) {
    tempOutputPath = dirPath;
    tempOutputDirName = path.basename(dirPath);
}

// Returns the output path in case a temp output has been specified for atomic write
function getOutputPath() {
    return tempOutputPath ? tempOutputPath : OUTPUT_DIR_PATH;
}

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
async function prepareDirectory(directory) {
    // Directory must be a valid output directory
    if (!directory.startsWith(OUTPUT_DIR_PATH)) {
        throw new Error(`Invalid path ${directory}. Must be a valid output directory.`);
    }

    if (await dirExistsAsync(directory)) {
        await fsProm.rm(directory, { recursive: true, force: true });
    }
    await fsProm.mkdir(directory);
}

async function getFileHash(filePath) {
    const fileBuffer = await fsProm.readFile(filePath);
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

// Normalise the path to the relative path from the output folder
function normalisePath(filePath) {
    let normalisedPath = filePath.split(path.sep).join('/');
    const outputDirStart = `/${tempOutputDirName}/`;
    if (normalisedPath.includes(outputDirStart)) {
        normalisedPath = normalisedPath.split(outputDirStart)[1];
    }
    return normalisedPath.startsWith('/') ? normalisedPath : '/' + normalisedPath;
}

const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

function getPostTypeConfig(postType) {
    return siteConfig.postTypes[postType];
}

function isFeatureEnabled(feature) {
    return !!siteConfig[feature];
}

function removeLastS(word) {
    return removeLast(word, 's');
}

function removeLast(word, text) {
    return word.lastIndexOf(text) === word.length - 1 ? word.slice(0, word.length - 1) : word;
}

async function dirExistsAsync(path) {
    try {
        const s = await fsProm.stat(path);
        return s.isDirectory();
    } catch {
        return false;
    }
}

module.exports = {
    siteContent,
    OUTPUT_DIR_PATH,
    CONTENT_DIR_PATH,
    FOOTER_DIR_PATH,
    setTempOutput,
    getOutputPath,
    PAGE_TYPES,
    IMAGE_ASSETS_FOLDER,
    SEARCH_JS_FILENAME,
    SEARCH_DATA_FILENAME,
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
    isFeatureEnabled,
    removeLastS,
    dirExistsAsync,
};
