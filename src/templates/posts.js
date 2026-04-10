const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const utils = require('../utils.js');
const createHeader = require('./header.js');
const templateHelper = require('./templateHelper.js');
const footerHandler = require('./footer.js');

function createPost(postTypeConfig, postHtml, postAttributes, postTypeDirectoryName, postName) {
    const postDirectory = `/${postTypeDirectoryName}/${postName}`;
    const structuredData = structuredDataMarkup.createPostData(postTypeConfig, postAttributes, postDirectory);
    const head = createHead({
        pageTitle: postAttributes.title,
        pageDescription: postAttributes.description,
        pageType: utils.PAGE_TYPES.POST,
        relativeUrl: postDirectory,
        relativeImage: `${postDirectory}/${postAttributes.image}`,
        structuredData,
    });

    return `
        ${head}
        <body>
            ${createHeader()}
            <main>
                <div class="content-page-container">
                    ${postHtml}

                    <button id="jumpToTop" type="button" class="flex-centre" aria-label="Go to top" title="Go to top">
                        ${templateHelper.getUpArrow()}
                    </button>

                </div>
            </main>
            ${footerHandler.createFooter()}
        </body>

    </html>
`;
}

module.exports = createPost;
