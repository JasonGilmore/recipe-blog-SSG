const path = require('node:path');
const fs = require('node:fs');
const utils = require('../utils.js');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createPosts = require('./postCards.js');
const footerHandler = require('./footer.js');

function generateTopLevelPages(postMetaGroupedByType) {
    for (let postTypeDisplayName of Object.keys(postMetaGroupedByType)) {
        const postTypeDirectoryName = postMetaGroupedByType[postTypeDisplayName][0].postTypeDirectoryName;
        const topLevelPagePath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, postTypeDirectoryName + '/' + 'index.html');
        fs.writeFileSync(topLevelPagePath, createTopLevelPage(postTypeDisplayName, postMetaGroupedByType[postTypeDisplayName], postTypeDirectoryName), 'utf8');
    }
}

// Create a site page for the post type
function createTopLevelPage(postTypeDisplayName, postMeta, postTypeDirectoryName) {
    // Sort posts by created date descending
    postMeta.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    const topLevelIconName = postTypeDirectoryName + 'Image';
    const topLevelIcon = utils.siteContent[topLevelIconName];
    const head = createHead({
        pageTitle: `${postTypeDisplayName} | ${utils.siteContent.siteName}`,
        pageDescription: null,
        pageType: utils.PAGE_TYPES.TOP_LEVEL,
        relativeUrl: `/${postTypeDirectoryName}/`,
        relativeImage: null,
    });

    return `
        ${head}
        <body>
            ${createNavbar()}
            <main>
                <h1 class="toplevel-page-title">${postTypeDisplayName}</h1>
                ${topLevelIcon ? `<div class="toplevel-page-image"><img src="${utils.IMAGE_ASSETS_FOLDER}/${topLevelIcon}" alt="" /></div>` : ''}
                ${createPosts(postMeta)}
            </main>

            ${footerHandler.createFooter()}
        </body>

        </html>
    `;
}

module.exports = generateTopLevelPages;
