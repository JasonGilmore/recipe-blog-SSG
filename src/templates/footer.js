const fs = require('node:fs/promises');
const path = require('node:path');
const fm = require('front-matter');
const marked = require('marked');
const utils = require('../utils.js');
const { processHtml } = require('./templateHelper.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createHeader = require('./header.js');

let footerItems = [];

async function generateFooters() {
    // Footers are optional, if no footer directory skip generation
    if (!(await utils.dirExistsAsync(utils.FOOTER_DIR_PATH))) {
        console.log(`Footers not found and footer will not be generated on the site. Ignore if not required.`);
        return;
    }

    const footerFiles = (await fs.readdir(utils.FOOTER_DIR_PATH, 'utf8')).filter((file) => path.extname(file).toLowerCase() === '.md');
    let footersToGenerate = [];

    for (const footerFile of footerFiles) {
        const filename = footerFile.slice(0, -3);
        const footerContent = await fs.readFile(path.join(utils.FOOTER_DIR_PATH, footerFile), 'utf8');
        const content = fm(footerContent);
        const htmlContent = marked.parse(content.body);
        const footerOutputPath = path.join(utils.getOutputPath(), filename + '.html');

        // Create the files after the loop is completed, so the footer pages can have the footer added using footerItems
        const displayName = content.attributes.displayName;
        footersToGenerate.push({ footerOutputPath, content: htmlContent, displayName, filename });
        footerItems.push({ location: '/' + filename, displayName, order: content.attributes.order });
    }

    for (const footer of footersToGenerate) {
        const html = await processHtml(createFooterPage(footer.content, footer.displayName, footer.filename));
        await fs.writeFile(footer.footerOutputPath, html, 'utf8');
    }
}

function createFooterPage(footerHtmlContent, footerDisplayName, filename) {
    const relativeUrl = `/${filename}`;
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
