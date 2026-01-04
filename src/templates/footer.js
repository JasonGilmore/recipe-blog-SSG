const utils = require('../utils.js');
const fs = require('node:fs');
const path = require('node:path');
const marked = require('marked');
const fm = require('front-matter');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');

let footerItems = [];

function generateFooters() {
    // Footers are optional, if no footer directory, skip generation
    if (!fs.existsSync(utils.FOOTER_DIRECTORY)) {
        console.log(`Footers not found and footer will not be generated on the site. Ignore if not required.`);
        return;
    }

    const footerFiles = fs.readdirSync(utils.FOOTER_DIRECTORY, 'utf8').filter((file) => path.extname(file).toLowerCase() === '.md');
    let footersToGenerate = [];

    for (footerFile of footerFiles) {
        const fileName = footerFile.slice(0, -3);
        const footerContent = fs.readFileSync(path.join(utils.FOOTER_DIRECTORY, footerFile), 'utf8');
        const content = fm(footerContent);
        const htmlContent = marked.parse(content.body);
        let generatedFooterLocation = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, fileName + '.html');
        // Create the files after the loop is completed, so the footer pages can have the footer added using footerItems
        const displayName = content.attributes.displayName;
        footersToGenerate.push({ fileLocation: generatedFooterLocation, content: htmlContent, displayName: displayName, fileName: fileName });
        footerItems.push({ location: '/' + fileName, displayName: displayName, order: content.attributes.order });
    }

    for (footer of footersToGenerate) {
        fs.writeFileSync(footer.fileLocation, addSiteToFooterPage(footer.content, footer.displayName, footer.fileName), 'utf8');
    }
}

function addSiteToFooterPage(footerHtmlContent, footerDisplayName, fileName) {
    const head = createHead({
        pageTitle: `${footerDisplayName} | ${utils.siteContent.siteName}`,
        pageDescription: null,
        pageType: 'article',
        relativeUrl: `/${fileName}`,
        relativeImage: null,
    });

    return `${head}
    <body>
        ${createNavbar()}
        <main>
            <div class="content-page-container break-word">
                ${footerHtmlContent}
            </div>
        </main>
        ${createFooter()}
    </body>

</html>
`;
}

// Call "generateFooters" first so footerItems are created
function createFooter() {
    if (!footerItems.length) {
        return '';
    }

    footerItems.sort((a, b) => a.order - b.order);

    return `
        <footer>
            <hr />
            <div class="footer-item-container">
                ${footerItems.map((footerItem) => `<a href="${footerItem.location}">${footerItem.displayName}</a>`).join(' ')}
            </div>
        </footer>
    `;
}

module.exports = { generateFooters, createFooter };
