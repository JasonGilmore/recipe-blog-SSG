const config = require('../src/config.json');
const siteContent = require('./siteContent.json');
const fs = require('fs');
const path = require('path');
const createNavbar = require('./navbar.js');
const createSiteWelcome = require('./siteWelcome.js');
const createPosts = require('./posts.js');

function generateHomepage(posts) {
    const OUTPUT_DIRECTORY = path.join(__dirname, config.outputDirectory);
    fs.writeFileSync(path.join(OUTPUT_DIRECTORY, '/index.html'), createHomepage(posts), 'utf8');
}

function createHomepage(posts) {
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
        </head>

        <body>

        ${createNavbar()}

            <main>
                
                ${createSiteWelcome()}

                ${createPosts(posts)}
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
