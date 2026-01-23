const utils = require('../utils.js');
const templateHelper = require('./templateHelper.js');

function createHeader() {
    const isSearchEnabled = utils.isFeatureEnabled('enableSearch');
    const postTypeInfo = [];
    Object.entries(utils.siteConfig.postTypes).forEach(([key, value]) => {
        postTypeInfo.push(value);
    });

    const siteIconHashPath = utils.siteContent.siteIcon ? utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.siteIcon}`) : '';
    const siteIconHtml = siteIconHashPath ? `<img fetchpriority="high" src="${siteIconHashPath}" alt="" />` : '';
    const siteTitleBlock = `<a href="/" class="site-title-block">${siteIconHtml}<div>${utils.siteContent.siteName}</div></a>`;
    let topLevelLinks = `${postTypeInfo.map((postType) => `<a href="/${postType.postTypeDirectory}/" class="top-level-links">${postType.postTypeDisplayName}</a>`).join(' ')}`;
    if (isSearchEnabled) {
        topLevelLinks = topLevelLinks + `<button type="button" class="top-level-links search-button">${templateHelper.getSearchIcon()} Search</button>`;
    }

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
        ${isSearchEnabled ? generateSearch() : ''}
`;
}

function generateSearch() {
    return `<dialog class="search-dialog" closedby="any">
                <div class="search-container">
                    <div class="search-header">
                        <input type="search" class="search-input" autocomplete="off" autofocus></input>
                        <div class="close-search" tabindex="0" title="Close" role="button" aria-label="Close search">
                            <div class="bar1"></div>
                            <div class="bar2"></div>
                        </div>
                    </div>
                    <div class="search-results"></div>
                </div>
            </dialog>`;
}

module.exports = createHeader;
