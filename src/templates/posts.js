const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const utils = require('../utils.js');
const createNavbar = require('./navbar.js');
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
            ${createNavbar()}
            <main>
                <div class="content-page-container">
                    ${postHtml}
                </div>
            </main>
            ${footerHandler.createFooter()}
            <script src=/${utils.JS_FOLDER}/posts.js${utils.getCacheBustQuery()}></script>
            ${utils.siteConfig.enableVisitCounter ? `<script src=/${utils.JS_FOLDER}/pageTrack.js${utils.getCacheBustQuery()}></script>` : ''}
        </body>

    </html>
`;
}

module.exports = createPost;
