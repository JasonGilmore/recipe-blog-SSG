const utils = require('../utils.js');
const siteContent = require('./siteContent.json');

function createNavbar() {
    // Add content type info into an array so it can be looped while generating the navbar
    const contentTypes = [];
    Object.entries(utils.siteConfig.content).forEach(([key, value]) => {
        contentTypes.push(value);
    });

    return `<nav class="nav-bar">
            <div class="navbar-wide-grouping">
                <!-- Nav bar full width for medium and large devices -->
                <a href="/" class="website-name">${siteContent.siteName}</a>
                ${contentTypes.map((contentType) => `<a href="/${contentType.contentFolder}">${contentType.contentName}</a>`).join(' ')}
            </div>
            <div class="navbar-small-grouping">
            <!-- Nav bar burger mode for small devices -->
                <div class="navbar-small-heading">
                    <div class="burger-container" tabindex="0" role="button" aria-label="Open menu" aria-expanded="false">
                        <div class="bar1"></div>
                        <div class="bar2"></div>
                        <div class="bar3"></div>
                    </div>
                    <a href="/" class="website-name">${siteContent.siteName}</a>
                </div>
                <div class="navbar-small-links">
                    ${contentTypes.map((contentType) => `<a href="/${contentType.contentFolder}">${contentType.contentName}</a>`).join(' ')}
                </div>
            </div>
        </nav>
`;
}

module.exports = createNavbar;
