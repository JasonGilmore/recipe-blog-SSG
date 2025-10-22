const createHead = require('./head.js');
const createNavbar = require('./navbar.js');
const footerHandler = require('./footer.js');

function createPost(postContent) {
    return `
        ${createHead()}
        <body>
            ${createNavbar()}
            <main>
                ${postContent}
            </main>
            ${footerHandler.createFooter()}
        </body>

    </html>
`;
}

module.exports = createPost;
