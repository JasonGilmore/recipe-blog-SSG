const templateUtils = require('../utils.js');

function createPostCards(posts, shouldShowType) {
    return `
    <div class="post-container">

        ${posts.map((post) => createPostCard(post, shouldShowType)).join(' ')}

    </div>
    `;
}

function createPostCard(post, shouldShowType) {
    let type = templateUtils.removeLastS(post.typeToDisplay);
    return `
        <a href="${post.contentFolder}/${post.filename}">
            <article class="post">
                ${shouldShowType ? `<div class="typeIcon">${type.toLowerCase()}</div>` : ''}
                <img src="./${post.contentFolder}/${post.filename}/${post.image}" alt="" />
                <p class="post-title">${post.title}</p>
                <p class="post-description">${post.description}</p>
            </article>
        </a>
    `;
}

module.exports = createPostCards;
