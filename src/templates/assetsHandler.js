const fs = require('node:fs/promises');
const path = require('node:path');
const utils = require('../utils.js');
const templateHelper = require('./templateHelper.js');

async function generateAssets() {
    // Images
    await processAssets(path.join(__dirname, 'images'), path.join(utils.getOutputPath(), utils.IMAGE_ASSETS_FOLDER));

    // CSS
    // Apply theme if present
    await processAssets(path.join(__dirname, 'css'), path.join(utils.getOutputPath(), utils.CSS_FOLDER), async (item, srcPath) => {
        let cssContent = await fs.readFile(srcPath, 'utf8');

        // Inject colour theme
        if (item === 'main.css' && utils.siteContent.theme) {
            Object.entries(utils.siteContent.theme).forEach(([key, value]) => {
                cssContent = cssContent.replace(`--${key}: #theme`, `--${key}: ${value}`);
            });
        }

        return templateHelper.processCss(cssContent);
    });

    // JS
    // Only copy feature scripts if enabled
    await processAssets(path.join(__dirname, 'js'), path.join(utils.getOutputPath(), utils.JS_FOLDER), async (item, srcPath) => {
        if (item === 'pageTrack.js' && !utils.isFeatureEnabled('enableVisitCounter')) {
            return false;
        }

        if (item === utils.SEARCH_JS_FILENAME) {
            return await generateSearchBundle();
        }

        return await templateHelper.processJs(await fs.readFile(srcPath, 'utf8'));
    });

    // Robots.txt
    const robotsPath = path.join(__dirname, utils.STATIC_FOLDER, utils.ROBOTS_TXT_FILENAME);
    if (await utils.fileExistsAsync(robotsPath)) {
        await fs.copyFile(robotsPath, path.join(utils.getOutputPath(), utils.ROBOTS_TXT_FILENAME));
    }
}

// Process an asset directory and generate content hash filenames
// processFn is optional and can return: String (to write content), Boolean (true to copy, false to skip)
async function processAssets(srcDir, destDir, processFn) {
    if (!(await utils.dirExistsAsync(srcDir))) return;

    await fs.mkdir(destDir, { recursive: true });
    const items = await fs.readdir(srcDir);
    for (item of items) {
        const srcPath = path.join(srcDir, item);
        const ext = path.extname(item);
        const base = path.basename(item, ext);

        const processResult = processFn ? await processFn(item, srcPath) : true;
        const isString = typeof processResult === 'string';
        const isTrue = processResult === true;

        if (isString || isTrue) {
            const hash = isString ? utils.getStringHash(processResult) : await utils.getFileHash(srcPath);
            const hashFilename = utils.getHashFilename(base, hash, ext);
            const hashDestPath = path.join(destDir, hashFilename);

            if (isString) {
                await fs.writeFile(hashDestPath, processResult, 'utf8');
            } else {
                await fs.cp(srcPath, hashDestPath);
            }
            utils.setHashPath(path.join(destDir, item), hashDestPath);
        }
    }
}

// Inject search index location and search input placeholders
// Inject the search library - for version consistency and CDN dependency removal
// Search index already generated from generate.js
async function generateSearchBundle() {
    if (!utils.isFeatureEnabled('enableSearch')) return false;

    const searchIndexHashPath = utils.getHashPath(`/${utils.SEARCH_DATA_FILENAME}`);
    const searchJsPath = path.join(utils.JS_FOLDER, utils.SEARCH_JS_FILENAME);
    let searchJs = await fs.readFile(path.join(__dirname, searchJsPath), 'utf8');

    // Update placeholders
    searchJs = searchJs.replace('#SEARCH_INDEX_PLACEHOLDER', searchIndexHashPath);
    searchJs = utils.siteContent.searchPlaceholders
        ? searchJs.replace("'#SEARCH_PLACEHOLDERS'", JSON.stringify(utils.siteContent.searchPlaceholders))
        : searchJs.replace('#SEARCH_PLACEHOLDERS', 'Search site...');
    searchJs = searchJs.replace("'#SEARCH_TRACK_PLACEHOLDER'", utils.isFeatureEnabled('enableVisitCounter'));
    searchJsMin = await templateHelper.processJs(searchJs);

    // Inject search library
    let library;
    try {
        const libraryPath = path.join(__dirname, '..', '..', 'node_modules', 'lunr', 'lunr.min.js');
        library = await fs.readFile(libraryPath, 'utf8');
    } catch (err) {
        throw new Error('Error reading search library for search generation. ' + err.stack);
    }

    const bundle = searchJsMin + '\n\n' + library;
    return bundle;
}

module.exports = generateAssets;
