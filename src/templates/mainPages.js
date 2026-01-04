const fs = require('node:fs');
const path = require('node:path');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createPosts = require('./postCards.js');
const footerHandler = require('./footer.js');
const utils = require('../utils.js');
const siteContent = require('./siteContent.json');

function generateMainPages(postMetaGroupedByType) {
    for (let contentName of Object.keys(postMetaGroupedByType)) {
        const contentFolderName = postMetaGroupedByType[contentName][0].contentFolder;
        const menuPageFilePath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, contentFolderName + '/' + 'index.html');
        fs.writeFileSync(menuPageFilePath, createMenuPage(contentName, postMetaGroupedByType[contentName], contentFolderName), 'utf8');
    }
}

// Create a site page for the content type
function createMenuPage(contentName, postMeta, contentPageName) {
    // Sort posts by created date descending
    postMeta.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    const pageImageName = contentPageName + 'Image';
    const pageImage = siteContent[pageImageName];
    return `
        ${createHead(contentName, true, null, 'website', `/${contentPageName}/`, null)}
        <body>
            ${createNavbar()}
            <main>
                <h1 class="menu-page-title">${contentName}</h1>
                ${pageImage ? `<div class="menu-page-image"><img loading="lazy" src="${utils.IMAGE_ASSETS_FOLDER}/${pageImage}" alt="" /></div>` : ''}
                ${createPosts(postMeta)}
            </main>

            ${footerHandler.createFooter()}
        </body>

        </html>
    `;
}

module.exports = generateMainPages;
