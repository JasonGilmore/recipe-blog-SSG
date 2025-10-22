const siteContent = require('./siteContent.json');

function createSiteWelcome() {
    return `
    <div class="intro">
        <div class="intro-image">
            <img src="./images/site-assets/${siteContent.mainImage}" alt="" />
        </div>
        <h1 class="intro-text-header">${siteContent.mainIntroduction}</h1>
        <h2 class="intro-text">${siteContent.secondaryIntroduction}</h2>
    </div>
    `;
}

module.exports = createSiteWelcome;
