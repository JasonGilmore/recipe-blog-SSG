const path = require('path');
const srcUtils = require('../src/utils.js');
const contentTypes = Object.keys(srcUtils.siteConfig.content);

// Parse a request path to determine content details
// When "/recipes/bread" contentType is "recipes" and postName is "bread"
function parseContentRequest(reqPath) {
    const noExt = !path.extname(reqPath);
    let isContentItem = false;
    let matchedContentType;
    let postName;

    isContent = contentTypes.some((contentType) => {
        if (reqPath.startsWith(`/${contentType}`)) {
            matchedContentType = contentType;
            return true;
        }
        return false;
    });

    const reqParts = reqPath.split('/').filter(Boolean);
    if (noExt && isContent && reqParts.length > 1) {
        postName = reqParts[reqParts.length - 1];
        isContentItem = true;
    }

    return { isContentItem, matchedContentType, postName };
}

module.exports = {
    parseContentRequest,
};
