const utils = require('../utils.js');

function createPostCards(posts, shouldShowType) {
    return `
        <div class="post-thumbnail-container">
            ${posts.map((post) => createPostCard(post, shouldShowType)).join(' ')}
        </div>
    `;
}

function createPostCard(post, isHomePage) {
    let type = utils.removeLastS(post.typeToDisplay);
    return `
            <a href="/${post.contentFolder}/${post.filename}">
                <article class="post-thumbnail">
                    ${isHomePage ? `<div class="typeIcon">${type.toLowerCase()}</div>` : ''}
                    <img loading="lazy" src="/${post.contentFolder}/${post.filename}/${post.image}" alt="" />
                    <p class="post-thumbnail-title">${post.title}</p>
                    <p class="post-thumbnail-description">${post.description}</p>
                </article>
            </a>
    `;
}

module.exports = createPostCards;
