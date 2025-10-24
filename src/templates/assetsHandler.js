const utils = require('../utils.js');
const fs = require('fs');
const path = require('path');

function generateAssets() {
    const PUBLIC_OUTPUT_DIRECTORY = utils.PUBLIC_OUTPUT_DIRECTORY;

    fs.cpSync(path.join(__dirname, 'css'), path.join(PUBLIC_OUTPUT_DIRECTORY, utils.CSS_FOLDER), { recursive: true, force: true });
    fs.cpSync(path.join(__dirname, 'images'), path.join(PUBLIC_OUTPUT_DIRECTORY, utils.IMAGE_ASSETS_FOLDER), { recursive: true, force: true });
}

module.exports = generateAssets;
