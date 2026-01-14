const utils = require('../utils.js');

function createPostCards(posts, isHomePage) {
    return `
        <div class="post-thumbnail-container">
            ${posts.map((post) => createPostCard(post, isHomePage)).join(' ')}
        </div>
    `;
}

function createPostCard(post, showPostType) {
    let type = utils.removeLastS(post.postTypeToDisplay);
    const imageHashPath = utils.getHashPath(`/${post.postTypeDirectoryName}/${post.filename}/${post.image}`);

    return `
            <a href="/${post.postTypeDirectoryName}/${post.filename}">
                <article class="post-thumbnail">
                    ${showPostType ? `<div class="type-icon">${type.toLowerCase()}</div>` : ''}
                    <img src="${imageHashPath}" alt="" />
                    <p class="post-thumbnail-title">${post.title}</p>
                    <p class="post-thumbnail-description">${post.description}</p>
                </article>
            </a>
    `;
}

module.exports = createPostCards;
