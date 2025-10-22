const config = require('../config.json');
const siteContent = require('./siteContent.json');

function createNavbar() {
    // Add content type info into an array so it can be looped while generating the navbar
    const contentTypes = [];
    Object.entries(config.content).forEach(([key, value]) => {
        contentTypes.push(value);
    });

    return `<nav class="nav-bar">
                <div class="navbar-wide-grouping">
                    <!-- Nav bar full width for medium and large devices -->
                    <a href="/" class="website-name">${siteContent.siteName}</a>
                    ${contentTypes.map((contentType) => `<a href="${contentType.contentFolder}.html">${contentType.contentName}</a>`).join(' ')}
                </div>
                <div class="navbar-small-grouping">
                    <div class="navbar-small-heading">
                        <!-- Nav bar burger mode for small devices -->
                        <div class="burger-container" onclick="toggleBurger()">
                            <div class="bar1"></div>
                            <div class="bar2"></div>
                            <div class="bar3"></div>
                        </div>
                        <a href="/" class="website-name">${siteContent.siteName}</a>
                    </div>
                    <div class="navbar-small-links">
                        ${contentTypes.map((contentType) => `<a href="${contentType.contentFolder}.html">${contentType.contentName}</a>`).join(' ')}
                    </div>
                </div>

                <script>
                    function toggleBurger() {
                        let burgerContainer = document.querySelector('.burger-container');
                        let navbarLinks = document.querySelector('.navbar-small-links');
                        burgerContainer.classList.toggle('burger-select');
                        navbarLinks.classList.toggle('navbar-small-links-active');
                    }
                </script>

            </nav>`;
}

module.exports = createNavbar;
