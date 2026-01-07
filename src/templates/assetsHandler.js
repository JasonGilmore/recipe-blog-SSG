const fs = require('node:fs');
const path = require('node:path');
const utils = require('../utils.js');

function generateAssets() {
    const PUBLIC_OUTPUT_DIRECTORY = utils.PUBLIC_OUTPUT_DIRECTORY;

    fs.cpSync(path.join(__dirname, 'css'), path.join(PUBLIC_OUTPUT_DIRECTORY, utils.CSS_FOLDER), { recursive: true, force: true });
    fs.cpSync(path.join(__dirname, 'images'), path.join(PUBLIC_OUTPUT_DIRECTORY, utils.IMAGE_ASSETS_FOLDER), { recursive: true, force: true });

    // Only copy client side post tracking if tracking is enabled
    const jsFolder = path.join(__dirname, 'js');
    const jsOutput = path.join(PUBLIC_OUTPUT_DIRECTORY, utils.JS_FOLDER);
    fs.mkdirSync(jsOutput);
    const pageTracking = 'pageTrack.js';
    const directoryItems = fs.readdirSync(jsFolder);
    for (const item of directoryItems) {
        if (item !== pageTracking) {
            fs.cpSync(path.join(jsFolder, item), path.join(jsOutput, item));
        }
    }

    if (utils.siteConfig.enableVisitCounter) {
        fs.cpSync(path.join(jsFolder, pageTracking), path.join(jsOutput, pageTracking));
    }
}

module.exports = generateAssets;
