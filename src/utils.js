const path = require('node:path');
const fs = require('node:fs');
const fsProm = require('node:fs/promises');
const crypto = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const ExifTransformer = require('exif-be-gone');
const siteContent = require('./templates/siteContent.json');

const CSS_FOLDER = 'css';
const JS_FOLDER = 'js';
const IMAGE_ASSETS_FOLDER = 'images/site-assets';
const STATIC_FOLDER = 'static';
const SEARCH_JS_FILENAME = 'search.js';
const SEARCH_DATA_FILENAME = 'search-data.json';
const ROBOTS_TXT_FILENAME = 'robots.txt';
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const PAGE_TYPES = {
    POST: 'post',
    FOOTER: 'footer',
    TOP_LEVEL: 'top-level',
    HOMEPAGE: 'homepage',
};
const HASH_ALGO = 'MD5';
const HASH_ENCODING = 'hex';

// Fallback to default config if config not present
let siteConfig;
const configPath = path.join(__dirname, 'config.json');
const defaultConfigPath = path.join(__dirname, 'config.default.json');
if (fs.existsSync(configPath)) {
    siteConfig = require(configPath);
} else {
    siteConfig = require(defaultConfigPath);
}

function getPostTypeConfig(postType) {
    return siteConfig.postTypes[postType];
}

const OUTPUT_DIR_PATH = path.join(__dirname, '../', siteConfig.outputDirectory);
const CONTENT_DIR_PATH = path.join(__dirname, '../', siteConfig.contentDirectory);
const FOOTER_DIR_PATH = path.join(CONTENT_DIR_PATH, 'footers');
let tempOutputDirName = siteConfig.outputDirectory;
let tempOutputPath = OUTPUT_DIR_PATH;

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

// Set the temp output dir for atomic write
function setTempOutput(dirPath) {
    if (typeof dirPath !== 'string' || dirPath.length === 0) {
        throw new Error('Invalid temporary output provided.');
    }

    tempOutputPath = dirPath;
    tempOutputDirName = path.basename(dirPath);
}

// Returns the output path in case a temp output has been specified for atomic write
function getOutputPath() {
    return tempOutputPath ? tempOutputPath : OUTPUT_DIR_PATH;
}

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
    return crypto.createHash(HASH_ALGO).update(buffer).digest(HASH_ENCODING);
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

function isFeatureEnabled(feature) {
    return !!siteConfig[feature];
}

function removeLastS(word) {
    if (typeof word !== 'string') return word;
    return removeLast(word, 's');
}

function removeLast(word, text) {
    return word.toLowerCase().endsWith(text.toLowerCase()) ? word.slice(0, -text.length) : word;
}

async function dirExistsAsync(path) {
    const stats = await getStatSafe(path);
    return stats ? stats.isDirectory() : false;
}

async function fileExistsAsync(path) {
    const stats = await getStatSafe(path);
    return stats ? stats.isFile() : false;
}

async function getStatSafe(path) {
    try {
        return await fsProm.stat(path);
    } catch {
        return null;
    }
}

// Removes exif (or other private data) from an image and writes the cleaned image including with content hash filename
async function scrubSaveImage(imagePath, outputDir, imageName) {
    try {
        const tempPath = path.join(outputDir, imageName) + '.tmp';
        const reader = fs.createReadStream(imagePath);
        const transformer = new ExifTransformer();
        const writer = fs.createWriteStream(tempPath);

        const contentHashInstance = crypto.createHash(HASH_ALGO);
        const hashTransformer = new Transform({
            transform(chunk, encoding, callback) {
                contentHashInstance.update(chunk);
                callback(null, chunk);
            },
        });

        await pipeline(reader, transformer, hashTransformer, writer);

        const contentHash = contentHashInstance.digest(HASH_ENCODING);
        const ext = path.extname(imageName);
        const base = path.basename(imageName, ext);
        const hashFilename = getHashFilename(base, contentHash, ext);
        const outputHashPath = path.join(outputDir, hashFilename);
        setHashPath(path.join(outputDir, imageName), outputHashPath);

        await fsProm.rename(tempPath, outputHashPath);
        return hashFilename;
    } catch (err) {
        throw new Error('Error removing exif. ' + err.stack);
    }
}

module.exports = {
    siteContent,
    CSS_FOLDER,
    JS_FOLDER,
    IMAGE_ASSETS_FOLDER,
    STATIC_FOLDER,
    SEARCH_JS_FILENAME,
    SEARCH_DATA_FILENAME,
    ROBOTS_TXT_FILENAME,
    ALLOWED_IMAGE_EXTENSIONS,
    PAGE_TYPES,
    siteConfig,
    OUTPUT_DIR_PATH,
    CONTENT_DIR_PATH,
    FOOTER_DIR_PATH,
    setTempOutput,
    getOutputPath,
    validateConfigurations,
    prepareDirectory,
    getFileHash,
    getStringHash,
    getHashFilename,
    getHashPath,
    setHashPath,
    getHashPaths,
    getPostTypeConfig,
    isFeatureEnabled,
    removeLastS,
    dirExistsAsync,
    fileExistsAsync,
    scrubSaveImage,
};
