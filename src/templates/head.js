const utils = require('../utils.js');

function createHead({ pageTitle, pageDescription, pageType, relativeUrl, relativeImage }) {
    const heroImageOgUrl = utils.siteContent.siteUrl + '/images/site-assets/' + utils.siteContent.heroImageSmall;

    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${pageTitle}</title>
        ${pageDescription ? `<meta name="description" content="${pageDescription}" />` : ''}

        <meta property="og:title" content="${pageTitle}" />
        <meta property="og:site_name" content="${utils.siteContent.siteName}" />
        <meta property="og:type" content="${pageType}" />
        <meta property="og:image" content="${relativeImage ? utils.siteContent.siteUrl + relativeImage : heroImageOgUrl}" />
        <meta property="og:url" content="${utils.siteContent.siteUrl + (relativeUrl ? relativeUrl : '')}" />
        ${pageDescription ? `<meta property="og:description" content="${pageDescription}" />` : ''}

        <link rel="icon" type="image/x-icon" href="${utils.IMAGE_ASSETS_FOLDER}/favicon.ico" />
        <link rel="stylesheet" href="/css/main.css" />
        ${`<script src=/${utils.JS_FOLDER}/navbar.js></script>`}
    </head>
    `;
}

module.exports = createHead;
