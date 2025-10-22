const utils = require('../utils.js');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');
const createHead = require('./head.js');
const createNavbar = require('./navbar.js');

let footerItems = [];

function generateFooters() {
    // Footers are optional, if no footer directory, skip generation
    if (!fs.existsSync(utils.FOOTER_DIRECTORY)) {
        console.log(`Footers not found and footer will not be generated. Ignore if not required.`);
        return;
    }

    utils.prepareDirectory(utils.FOOTER_OUTPUT_DIRECTORY);
    const footerFiles = fs.readdirSync(utils.FOOTER_DIRECTORY, 'utf8').filter((file) => path.extname(file).toLowerCase() === '.md');
    let footersToGenerate = [];

    for (footerFile of footerFiles) {
        const fileName = footerFile.slice(0, -3);
        const footerContent = fs.readFileSync(path.join(utils.FOOTER_DIRECTORY, footerFile), 'utf8');
        const content = fm(footerContent);
        const htmlContent = marked.parse(content.body);
        let generatedFooterLocation = path.join(utils.FOOTER_OUTPUT_DIRECTORY, fileName + '.html');
        // Create the files after the loop is completed, so the footer pages can have the footer added using footerItems
        footersToGenerate.push({ fileLocation: generatedFooterLocation, content: htmlContent });
        footerItems.push({ location: '/' + fileName, displayName: content.attributes.displayName, order: content.attributes.order });
    }

    for (footerToGenerate of footersToGenerate) {
        fs.writeFileSync(footerToGenerate.fileLocation, addSiteToFooterPage(footerToGenerate.content), 'utf8');
    }
}

function addSiteToFooterPage(footerHtmlContent) {
    return `
        ${createHead()}
        <body>
            ${createNavbar()}
            <main>
                ${footerHtmlContent}
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
        <hr />
        <footer class="footer">
            ${footerItems.map((footerItem) => `<a href="${footerItem.location}">${footerItem.displayName}</a>`).join(' ')}
        </footer>
    `;
}

module.exports = { generateFooters, createFooter };
