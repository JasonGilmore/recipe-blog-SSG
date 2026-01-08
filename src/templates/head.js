const utils = require('../utils.js');

function createHead({ pageTitle, pageDescription, pageType, relativeUrl, relativeImage }) {
    const heroImageOgUrl = utils.siteContent.siteUrl + '/images/site-assets/' + utils.siteContent.heroImageSmall;
    const contentType = getOgTypeForPage(pageType);
    const pageUrl = utils.siteContent.siteUrl + (relativeUrl ? relativeUrl : '');

    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${pageTitle}</title>
        ${pageDescription ? `<meta name="description" content="${pageDescription}" />` : ''}

        <meta property="og:title" content="${pageTitle}" />
        <meta property="og:site_name" content="${utils.siteContent.siteName}" />
        <meta property="og:type" content="${contentType}" />
        <meta property="og:image" content="${relativeImage ? utils.siteContent.siteUrl + relativeImage : heroImageOgUrl}" />
        <meta property="og:url" content="${pageUrl}" />
        ${pageDescription ? `<meta property="og:description" content="${pageDescription}" />` : ''}
        <link rel="canonical" href="${pageUrl}" />

        <link rel="icon" type="image/x-icon" href="${utils.IMAGE_ASSETS_FOLDER}/favicon.ico" />
        <link rel="stylesheet" href="/css/main.css${utils.getCacheBustQuery()}" />
        <script src=/${utils.JS_FOLDER}/navbar.js${utils.getCacheBustQuery()}></script>
        ${pageType === utils.PAGE_TYPES.POST ? `<link rel="stylesheet" href="/css/post.css${utils.getCacheBustQuery()}" />` : ''}
    </head>
    `;
}

function getOgTypeForPage(pageType) {
    switch (pageType) {
        case utils.PAGE_TYPES.POST:
        case utils.PAGE_TYPES.FOOTER:
            return 'article';
        case utils.PAGE_TYPES.HOMEPAGE:
        case utils.PAGE_TYPES.TOP_LEVEL:
        default:
            return 'website';
    }
}

module.exports = createHead;
