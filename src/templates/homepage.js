const fs = require('node:fs');
const path = require('node:path');
const utils = require('../utils.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createHeader = require('./header.js');
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
    const heroImageHashPath = utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.heroImage}`);

    return `${head}
    <body>
        ${createHeader()}
        <main>
            <div class="page-intro">
                <div class="page-intro-image">
                    <img fetchpriority="high" src="${heroImageHashPath}" alt="${utils.siteContent.heroImageAlt}" />
                </div>
                <div class="page-intro-text-container">
                    <h1 class="page-intro-title">${utils.siteContent.mainIntroduction}</h1>
                    <h2 class="page-intro-secondary-title">${utils.siteContent.secondaryIntroduction}</h2>
                </div>
            </div>
            ${createPostCards(recentPosts, true, 'h3')}
        </main>
        ${footerHandler.createFooter()}
        ${utils.siteConfig.enableVisitCounter ? `<script src="${pageTrackHashPath}"></script>` : ''}
    </body>
</html>`;
}

module.exports = generateHomepage;
