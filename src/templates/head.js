const siteContent = require('./siteContent.json');
const utils = require('../utils.js');

function createHead(pageTitle, appendSiteName, pageDescription, pageType, relativeUrl, relativeImage) {
    const siteName = siteContent.siteName;
    const title = appendSiteName ? `${pageTitle} | ${siteName}` : pageTitle;
    const heroImageUrl = siteContent.siteUrl + '/images/site-assets/' + siteContent.heroImage;

    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${pageDescription ? `<meta name="description" content="${pageDescription}" />` : ''}

        <meta property="og:title" content="${title}" />
        <meta property="og:site_name" content="${siteName}" />
        <meta property="og:type" content="${pageType}" />
        <meta property="og:image" content="${relativeImage ? siteContent.siteUrl + relativeImage : heroImageUrl}" />
        <meta property="og:url" content="${siteContent.siteUrl + (relativeUrl ? relativeUrl : '')}" />
        ${pageDescription ? `<meta property="og:description" content="${pageDescription}" />` : ''}


        <link rel="icon" type="image/x-icon" href="${utils.IMAGE_ASSETS_FOLDER}/favicon.ico" />
        <link rel="stylesheet" href="/css/main.css" />
        ${`<script src=/${utils.JS_FOLDER}/navbar.js></script>`}
    </head>
    `;
}

module.exports = createHead;
