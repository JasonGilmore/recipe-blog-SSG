const createHead = require('./head.js');
const utils = require('../utils.js');
const createNavbar = require('./navbar.js');
const footerHandler = require('./footer.js');

function createPost(postHtml, postAttributes, postTypeDirectoryName, postName) {
    const postDirectory = `/${postTypeDirectoryName}/${postName}`;
    const head = createHead({
        pageTitle: `${postAttributes.title} | ${utils.siteContent.siteName}`,
        pageDescription: postAttributes.description,
        pageType: 'article',
        relativeUrl: postDirectory,
        relativeImage: `${postDirectory}/${postAttributes.image}`,
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
            ${utils.siteConfig.enableVisitCounter ? `<script src=/${utils.JS_FOLDER}/postTrack.js></script>` : ''}
            <script src=/${utils.JS_FOLDER}/posts.js></script>
        </body>

    </html>
`;
}

module.exports = createPost;
