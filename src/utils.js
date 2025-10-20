const config = require('./config.json');
const path = require('path');
const fs = require('fs');

const CONTENT_OUTPUT_DIRECTORY = path.join(__dirname, config.outputDirectory);
const CONTENT_DIRECTORY = path.join(__dirname, config.contentDirectory);
const FOOTER_DIRECTORY = path.join(__dirname, config.footerDirectory);
const FOOTER_OUTPUT_DIRECTORY = path.join(CONTENT_OUTPUT_DIRECTORY, 'footers');

// Creates the directory if not present, and clears all contents
function prepareDirectory(directory) {
    // Directory must be a valid output directory
    if (!directory.startsWith(CONTENT_OUTPUT_DIRECTORY)) {
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
    return word.lastIndexOf('s') === word.length - 1 ? word.slice(0, word.length - 1) : word;
}

module.exports = { CONTENT_OUTPUT_DIRECTORY, CONTENT_DIRECTORY, FOOTER_DIRECTORY, FOOTER_OUTPUT_DIRECTORY, prepareDirectory, removeLastS };
