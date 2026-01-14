const path = require('node:path');
const fs = require('node:fs');
const utils = require('../utils.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createHeader = require('./header.js');
const createPostCards = require('./postCards.js');
const footerHandler = require('./footer.js');

function generateTopLevelPages(postMetaGroupedByType) {
    for (let postType of Object.keys(postMetaGroupedByType)) {
        const postTypeConfig = utils.getPostTypeConfig(postType);
        const topLevelPagePath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, postTypeConfig.postTypeDirectory + '/' + 'index.html');
        fs.writeFileSync(topLevelPagePath, createTopLevelPage(postType, postTypeConfig, postMetaGroupedByType[postType]), 'utf8');
    }
}

// Create a site page for the post type
function createTopLevelPage(postType, postTypeConfig, postMetaList) {
    // Sort posts by created date descending
    postMetaList.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    // Get the top-level items if present
    const topLevelIconFilename = utils.siteContent[`${postType}Image`];
    const topLevelIconHashPath = utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/${topLevelIconFilename}`);
    const topLevelDescription = utils.siteContent[`${postType}Description`];

    const structuredData = structuredDataMarkup.createTopLevelData(postTypeConfig, topLevelDescription);
    const head = createHead({
        pageTitle: postTypeConfig.postTypeDisplayName,
        pageDescription: topLevelDescription ? topLevelDescription : null,
        pageType: utils.PAGE_TYPES.TOP_LEVEL,
        relativeUrl: `/${postTypeConfig.postTypeDirectory}/`,
        relativeImage: null,
        structuredData,
    });

    return `
        ${head}
        <body>
            ${createHeader()}
            <main>
                <div class="page-intro">
                    <div class="page-intro-text-container">
                        <h1 class="page-intro-title">${postTypeConfig.postTypeDisplayName}</h1>
                        ${topLevelDescription ? `<h2 class="page-intro-secondary-title">${topLevelDescription}</h2>` : ''}
                    </div>
                </div>
                ${topLevelIconFilename ? `<div class="toplevel-page-image"><img src="${topLevelIconHashPath}" alt="" /></div>` : ''}
                ${createPostCards(postMetaList, false, topLevelDescription ? 'h3' : 'h2')}
            </main>

            ${footerHandler.createFooter()}
        </body>

        </html>
    `;
}

module.exports = generateTopLevelPages;
