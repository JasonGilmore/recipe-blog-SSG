const fs = require('node:fs');
const path = require('node:path');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createSiteWelcome = require('./siteWelcome.js');
const createPostCards = require('./postCards.js');
const footerHandler = require('./footer.js');
const utils = require('../utils.js');

function generateHomepage(recentPosts) {
    fs.writeFileSync(path.join(utils.PUBLIC_OUTPUT_DIRECTORY, '/index.html'), createHomepage(recentPosts), 'utf8');
}

function createHomepage(recentPosts) {
    return `
        ${createHead({ pageType: utils.PAGE_TYPES.HOMEPAGE })}
        <body>
            ${createNavbar()}
            <main>
                ${createSiteWelcome()}
                ${createPostCards(recentPosts, true)}
            </main>

            ${footerHandler.createFooter()}
        </body>

    </html>
`;
}

module.exports = generateHomepage;
