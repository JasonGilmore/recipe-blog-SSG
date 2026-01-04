const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const footerHandler = require('./footer.js');
const utils = require('../utils.js');

function createPost(postContent, postDisplayName, postDescription, postContentDirectory, postName, postImage) {
    const postDirectory = `/${postContentDirectory}/${postName}`;
    const head = createHead({
        pageTitle: `${postDisplayName} | ${utils.siteContent.siteName}`,
        pageDescription: postDescription,
        pageType: 'article',
        relativeUrl: postDirectory,
        relativeImage: `${postDirectory}/${postImage}`,
    });

    return `
        ${head}
        <body>
            ${createNavbar()}
            <main>
                <div class="content-page-container">
                    ${postContent}
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
