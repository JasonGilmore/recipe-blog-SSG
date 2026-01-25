const utils = require('../utils.js');

function createPostCards(posts, isHomePage, titleType) {
    const validTitleTypes = ['h1', 'h2', 'h3'];
    const titleTag = validTitleTypes.includes(titleType) ? titleType : 'h2';

    return `
        <div class="post-thumbnail-container">
            ${posts.map((post) => createPostCard(post, isHomePage, titleTag)).join(' ')}
        </div>
    `;
}

function createPostCard(post, isHomePage, titleTag) {
    const postTypeConfig = utils.getPostTypeConfig(post.postType);
    const type = utils.removeLastS(postTypeConfig.postTypeDisplayName).toLowerCase();

    return `
            <a href="${post.link}">
                <article class="post-thumbnail">
                    ${isHomePage ? `<div class="type-icon">${type}</div>` : ''}
                    <img src="${post.imageHashPath}" alt="" />
                    <${titleTag} class="post-thumbnail-title">${post.title}</${titleTag}>
                    <p class="post-thumbnail-description">${post.description}</p>
                </article>
            </a>
    `;
}

module.exports = createPostCards;
