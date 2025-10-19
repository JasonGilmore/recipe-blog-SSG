function createPosts(posts, shouldShowType) {
    return `
    <div class="post-container">

        ${posts.map((post) => createPost(post, shouldShowType)).join(' ')}

    </div>
    `;
}

function createPost(post, shouldShowType) {
    const postType = post.type;
    // Remove last "s" if present
    let type = postType.lastIndexOf('s') === postType.length - 1 ? postType.slice(0, postType.length - 1) : postType;
    return `
        <a href="${post.filename}">
            <article class="post">
                ${shouldShowType ? `<div class="typeIcon">${type}</div>` : ''}
                <img src="./${post.type}/${post.filename}/${post.image}" alt="" />
                <p class="post-title">${post.title}</p>
                <p class="post-description">${post.description}</p>
            </article>
        </a>
    `;
}

module.exports = createPosts;
