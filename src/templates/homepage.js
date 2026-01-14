const fs = require('node:fs');
const path = require('node:path');
const utils = require('../utils.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createHeader = require('./header.js');
const createSiteWelcome = require('./siteWelcome.js');
const createPostCards = require('./postCards.js');
const footerHandler = require('./footer.js');

function generateHomepage(recentPosts) {
    fs.writeFileSync(path.join(utils.PUBLIC_OUTPUT_DIRECTORY, '/index.html'), createHomepage(recentPosts), 'utf8');
}

function createHomepage(recentPosts) {
    const structuredData = structuredDataMarkup.createHomepageData();
    const head = createHead({
        pageTitle: utils.siteContent.siteName,
        pageDescription: utils.siteContent.secondaryIntroduction,
        pageType: utils.PAGE_TYPES.HOMEPAGE,
        relativeUrl: null,
        relativeImage: null,
        structuredData,
    });

    const pageTrackHashPath = utils.getHashPath(`/${utils.JS_FOLDER}/pageTrack.js`);
    return `${head}
    <body>
        ${createHeader()}
        <main>
            ${createSiteWelcome()}
            ${createPostCards(recentPosts, true)}
        </main>
        ${footerHandler.createFooter()}
        ${utils.siteConfig.enableVisitCounter ? `<script src="${pageTrackHashPath}"></script>` : ''}
    </body>
</html>`;
}

module.exports = generateHomepage;
