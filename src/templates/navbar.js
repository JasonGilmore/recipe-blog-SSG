const utils = require('../utils.js');

function createNavbar() {
    const postTypeInfo = [];
    Object.entries(utils.siteConfig.postTypes).forEach(([key, value]) => {
        postTypeInfo.push(value);
    });

    let siteNameHeader = `<a href="/" class="name-header">${
        utils.siteContent.siteIcon ? `<img loading="lazy" src="${utils.IMAGE_ASSETS_FOLDER}/${utils.siteContent.siteIcon}" alt="" />` : ''
    }<h1>${utils.siteContent.siteName}</h1></a>`;

    let topLevelLinks = postTypeInfo.map((postType) => `<a href="/${postType.postTypeDirectory}/" class="top-level-links">${postType.postTypeDisplayName}</a>`).join(' ');

    return `<nav class="nav-bar">
            <div class="navbar-wide-grouping">
                <!-- Nav bar full width for medium and large devices -->
                ${siteNameHeader}
                ${topLevelLinks}
            </div>
            <div class="navbar-small-grouping">
            <!-- Nav bar burger mode for small devices -->
                <div class="navbar-small-heading">
                    ${siteNameHeader}
                    <div class="burger-container" tabindex="0" role="button" aria-label="Open menu" aria-expanded="false">
                        <div class="bar1"></div>
                        <div class="bar2"></div>
                        <div class="bar3"></div>
                    </div>
                </div>
                <div class="navbar-small-links">
                    ${topLevelLinks}
                </div>
            </div>
        </nav>
`;
}

module.exports = createNavbar;
