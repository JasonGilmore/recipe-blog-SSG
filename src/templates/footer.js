const fs = require('node:fs');
const path = require('node:path');
const fm = require('front-matter');
const marked = require('marked');
const utils = require('../utils.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createHeader = require('./header.js');

let footerItems = [];

function generateFooters() {
    // Footers are optional, if no footer directory skip generation
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
        let footerOutputPath = path.join(utils.PUBLIC_OUTPUT_DIRECTORY, fileName + '.html');

        // Create the files after the loop is completed, so the footer pages can have the footer added using footerItems
        const displayName = content.attributes.displayName;
        footersToGenerate.push({ footerOutputPath, content: htmlContent, displayName, fileName });
        footerItems.push({ location: '/' + fileName, displayName, order: content.attributes.order });
    }

    for (footer of footersToGenerate) {
        fs.writeFileSync(footer.footerOutputPath, createFooterPage(footer.content, footer.displayName, footer.fileName), 'utf8');
    }
}

function createFooterPage(footerHtmlContent, footerDisplayName, fileName) {
    const relativeUrl = `/${fileName}`;
    const structuredData = structuredDataMarkup.createGenericPageData(footerDisplayName, relativeUrl);
    const head = createHead({
        pageTitle: footerDisplayName,
        pageDescription: null,
        pageType: utils.PAGE_TYPES.FOOTER,
        relativeUrl: relativeUrl,
        relativeImage: null,
        structuredData,
    });

    return `${head}
    <body>
        ${createHeader()}
        <main>
            <div class="footer-content-page-container break-word">
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
