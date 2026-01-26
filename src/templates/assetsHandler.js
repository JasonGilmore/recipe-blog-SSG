const fs = require('node:fs');
const path = require('node:path');
const utils = require('../utils.js');

function generateAssets() {
    // Images
    processAssets(path.join(__dirname, 'images'), path.join(utils.getOutputPath(), utils.IMAGE_ASSETS_FOLDER));

    // CSS
    // Apply theme if present
    processAssets(path.join(__dirname, 'css'), path.join(utils.getOutputPath(), utils.CSS_FOLDER), (item, srcPath) => {
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
    processAssets(path.join(__dirname, 'js'), path.join(utils.getOutputPath(), utils.JS_FOLDER), (item) => {
        if (item === utils.SEARCH_JS_FILENAME) {
            return generateSearchBundle();
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

// Inject search index location and search input placeholders
// Inject the search library - for version consistency and CDN dependency removal
// Search index already generated from generate.js
function generateSearchBundle() {
    if (!utils.isFeatureEnabled('enableSearch')) return false;

    const searchIndexHashPath = utils.getHashPath(`/${utils.SEARCH_DATA_FILENAME}`);
    const searchJsPath = path.join(utils.JS_FOLDER, utils.SEARCH_JS_FILENAME);
    let searchJs = fs.readFileSync(path.join(__dirname, searchJsPath), 'utf8');

    // Update placeholders
    searchJs = searchJs.replace('#SEARCH_INDEX_PLACEHOLDER', searchIndexHashPath);
    searchJs = utils.siteContent.searchPlaceholders
        ? searchJs.replace("'#SEARCH_PLACEHOLDERS'", JSON.stringify(utils.siteContent.searchPlaceholders))
        : searchJs.replace('#SEARCH_PLACEHOLDERS', 'Search site...');
    searchJs = searchJs.replace("'#SEARCH_TRACK_PLACEHOLDER'", utils.isFeatureEnabled('enableVisitCounter'));

    // Inject search library
    const libraryPath = path.join(__dirname, '..', '..', 'node_modules', 'lunr', 'lunr.min.js');
    if (!fs.existsSync(libraryPath)) {
        throw new Error('Could not locate search library for search generation.');
    }
    const library = fs.readFileSync(libraryPath, 'utf8');

    const bundle = searchJs + '\n\n' + library;
    return bundle;
}

module.exports = generateAssets;
