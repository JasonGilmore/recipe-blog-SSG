const utils = require('../utils.js');

function createHeader() {
    const postTypeInfo = [];
    Object.entries(utils.siteConfig.postTypes).forEach(([key, value]) => {
        postTypeInfo.push(value);
    });

    let siteTitleBlock = `<a href="/" class="site-title-block">${
        utils.siteContent.siteIcon ? `<img fetchpriority="high" src="${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.siteIcon}" alt="" />` : ''
    }<h1>${utils.siteContent.siteName}</h1></a>`;

    let topLevelLinks = `${postTypeInfo.map((postType) => `<a href="/${postType.postTypeDirectory}/" class="top-level-links">${postType.postTypeDisplayName}</a>`).join(' ')}`;

    return `<header class="site-header">
            <div class="header-wide-grouping">
                <!-- Header full width for medium and large devices -->
                ${siteTitleBlock}
                <nav class="header-wide-nav">${topLevelLinks}</nav>
            </div>
            <div class="header-small-grouping">
            <!-- Header burger mode for small devices -->
                <div class="header-small-heading">
                    ${siteTitleBlock}
                    <div class="burger-container" tabindex="0" role="button" aria-label="Open menu" aria-expanded="false">
                        <div class="bar1"></div>
                        <div class="bar2"></div>
                        <div class="bar3"></div>
                    </div>
                </div>
                <div class="header-small-links">
                    <nav class="header-small-nav">${topLevelLinks}</nav>
                </div>
            </div>
        </header>
`;
}

module.exports = createHeader;
