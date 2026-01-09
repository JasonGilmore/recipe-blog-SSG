const path = require('node:path');
const fs = require('node:fs');
const utils = require('../utils.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createPosts = require('./postCards.js');
const footerHandler = require('./footer.js');

function generateTopLevelPages(postMetaGroupedByType) {
    for (let postType of Object.keys(postMetaGroupedByType)) {
        const postTypeConfig = utils.getPostTypeConfig(postType);
        const topLevelPagePath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, postTypeConfig.postTypeDirectory + '/' + 'index.html');
        fs.writeFileSync(topLevelPagePath, createTopLevelPage(postTypeConfig, postMetaGroupedByType[postType]), 'utf8');
    }
}

// Create a site page for the post type
function createTopLevelPage(postTypeConfig, postMetaList) {
    // Sort posts by created date descending
    postMetaList.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    const topLevelIconName = postTypeConfig.postTypeDirectory + 'Image';
    const topLevelIcon = utils.siteContent[topLevelIconName];
    const structuredData = structuredDataMarkup.createTopLevelData(postTypeConfig);
    const head = createHead({
        pageTitle: postTypeConfig.postTypeDisplayName,
        pageDescription: null,
        pageType: utils.PAGE_TYPES.TOP_LEVEL,
        relativeUrl: `/${postTypeConfig.postTypeDirectory}/`,
        relativeImage: null,
        structuredData,
    });

    return `
        ${head}
        <body>
            ${createNavbar()}
            <main>
                <h1 class="toplevel-page-title">${postTypeConfig.postTypeDisplayName}</h1>
                ${topLevelIcon ? `<div class="toplevel-page-image"><img src="${utils.IMAGE_ASSETS_FOLDER}/${topLevelIcon}" alt="" /></div>` : ''}
                ${createPosts(postMetaList)}
            </main>

            ${footerHandler.createFooter()}
        </body>

        </html>
    `;
}

module.exports = generateTopLevelPages;
