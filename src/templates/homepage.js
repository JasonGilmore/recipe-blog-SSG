const fs = require('node:fs/promises');
const path = require('node:path');
const utils = require('../utils.js');
const { processHtml } = require('./templateHelper.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createHeader = require('./header.js');
const createPostCards = require('./postCards.js');
const footerHandler = require('./footer.js');

async function generateHomepage(allPostMeta) {
    const featuredPostsEnabled = utils.isFeatureEnabled('enableFeaturedPosts');
    const featuredPosts = featuredPostsEnabled ? utils.getFeaturedPosts(allPostMeta, utils.siteContent.featuredPostsCount) : [];
    const recentPostCandidates = featuredPostsEnabled ? allPostMeta.filter((post) => post.featured !== true) : allPostMeta;
    const recentPosts = utils.getRecentPosts(recentPostCandidates, utils.siteContent.recentPostsCount);
    const html = await processHtml(createHomepage(featuredPosts, recentPosts));
    await fs.writeFile(path.join(utils.getOutputPath(), '/index.html'), html, 'utf8');
}

function createHomepage(featuredPosts, recentPosts) {
    const structuredData = structuredDataMarkup.createHomepageData();
    const head = createHead({
        pageTitle: utils.siteContent.siteName,
        pageDescription: utils.siteContent.secondaryIntroduction,
        pageType: utils.PAGE_TYPES.HOMEPAGE,
        relativeUrl: null,
        relativeImage: null,
        structuredData,
    });

    const heroImageHashPath = utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.heroImage}`);
    const introImage = utils.siteContent.introImage;
    const introImageHashPath = utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.introImage}`);

    const featuredPostsEnabled = utils.isFeatureEnabled('enableFeaturedPosts');
    const featuredPostsSection = featuredPostsEnabled
        ? `${featuredPosts.length && utils.siteContent.featuredPostsMessage ? `<hr class="divide"> <h2 class="divide-text">${utils.siteContent.featuredPostsMessage}</h2>` : ''}
            ${featuredPosts.length ? createPostCards(featuredPosts, true, 'h3') : ''}`
        : '';
    const recentPostsSection = `${utils.siteContent.recentPostsMessage ? `<hr class="divide"> <h2 class="divide-text">${utils.siteContent.recentPostsMessage}</h2>` : ''}
            ${createPostCards(recentPosts, true, 'h3')}`;
    const postsSections = utils.siteContent.featuredPostsTop ? `${featuredPostsSection}${recentPostsSection}` : `${recentPostsSection}${featuredPostsSection}`;

    return `${head}
    <body class="homepage">
        ${createHeader()}
        <main>
            <div class="hero">
                <img fetchpriority="high" src="${heroImageHashPath}" alt="${utils.siteContent.heroImageAlt}" />
                <div class="hero-content">
                    <div class="hero-text-wrapper">
                        <h1 class="hero-title-text">${utils.replaceNewLinesWithBr(utils.siteContent.mainIntroduction)}</h1>
                    </div>
                </div>
            </div>
            <div class="page-intro-outer-section">
                <div class="page-intro-inner-flex">
                    <div class="page-intro-text-container">
                        <h2 class="page-intro-secondary-title">${utils.replaceNewLinesWithBr(utils.siteContent.secondaryIntroduction)}</h2>
                    </div>${
                        introImage
                            ? `<div class="page-intro-image-container">
                        <img src="${introImageHashPath}" alt="${utils.siteContent.introImageAlt}" />
                    </div>`
                            : ''
                    }
                </div>
            </div>
            ${postsSections}
        </main>
        ${footerHandler.createFooter()}
    </body>
</html>`;
}

module.exports = generateHomepage;
