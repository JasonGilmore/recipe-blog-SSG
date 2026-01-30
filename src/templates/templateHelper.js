const path = require('node:path');
const fs = require('node:fs/promises');
const lunr = require('lunr');
const fm = require('front-matter');
const { minify } = require('html-minifier-terser');
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

// Create the index and a data store for result metadata
// Compression is omitted here, ideally handled by a reverse proxy
async function generateSearchData(allPostMeta) {
    const searchDataString = JSON.stringify({
        index: await createSearchIndex(allPostMeta),
        store: createStore(allPostMeta),
    });

    // Store hash and write file from string
    const hash = utils.getStringHash(searchDataString);
    const [base, ext] = utils.SEARCH_DATA_FILENAME.split('.');
    const hashFilename = utils.getHashFilename(base, hash, `.${ext}`);
    await fs.mkdir(utils.getOutputPath(), { recursive: true });

    const logicalPath = path.join(utils.getOutputPath(), utils.SEARCH_DATA_FILENAME);
    const hashPath = path.join(utils.getOutputPath(), hashFilename);
    utils.setHashPath(logicalPath, hashPath);
    await fs.writeFile(hashPath, searchDataString, 'utf8');
}

async function createSearchIndex(allPostMeta) {
    const builder = new lunr.Builder();
    builder.ref('link');
    builder.field('title', { boost: 10 });
    builder.field('keywords');
    builder.field('description');
    builder.field('category');
    builder.field('content');

    for (const postMeta of allPostMeta) {
        const contentPath = path.join(utils.CONTENT_DIR_PATH, postMeta.link, postMeta.mdFilename);
        const content = cleanMarkdown(fm(await fs.readFile(contentPath, 'utf8')).body);
        builder.add({
            link: postMeta.link,
            title: normalise(postMeta.title),
            description: normalise(postMeta.description),
            keywords: normalise(postMeta.keywords),
            category: normalise(postMeta.category),
            content: normalise(content),
        });
    }

    return builder.build();
}

function createStore(allPostMeta) {
    return allPostMeta.reduce((acc, postMeta) => {
        acc[postMeta.link] = {
            link: postMeta.link,
            title: postMeta.title,
            description: postMeta.description,
            imageHashPath: postMeta.imageHashPath,
        };
        return acc;
    }, {});
}

// Remove accent marks
function normalise(text) {
    if (!text) return text;
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Remove unecessary content, reduces raw index size by ~12%
function cleanMarkdown(markdown) {
    if (!markdown) return markdown;

    return (
        markdown
            // Comments
            .replace(/^<!.*$/gm, '')
            // Image links, keep anchor text
            .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
            // Links, keep anchor text
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            // Placeholder content
            .replace(/\{.*?\}/g, '')
            // Words containing numbers
            .replace(/[^\s]*\d[^\s]*/g, '')
            // Table characters. Matches | and lines like |---| or ---|---
            .replace(/[|]|-{2,}/g, ' ')
            // Task lists
            .replace(/\[\s\]/g, '')
            // Points
            .replace(/\\\*/g, '')
            // Remaining markdown symbols
            .replace(/[#*_>`~:\|\-\(\)]/g, ' ')
            .trim()
    );
}

// Minify if required
async function processHtml(html) {
    if (!utils.isFeatureEnabled('enableMinify')) return html;

    const options = {
        caseSensitive: true,
        removeComments: true,
        collapseBooleanAttributes: true,
        removeEmptyAttributes: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
        processScripts: ['application/ld+json'],
    };
    return await minify(html, options);
}

module.exports = {
    getUpArrow,
    getDownArrow,
    getSearchIcon,
    formatPostHtml,
    generateSearchData,
    processHtml,
};
