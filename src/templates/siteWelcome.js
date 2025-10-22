const siteContent = require('./siteContent.json');
const utils = require('../utils.js');

function createSiteWelcome() {
    return `
    <div class="intro">
        <div class="intro-image">
            <img src="${utils.IMAGE_ASSETS_FOLDER}/${siteContent.mainImage}" alt="" />
        </div>
        <h1 class="intro-text-header">${siteContent.mainIntroduction}</h1>
        <h2 class="intro-text">${siteContent.secondaryIntroduction}</h2>
    </div>
    `;
}

module.exports = createSiteWelcome;
