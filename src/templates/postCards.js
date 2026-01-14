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
    let type = utils.removeLastS(post.postTypeToDisplay);
    const imageHashPath = utils.getHashPath(`/${post.postTypeDirectoryName}/${post.filename}/${post.image}`);

    return `
            <a href="/${post.postTypeDirectoryName}/${post.filename}">
                <article class="post-thumbnail">
                    ${isHomePage ? `<div class="type-icon">${type.toLowerCase()}</div>` : ''}
                    <img src="${imageHashPath}" alt="" />
                    <${titleTag} class="post-thumbnail-title">${post.title}</${titleTag}>
                    <p class="post-thumbnail-description">${post.description}</p>
                </article>
            </a>
    `;
}

module.exports = createPostCards;
