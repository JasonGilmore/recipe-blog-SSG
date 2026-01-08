const path = require('node:path');
const srcUtils = require('../src/utils.js');

const postTypes = Object.keys(srcUtils.siteConfig.postTypes);

// Parse a request path to determine details
// When "/recipes/bread" matchedPostType is "recipes" and postName is "bread"
// Note that matchedPostType will be matched on top-level pages like /recipes/, so also check isPost
function parseRequest(reqPath) {
    const noExt = !path.extname(reqPath);
    let isPost = false;
    let matchedPostType;
    let postName;
    let isCanonicalPostPath = false;

    const isPostType = postTypes.some((postType) => {
        if (reqPath.startsWith(`/${postType}`)) {
            matchedPostType = postType;
            return true;
        }
        return false;
    });

    const reqParts = reqPath.split('/').filter(Boolean);
    if (noExt && isPostType && reqParts.length > 1) {
        const item = reqParts[reqParts.length - 1];
        if (item != null) {
            postName = item;
            isPost = true;
        }
        if (reqParts.length === 2) {
            isCanonicalPostPath = true;
        }
    }

    return { isPost, matchedPostType, postName, isCanonicalPostPath };
}

module.exports = {
    parseRequest,
};
