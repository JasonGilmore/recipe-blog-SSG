const fs = require('fs');
const path = require('path');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createPosts = require('./posts.js');
const createFooter = require('./footer.js');
const templateUtils = require('./templateUtils.js');

function generateMenuPages(postMetaGroupedByType) {
    for (let contentType of Object.keys(postMetaGroupedByType)) {
        fs.writeFileSync(path.join(templateUtils.OUTPUT_DIRECTORY, contentType + '.html'), createMenuPage(contentType, postMetaGroupedByType[contentType]), 'utf8');
    }
}

// Create a site page for the content type
function createMenuPage(type, postMeta) {
    return `
        ${createHead()}
        <body>
            ${createNavbar()}
            <main>
                <div class="intro">
                    <h1 class="intro-text-header">${templateUtils.capitaliseFirstLetter(type)}</h1>
                </div>
                ${createPosts(postMeta)}
            </main>

            ${createFooter()}
        </body>

        </html>
    `;
}

module.exports = generateMenuPages;
