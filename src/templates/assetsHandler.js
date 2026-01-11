const fs = require('node:fs');
const path = require('node:path');
const utils = require('../utils.js');

function generateAssets() {
    // Images
    processAssets(path.join(__dirname, 'images'), path.join(utils.PUBLIC_OUTPUT_DIRECTORY, utils.IMAGE_ASSETS_FOLDER));

    // CSS
    // Apply theme if present
    processAssets(path.join(__dirname, 'css'), path.join(utils.PUBLIC_OUTPUT_DIRECTORY, utils.CSS_FOLDER), (item, srcPath) => {
        if (item !== 'main.css' || !utils.siteContent.theme) {
            return true;
        }

        let cssContent = fs.readFileSync(srcPath, 'utf8');
        Object.entries(utils.siteContent.theme).forEach(([key, value]) => {
            cssContent = cssContent.replace(`--${key}: #theme`, `--${key}: ${value}`);
        });
        return cssContent;
    });

    // JS
    // Only copy client side post tracking if tracking is enabled
    processAssets(path.join(__dirname, 'js'), path.join(utils.PUBLIC_OUTPUT_DIRECTORY, utils.JS_FOLDER), (item) => {
        return item === 'pageTrack.js' ? utils.siteConfig.enableVisitCounter : true;
    });
}

// Process an asset directory. processFn is optional and can return:
// String (to write content), Boolean (true to copy, false to skip)
function processAssets(srcDir, destDir, processFn) {
    if (!fs.existsSync(srcDir)) {
        return;
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.readdirSync(srcDir).forEach((item) => {
        const srcPath = path.join(srcDir, item);
        const destPath = path.join(destDir, item);

        const processResult = processFn ? processFn(item, srcPath) : true;
        if (typeof processResult === 'string') {
            fs.writeFileSync(destPath, processResult);
        } else if (processResult === true) {
            fs.cpSync(srcPath, destPath);
        }
    });
}

module.exports = generateAssets;
