const path = require('node:path');
const fs = require('node:fs');
const utils = require('../utils.js');

function getUpArrow() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
            </svg>`;
}

function getDownArrow() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
            </svg>`;
}

function getSearchIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="16.65" y1="16.65" x2="23" y2="23"></line>
            </svg>`;
}

// Replace the relative image urls, add css and other formatting features
function formatPostHtml(htmlContent, postTypeDirectoryName, postDirectoryName) {
    const folderPath = `/${postTypeDirectoryName}/${postDirectoryName}/`;

    htmlContent = htmlContent
        .replaceAll('src="./', `src="${folderPath}`)
        .replaceAll('<table>', '<div class="table-wrapper"><table>')
        .replaceAll('</table>', '</table></div>')
        .replaceAll('<p>{recipeboxstart}</p>', '<div id="recipe" class="recipe-box">')
        .replaceAll('<p>{recipeboxend}</p>', '</div>')
        .replaceAll('{jumptorecipebox}', `<button class="jump-to-recipe flex-centre" type="button">${getDownArrow()} Jump to recipe</button>`)
        .replaceAll('<p>{lightstyleboxstart}</p>', '<div class="light-style-box">')
        .replaceAll('<p>{lightstyleboxend}</p>', '</div>')
        .replaceAll('<p>{darkstyleboxstart}</p>', '<div class="dark-style-box">')
        .replaceAll('<p>{darkstyleboxend}</p>', '</div>');

    // Update image references to use the content hash filename
    Object.entries(utils.getHashPaths()).forEach(([logical, hash]) => {
        htmlContent = htmlContent.replaceAll(`src="${logical}`, `src="${hash}`);
    });

    // The first image should be a priority to optimise LCP and avoid layout shifts
    htmlContent = htmlContent.replace('<img', '<img fetchpriority="high" class="content-image"');
    htmlContent = htmlContent.replaceAll('<img src=', '<img loading="lazy" class="content-image" src=');

    // Update checkboxes so they are active and text is crossed out on check
    let checkboxIdCounter = 1;
    htmlContent = htmlContent.replaceAll(/<li><input disabled="" type="checkbox">(.*?)(?=<\/li>|<ul>)/g, (match, text) => {
        const id = `checkbox-${checkboxIdCounter}`;
        checkboxIdCounter++;
        return `<li class="ingredient-item-checkbox"><input type="checkbox" class="test" id="${id}"> <label for="${id}">${text}</label>`;
    });
    return htmlContent;
}

// Index is generated in created date descending order
function generateSearchIndex(allPostMeta) {
    allPostMeta.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const index = allPostMeta.map((post) => {
        const keywords = `${post.category} ${post.keywords} ${post.postType}`;
        return {
            title: post.title,
            description: post.description,
            link: post.link,
            imageHashPath: post.imageHashPath,
            keywords: keywords.toLowerCase(),
        };
    });

    // Generate index filename hash
    const searchIndex = JSON.stringify(index);
    const hash = utils.getStringHash(searchIndex);
    const [base, ext] = utils.SEARCH_INDEX_FILENAME.split('.');
    const hashFilename = utils.getHashFilename(base, hash, `.${ext}`);

    // Store hash and write index
    const logicalPath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, utils.SEARCH_INDEX_FILENAME);
    const hashPath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, hashFilename);
    utils.setHashPath(logicalPath, hashPath);
    fs.writeFileSync(hashPath, searchIndex, 'utf8');
}

module.exports = {
    getUpArrow,
    getDownArrow,
    getSearchIcon,
    formatPostHtml,
    generateSearchIndex,
};
