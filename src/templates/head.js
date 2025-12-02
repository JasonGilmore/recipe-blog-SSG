const siteContent = require('./siteContent.json');
const utils = require('../utils.js');

function createHead(pageTitle, appendSiteName = false, pageDescription) {
    const title = appendSiteName ? `${pageTitle} | ${siteContent.siteName}` : pageTitle;
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${pageDescription ? `<meta name="description" content="${pageDescription}" />` : ''}
        <link rel="icon" type="image/x-icon" href="${utils.IMAGE_ASSETS_FOLDER}/favicon.ico" />
        <link rel="stylesheet" href="/css/main.css" />
        ${`<script src=/${utils.JS_FOLDER}/navbar.js></script>`}
    </head>
    `;
}

module.exports = createHead;
