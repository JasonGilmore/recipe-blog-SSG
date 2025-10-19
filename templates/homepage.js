const config = require('../src/config.json');
const siteContent = require('./siteContent.json');
const fs = require('fs');
const path = require('path');

function generateHomepage(posts) {
    // Add content type info into an array so it can be looped while generating the homepage
    const contentTypes = [];
    Object.entries(config.content).forEach(([key, value]) => {
        contentTypes.push(value);
    });

    const OUTPUT_DIRECTORY = path.join(__dirname, config.outputDirectory);
    fs.writeFileSync(path.join(OUTPUT_DIRECTORY, '/index.html'), createHomepage(posts, contentTypes), 'utf8');
}

function createHomepage(posts, contentTypes) {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <!-- TODO additional meta such as description -->
            <!-- TODO open graph data -->
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${siteContent.siteName}</title>
            <link rel="icon" type="image/x-icon" href="./cake.jpg" />
            <link rel="stylesheet" href="./css/main.css" />

            <script>
                function toggleBurger() {
                    let burgerContainer = document.querySelector('.burger-container');
                    let navbarLinks = document.querySelector('.navbar-small-links');
                    burgerContainer.classList.toggle('burger-select');
                    navbarLinks.classList.toggle('navbar-small-links-active');
                }
            </script>
        </head>

        <body>
            <nav class="nav-bar">
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
            </nav>

            <main>
                <div class="intro">
                    <div class="intro-image">
                        <img src="./images/site-assets/${siteContent.mainImage}" alt="" />
                    </div>
                    <h1 class="intro-text-header">${siteContent.mainIntroduction}</h1>
                    <h2 class="intro-text">${siteContent.secondaryIntroduction}</h2>
                </div>

                <div class="post-container">
                    <a href="#">
                        <article class="post">
                            <img src="cake.jpg" alt="" />
                            <p>Content</p>
                        </article>
                    </a>

                </div>
            </main>

            <hr />
            <footer class="footer">
                <a href="recipes.html">Disclaimer</a>
                <a href="recipes.html">Privacy Policy</a>
            </footer>
        </body>
    </html>
`;
}

module.exports = generateHomepage;
