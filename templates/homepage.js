const fs = require('fs');
const path = require('path');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const createSiteWelcome = require('./siteWelcome.js');
const createPosts = require('./posts.js');
const createFooter = require('./footer.js');
const templateUtils = require('./templateUtils.js');

function generateHomepage(recentPosts) {
    fs.writeFileSync(path.join(templateUtils.OUTPUT_DIRECTORY, '/index.html'), createHomepage(recentPosts), 'utf8');
}

function createHomepage(recentPosts) {
    return `
        ${createHead()}
        <body>
            ${createNavbar()}
            <main>
                ${createSiteWelcome()}
                ${createPosts(recentPosts)}
            </main>

            ${createFooter()}
        </body>

    </html>
`;
}

module.exports = generateHomepage;
