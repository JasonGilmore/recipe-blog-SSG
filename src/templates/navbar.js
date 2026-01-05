const utils = require('../utils.js');

function createNavbar() {
    const postTypeInfo = [];
    Object.entries(utils.siteConfig.postTypes).forEach(([key, value]) => {
        postTypeInfo.push(value);
    });

    return `<nav class="nav-bar">
            <div class="navbar-wide-grouping">
                <!-- Nav bar full width for medium and large devices -->
                <a href="/" class="website-name">${utils.siteContent.siteName}</a>
                ${postTypeInfo.map((postType) => `<a href="/${postType.postTypeDirectory}/">${postType.postTypeDisplayName}</a>`).join(' ')}
            </div>
            <div class="navbar-small-grouping">
            <!-- Nav bar burger mode for small devices -->
                <div class="navbar-small-heading">
                    <div class="burger-container" tabindex="0" role="button" aria-label="Open menu" aria-expanded="false">
                        <div class="bar1"></div>
                        <div class="bar2"></div>
                        <div class="bar3"></div>
                    </div>
                    <a href="/" class="website-name">${utils.siteContent.siteName}</a>
                </div>
                <div class="navbar-small-links">
                    ${postTypeInfo.map((postType) => `<a href="/${postType.postTypeDirectory}/">${postType.postTypeDisplayName}</a>`).join(' ')}
                </div>
            </div>
        </nav>
`;
}

module.exports = createNavbar;
