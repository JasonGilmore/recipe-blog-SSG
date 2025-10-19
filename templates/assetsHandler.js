const config = require('../src/config.json');
const fs = require('fs');
const path = require('path');

function generateAssets() {
    const OUTPUT_DIRECTORY = path.join(__dirname, config.outputDirectory);

    fs.cpSync(path.join(__dirname, 'css'), path.join(OUTPUT_DIRECTORY, 'css'), { recursive: true, force: true });
    fs.cpSync(path.join(__dirname, 'images'), path.join(OUTPUT_DIRECTORY, 'images/site-assets'), { recursive: true, force: true });
}

module.exports = generateAssets;
