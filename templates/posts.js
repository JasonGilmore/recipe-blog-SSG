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
                <img src="" alt="" />
                <p>${post.title}</p>
            </article>
        </a>
    `;
}

module.exports = createPosts;
