const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const footerHandler = require('./footer.js');
const utils = require('../utils.js');

function createPost(postContent, postDisplayName, postDescription, postContentDirectory, postName, postImage) {
    const postDirectory = `/${postContentDirectory}/${postName}`;
    return `
        ${createHead(postDisplayName, true, postDescription, 'article', postDirectory, `${postDirectory}/${postImage}`)}
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
