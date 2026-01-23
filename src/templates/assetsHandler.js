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
    // Only copy feature scripts if enabled
    processAssets(path.join(__dirname, 'js'), path.join(utils.PUBLIC_OUTPUT_DIRECTORY, utils.JS_FOLDER), (item) => {
        if (item === 'search.js') {
            return generateSearchJs();
        }
        if (item === 'pageTrack.js') {
            return utils.isFeatureEnabled('enableVisitCounter');
        }
        return true;
    });
}

// Process an asset directory and generate content hash filenames
// processFn is optional and can return: String (to write content), Boolean (true to copy, false to skip)
function processAssets(srcDir, destDir, processFn) {
    if (!fs.existsSync(srcDir)) return;

    fs.mkdirSync(destDir, { recursive: true });
    fs.readdirSync(srcDir).forEach((item) => {
        const srcPath = path.join(srcDir, item);
        const ext = path.extname(item);
        const base = path.basename(item, ext);

        const processResult = processFn ? processFn(item, srcPath) : true;
        const isString = typeof processResult === 'string';
        const isTrue = processResult === true;

        if (isString || isTrue) {
            const hash = isString ? utils.getStringHash(processResult) : utils.getFileHash(srcPath);
            const hashFilename = utils.getHashFilename(base, hash, ext);
            const hashDestPath = path.join(destDir, hashFilename);

            if (isString) {
                fs.writeFileSync(hashDestPath, processResult, 'utf8');
            } else {
                fs.cpSync(srcPath, hashDestPath);
            }
            utils.setHashPath(path.join(destDir, item), hashDestPath);
        }
    });
}

// Generate search script and inject search index location
function generateSearchJs() {
    if (!utils.isFeatureEnabled('enableSearch')) return false;

    const searchIndexHashPath = utils.getHashPath(`/${utils.SEARCH_INDEX_FILENAME}`);
    const searchJsPath = path.join('js', 'search.js');
    let searchJs = fs.readFileSync(path.join(__dirname, searchJsPath), 'utf8');

    // Update placeholders
    searchJs = searchJs.replace('#SEARCH_INDEX_PLACEHOLDER', searchIndexHashPath);
    searchJs = utils.siteContent.searchPlaceholders
        ? searchJs.replace("'#SEARCH_PLACEHOLDERS'", JSON.stringify(utils.siteContent.searchPlaceholders))
        : searchJs.replace('#SEARCH_PLACEHOLDERS', 'Search...');

    const filename = utils.getHashFilename('search', utils.getStringHash(searchJs), '.js');
    const searchJsOutputPath = path.join(path.join(utils.PUBLIC_OUTPUT_DIRECTORY, utils.JS_FOLDER), filename);
    fs.writeFileSync(searchJsOutputPath, searchJs, 'utf8');
    utils.setHashPath(searchJsPath, searchJsOutputPath);
}

module.exports = generateAssets;
