function createPosts(posts) {
    return `
    <div class="post-container">

        ${posts.map((post) => createPost(post)).join(' ')}

    </div>
    `;
}

function createPost(post) {
    return `
        <a href="${post.filename}">
            <article class="post">
                <img src="./${post.type}/${post.filename}/${post.image}" alt="" />
                <p class="post-title">${post.title}</p>
                <p class="post-description">${post.description}</p>
            </article>
        </a>
    `;
}

module.exports = createPosts;
