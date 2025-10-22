const fs = require('fs');
const path = require('path');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createSiteWelcome = require('./siteWelcome.js');
const createPostCards = require('./postCards.js');
const footerHandler = require('./footer.js');
const templateUtils = require('../utils.js');

function generateHomepage(recentPosts) {
    fs.writeFileSync(path.join(templateUtils.CONTENT_OUTPUT_DIRECTORY, '/index.html'), createHomepage(recentPosts), 'utf8');
}

function createHomepage(recentPosts) {
    return `
        ${createHead()}
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
