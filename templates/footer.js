const config = require('../src/config.json');
const utils = require('../src/utils.js');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');

let footerItems = [];

function generateFooter() {
    const FOOTER_DIRECTORY = utils.FOOTER_DIRECTORY;
    const footerOutputDirectory = path.join(__dirname, config.outputDirectory, 'footers');
    utils.prepareDirectory(footerOutputDirectory);
    const footerFiles = fs.readdirSync(FOOTER_DIRECTORY, 'utf8').filter((file) => path.extname(file).toLowerCase() === '.md');
    for (footerFile of footerFiles) {
        const fileName = footerFile.slice(0, -3);
        const footerContent = fs.readFileSync(path.join(FOOTER_DIRECTORY, footerFile), 'utf8');
        const content = fm(footerContent);
        const htmlContent = marked.parse(content.body);
        let generatedFooterLocation = path.join(footerOutputDirectory, fileName + '.html');
        fs.writeFileSync(generatedFooterLocation, htmlContent, 'utf8');
        footerItems.push({ location: generatedFooterLocation, displayName: content.attributes.displayName, order: content.attributes.order });
    }
}

function createFooter() {
    if (!footerItems) {
        throw new Error(`No footer content available. Call generateFooter first.`);
    }

    footerItems.sort((a, b) => a.order - b.order);

    return `
        <hr />
        <footer class="footer">
            ${footerItems.map((footerItem) => `<a href="${footerItem.location}">${footerItem.displayName}</a>`).join(' ')}
        </footer>
    `;
}

module.exports = { generateFooter, createFooter };
