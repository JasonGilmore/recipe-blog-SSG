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
                <nav class="header-wide-nav" aria-label="Main menu">${topLevelLinks}</nav>
            </div>
            <div class="header-small-grouping">
            <!-- Header burger mode for small devices -->
                <div class="header-small-heading">
                    ${siteTitleBlock}
                    <button type="button" class="burger-container" aria-label="Open menu" aria-expanded="false">
                        <span class="bar1"></span>
                        <span class="bar2"></span>
                        <span class="bar3"></span>
                    </button>
                </div>
                <div class="header-small-links">
                    <nav class="header-small-nav" aria-label="Mobile menu">${topLevelLinks}</nav>
                </div>
            </div>
        </header>
        ${isSearchEnabled ? generateSearch() : ''}`;
}

function generateSearch() {
    return `<dialog id="search-dialog" class="search-dialog" closedby="any">
                <div class="search-container">
                    <div class="search-header">
                        <input id="search-input" type="search" class="search-input" autocomplete="off" autofocus aria-label="Enter search term" aria-controls="searchResults">
                        <button type="button" class="close-search" title="Close" aria-label="Close search">
                            <span class="bar1"></span>
                            <span class="bar2"></span>
                        </button>
                    </div>
                    <div id="searchResults" class="search-results" role="region" aria-label="Search results"></div>
                </div>
            </dialog>`;
}

module.exports = createHeader;
