const fs = require('fs');
const path = require('path');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createPosts = require('./postCards.js');
const footerHandler = require('./footer.js');
const templateUtils = require('../utils.js');

function generateMenuPages(postMetaGroupedByType) {
    for (let contentName of Object.keys(postMetaGroupedByType)) {
        const contentFolder = postMetaGroupedByType[contentName][0].contentFolder;
        const menuPageFilePath = path.join(templateUtils.CONTENT_OUTPUT_DIRECTORY, contentFolder + '.html');
        fs.writeFileSync(menuPageFilePath, createMenuPage(contentName, postMetaGroupedByType[contentName]), 'utf8');
    }
}

// Create a site page for the content type
function createMenuPage(contentName, postMeta) {
    return `
        ${createHead()}
        <body>
            ${createNavbar()}
            <main>
                <div class="intro">
                    <h1 class="intro-text-header">${contentName}</h1>
                </div>
                ${createPosts(postMeta)}
            </main>

            ${footerHandler.createFooter()}
        </body>

        </html>
    `;
}

module.exports = generateMenuPages;
