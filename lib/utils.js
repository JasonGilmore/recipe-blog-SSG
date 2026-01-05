const path = require('node:path');
const srcUtils = require('../src/utils.js');

const postTypes = Object.keys(srcUtils.siteConfig.postTypes);

// Parse a request path to determine post details
// When "/recipes/bread" post type is "recipes" and post name is "bread"
// Note that post type will be matched on site header pages like /recipes, so also check isPost
function parsePostRequest(reqPath) {
    const noExt = !path.extname(reqPath);
    let isPost = false;
    let matchedPostType;
    let postName;

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
    }

    return { isPost, matchedPostType, postName };
}

module.exports = {
    parsePostRequest,
};
