const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const footerHandler = require('./footer.js');
const utils = require('../utils.js');

function createPost(postContent) {
    return `
        ${createHead()}
        <body>
            ${createNavbar()}
            <main>
                <div class="content-page-container">
                    ${postContent}
                </div>
            </main>
            ${footerHandler.createFooter()}
        </body>

    </html>
`;
}

module.exports = createPost;
