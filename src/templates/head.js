const utils = require('../utils.js');

function createHead({ pageTitle, pageDescription, pageType, relativeUrl, relativeImage, structuredData }) {
    const contentType = getOgTypeForPage(pageType);
    const pageUrl = utils.siteContent.siteUrl + (relativeUrl ? relativeUrl : '');

    // Resolve hash asset paths
    const heroImageOgHashUrl = utils.siteContent.siteUrl + utils.getHashPath('/images/site-assets/' + utils.siteContent.heroImageSmall);
    const ogImageHashPath = utils.getHashPath(`${relativeImage ? utils.siteContent.siteUrl + utils.getHashPath(relativeImage) : heroImageOgHashUrl}`);
    const faviconHashPath = utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/favicon.ico`);
    const mainCssHashPath = utils.getHashPath('/css/main.css');
    const headerJsHashPath = utils.getHashPath(`/${utils.JS_FOLDER}/header.js`);
    const postCssHashPath = utils.getHashPath('/css/post.css');
    const searchJsHashPath = utils.getHashPath(`/${utils.JS_FOLDER}/search.js`);

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
        <meta property="og:image" content="${ogImageHashPath}" />
        <meta property="og:url" content="${pageUrl}" />
        ${pageDescription ? `<meta property="og:description" content="${pageDescription}" />` : ''}
        <link rel="canonical" href="${pageUrl}" />

        <link rel="icon" type="image/x-icon" href="${faviconHashPath}" />
        <link rel="stylesheet" href="${mainCssHashPath}" />
        <script src="${headerJsHashPath}"></script>
        ${pageType === utils.PAGE_TYPES.POST ? `<link rel="stylesheet" href="${postCssHashPath}" />` : ''}
        ${utils.isFeatureEnabled('enableSearch') ? `<script src="${searchJsHashPath}"></script>` : ''}

        ${structuredData ? structuredData : ''}
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
