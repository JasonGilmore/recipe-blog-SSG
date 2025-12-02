const siteContent = require('./siteContent.json');
const utils = require('../utils.js');

function createSiteWelcome() {
    return `<div class="intro">
                <div class="intro-image">
                    <img loading="lazy" src="${utils.IMAGE_ASSETS_FOLDER}/${siteContent.mainImage}" alt="" />
                </div>
                <div class="intro-text-container">
                    <h1 class="intro-text-title">${siteContent.mainIntroduction}</h1>
                    <h2 class="intro-text-sub-title">${siteContent.secondaryIntroduction}</h2>
                </div>
            </div>`;
}

module.exports = createSiteWelcome;
