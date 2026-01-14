const utils = require('../utils.js');

function createSiteWelcome() {
    const heroImageHashPath = utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.heroImage}`);

    return `<div class="intro">
                <div class="intro-image">
                    <img fetchpriority="high" src="${heroImageHashPath}" alt="${utils.siteContent.heroImageAlt}" />
                </div>
                <div class="intro-text-container">
                    <h1 class="intro-text-title">${utils.siteContent.mainIntroduction}</h1>
                    <h2 class="intro-text-sub-title">${utils.siteContent.secondaryIntroduction}</h2>
                </div>
            </div>`;
}

module.exports = createSiteWelcome;
