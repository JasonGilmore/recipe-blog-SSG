// Generates structured data markup in JSON-LD format
const utils = require('../utils.js');
const SCHEMA_CONTEXT = '@context": "https://schema.org/';
const WEBSITE_ID = utils.siteContent.siteUrl + '/#website';

function createHomepageData() {
    return `<script type="application/ld+json">
    {
        "${SCHEMA_CONTEXT}",
        "@graph": [
            {
                "@type": "WebPage",
                "url": "${utils.siteContent.siteUrl}",
                "name": "${utils.siteContent.siteName}",
                "description": "${utils.siteContent.secondaryIntroduction}",
                "isPartOf": {
                    "@type": "WebSite",
                    "@id": "${WEBSITE_ID}"
                }
            },
            {
                "@type": "WebSite",
                "@id": "${WEBSITE_ID}",
                "url": "${utils.siteContent.siteUrl}",
                "name": "${utils.siteContent.siteName}",
                "description": "${utils.siteContent.secondaryIntroduction}"
            }
            
        ]
    }</script>`;
}

function createTopLevelData(postTypeConfig) {
    return `<script type="application/ld+json">
    {
        "${SCHEMA_CONTEXT}",
        "@graph": [
            {
                "@type": "WebPage",
                "url": "${utils.siteContent.siteUrl}/${postTypeConfig.postTypeDirectory}/",
                "name": "${postTypeConfig.postTypeDisplayName}",
                "isPartOf": {
                    "@type": "WebSite",
                    "@id": "${WEBSITE_ID}"
                }
            },
            ${getOneLevelBreadcrumbs(postTypeConfig.postTypeDisplayName, '/' + postTypeConfig.postTypeDirectory + '/')}
        ]
    }</script>`;
}

function createPostData(postTypeConfig, postAttributes, relativePostFolderPath) {
    const structuredDataType = postTypeConfig.structuredDataContentType;
    const imageHashPath = utils.siteContent.siteUrl + utils.getHashPath(`${relativePostFolderPath}/${postAttributes.image}`);
    const parentDirectory = `/${postTypeConfig.postTypeDirectory}/`;
    let mainEntityData = null;

    switch (structuredDataType) {
        case 'Recipe':
            mainEntityData = getRecipeData(parentDirectory, postAttributes, imageHashPath);
            break;
        case 'BlogPosting':
            mainEntityData = getBlogData(parentDirectory, postAttributes, imageHashPath);
            break;
        default:
            mainEntityData = getGenericPostData(parentDirectory, postAttributes, imageHashPath);
    }

    return `<script type="application/ld+json">
    {
        "${SCHEMA_CONTEXT}",
        "@graph": [
            ${mainEntityData},
            ${getPostBreadcrumbs(postTypeConfig, postAttributes, relativePostFolderPath)}
        ]
    }</script>`;
}

function createGenericPageData(pageName, relativeUrl) {
    return `<script type="application/ld+json">
    {
        "${SCHEMA_CONTEXT}",
        "@graph": [
            {
                "@type": "WebPage",
                "url": "${utils.siteContent.siteUrl}${relativeUrl}",
                "name": "${pageName}",
                "isPartOf": {
                    "@type": "WebSite",
                    "@id": "${WEBSITE_ID}"
                }
            },
            ${getOneLevelBreadcrumbs(pageName, relativeUrl)}
        ]
    }</script>`;
}

function getRecipeData(parentDirectory, postAttributes, imageLocation) {
    return `{
            "@type": "Recipe",
            "name": "${postAttributes.title}",
            "image": "${imageLocation}",
            "datePublished": "${postAttributes.date.toISOString().split('T')[0]}",
            "description": "${postAttributes.description}",
            "keywords": "${postAttributes.keywords}",
            "isPartOf": [
                {
                    "@type": "WebPage",
                    "@id": "${utils.siteContent.siteUrl}${parentDirectory}"
                },
                {
                    "@type": "WebSite",
                    "@id": "${WEBSITE_ID}"
                }
            ]
        }`;
}

function getBlogData(parentDirectory, postAttributes, imageLocation) {
    return `{
            "@type": "BlogPosting",
            "name": "${postAttributes.title}",
            "headline": "${postAttributes.title}",
            "image": "${imageLocation}",
            "datePublished": "${postAttributes.date.toISOString()}",
            "description": "${postAttributes.description}",
            "keywords": "${postAttributes.keywords}",
            "isPartOf": [
                {
                    "@type": "WebPage",
                    "@id": "${utils.siteContent.siteUrl}${parentDirectory}"
                },
                {
                    "@type": "WebSite",
                    "@id": "${WEBSITE_ID}"
                }
            ]
        }`;
}

function getGenericPostData(parentDirectory, postAttributes, imageLocation) {
    return `{
            "@type": "Article",
            "name": "${postAttributes.title}",
            "image": "${imageLocation}",
            "datePublished": "${postAttributes.date.toISOString()}",
            "description": "${postAttributes.description}",
            "keywords": "${postAttributes.keywords}",
            "isPartOf": [
                {
                    "@type": "WebPage",
                    "@id": "${utils.siteContent.siteUrl}${parentDirectory}"
                },
                {
                    "@type": "WebSite",
                    "@id": "${WEBSITE_ID}"
                }
            ]
        }`;
}

function getPostBreadcrumbs(postTypeConfig, postAttributes, relativePostFolderPath) {
    return `{
            "@type": "BreadcrumbList",
            "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "${utils.siteContent.siteName}",
                "item": "${utils.siteContent.siteUrl}"
            }, {
                "@type": "ListItem",
                "position": 2,
                "name": "${postTypeConfig.postTypeDisplayName}",
                "item": "${utils.siteContent.siteUrl}/${postTypeConfig.postTypeDirectory}/"
            }, {
                "@type": "ListItem",
                "position": 3,
                "name": "${postAttributes.title}",
                "item": "${utils.siteContent.siteUrl}${relativePostFolderPath}"
            }]
        }`;
}

function getOneLevelBreadcrumbs(pageName, relativeUrl) {
    return `{
            "@type": "BreadcrumbList",
            "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "${utils.siteContent.siteName}",
                "item": "${utils.siteContent.siteUrl}"
            }, {
                "@type": "ListItem",
                "position": 2,
                "name": "${pageName}",
                "item": "${utils.siteContent.siteUrl}${relativeUrl}"
            }
    ]}`;
}

module.exports = {
    createHomepageData,
    createTopLevelData,
    createPostData,
    createGenericPageData,
};
