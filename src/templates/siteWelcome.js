const utils = require('../utils.js');

function createSiteWelcome() {
    return `<div class="intro">
                <div class="intro-image">
                    <img loading="lazy" src="${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.heroImage}" alt="" />
                </div>
                <div class="intro-text-container">
                    <h1 class="intro-text-title">${utils.siteContent.mainIntroduction}</h1>
                    <h2 class="intro-text-sub-title">${utils.siteContent.secondaryIntroduction}</h2>
                </div>
            </div>`;
}

module.exports = createSiteWelcome;
