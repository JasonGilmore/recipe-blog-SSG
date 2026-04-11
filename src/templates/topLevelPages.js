const path = require('node:path');
const fs = require('node:fs/promises');
const utils = require('../utils.js');
const templateHelper = require('./templateHelper.js');
const structuredDataMarkup = require('./structuredDataMarkup.js');
const createHead = require('./head.js');
const createHeader = require('./header.js');
const createPostCards = require('./postCards.js');
const footerHandler = require('./footer.js');

const maxPostsPerPage = Number(utils.siteContent.maxPostsPerPage) || 6;

async function generateTopLevelPages(allPostMeta) {
    for (const postType of Object.keys(utils.siteConfig.postTypes)) {
        await createTopLevelPages(postType, allPostMeta);
    }
}

// Create site pages for the post type
async function createTopLevelPages(postType, allPostMeta) {
    // Sort posts by created date descending for this post type
    let postMetaList = allPostMeta.filter((post) => postType === post.postType);
    postMetaList.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const postTypeConfig = utils.getPostTypeConfig(postType);

    // Split into pages and generate the HTML for each one
    const totalPages = Math.max(1, Math.ceil(postMetaList.length / maxPostsPerPage));
    for (let page = 1; page <= totalPages; page++) {
        const startIndex = (page - 1) * maxPostsPerPage;
        const pagePosts = postMetaList.slice(startIndex, startIndex + maxPostsPerPage);
        const pagination = { currentPage: page, totalPages, pagePosts };
        const html = await templateHelper.processHtml(createTopLevelPage(postType, pagination));

        // Save
        const pagePath =
            page === 1
                ? path.join(utils.getOutputPath(), postTypeConfig.postTypeDirectory, 'index.html')
                : path.join(utils.getOutputPath(), postTypeConfig.postTypeDirectory, 'page', String(page), 'index.html');
        await fs.mkdir(path.dirname(pagePath), { recursive: true });
        await fs.writeFile(pagePath, html, 'utf8');
    }
}

function createTopLevelPage(postType, pagination) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    const pageNumber = pagination.currentPage;
    // Top level description  may or may not exist
    const topLevelDescription = utils.siteContent[`${postType}Description`];

    const paginationHtml = createPaginationHtml(postTypeConfig, pagination);
    const structuredData = structuredDataMarkup.createTopLevelData(postTypeConfig, topLevelDescription, pageNumber);
    const head = createHead({
        pageTitle: postTypeConfig.postTypeDisplayName,
        pageDescription: topLevelDescription ? topLevelDescription : null,
        pageType: utils.PAGE_TYPES.TOP_LEVEL,
        relativeUrl: utils.getTopLevelPageUrl(postTypeConfig.postTypeDirectory, pageNumber),
        relativeImage: null,
        structuredData,
    });

    return `
        ${head}
        <body>
            ${createHeader()}
            <main>
                ${getPageIntro(pagination, postType, topLevelDescription)}
                ${createPostCards(pagination.pagePosts, false, topLevelDescription && pageNumber === 1 ? 'h3' : 'h2')}
                ${paginationHtml}
            </main>
            ${footerHandler.createFooter()}
        </body>
    </html>`;
}

function getPageIntro(pagination, postType, topLevelDescription) {
    const postTypeConfig = utils.getPostTypeConfig(postType);
    // Top level icon may or may not exist
    const topLevelIconFilename = utils.siteContent[`${postType}Image`];
    const topLevelIconHashPath = utils.getHashPath(`/${utils.IMAGE_ASSETS_FOLDER}/${topLevelIconFilename}`);

    return `<div class="page-intro">
                    <div class="page-intro-text-container">
                        <h1 class="page-intro-title">${postTypeConfig.postTypeDisplayName}</h1>
                        ${topLevelDescription && pagination.currentPage === 1 ? `<h2 class="page-intro-secondary-title">${topLevelDescription}</h2>` : ''}
                    </div>
                </div>
                ${topLevelIconFilename && pagination.currentPage === 1 ? `<div class="toplevel-page-image"><img src="${topLevelIconHashPath}" alt="" /></div>` : ''}`;
}

function createPaginationHtml(postTypeConfig, pagination) {
    if (pagination.totalPages <= 1) return '';

    let html = '<div class="pagination-wrapper"><nav class="pagination" aria-label="Pagination">';
    getPages(pagination).forEach((p) => {
        html += buildLink(postTypeConfig, pagination, p);
    });
    html += '</nav></div>';

    return html;
}

// Build a single pagination HTML link including ellipses and previous/forward icons
function buildLink(postTypeConfig, pagination, page) {
    if (page === '...') {
        return `<span class="pagination-ellipsis" aria-hidden="true">...</span>`;
    }

    const labels = { '<': templateHelper.getPrevIcon(), '>': templateHelper.getNextIcon() };
    const isPrev = page === '<';
    const isNext = page === '>';
    const targetPage = isPrev ? pagination.currentPage - 1 : isNext ? pagination.currentPage + 1 : page;
    const isDisabled = (isPrev && pagination.currentPage === 1) || (isNext && pagination.currentPage === pagination.totalPages);
    const displayLabel = labels[page] || page;
    if (isDisabled) {
        return `<span class="pagination-link disabled">${displayLabel}</span>`;
    }

    const activeClass = pagination.currentPage === page ? 'active' : '';
    const ariaCurrent = pagination.currentPage === page ? 'aria-current="page"' : '';
    const ariaLabel = isPrev ? 'aria-label="Previous Page"' : isNext ? 'aria-label="Next Page"' : `aria-label="Page ${page}"`;
    const href = utils.getTopLevelPageUrl(postTypeConfig.postTypeDirectory, targetPage);
    return `<a href="${href}" ${ariaLabel} ${ariaCurrent} class="pagination-link ${activeClass}">${displayLabel}</a>`;
}

// Returns an array of pages for pagination including ellipses and previous/forward icons
function getPages(pagination) {
    // Pages must be at least 7 to allow for first, last, current, either side of current and 2 ellipses
    let pagesRemaining = 7;
    const pagesSet = new Set([1, pagination.totalPages, pagination.currentPage]);
    pagesRemaining -= pagesSet.size;

    // Any additional space fill by traversal from current page
    let distance = 1;
    while (pagesRemaining > 0) {
        let added = false;

        // Traverse left
        if (pagination.currentPage - distance > 1 && pagesRemaining > 0) {
            pagesSet.add(pagination.currentPage - distance);
            pagesRemaining--;
            added = true;
        }

        // Traverse right
        if (pagination.currentPage + distance < pagination.totalPages && pagesRemaining > 0) {
            pagesSet.add(pagination.currentPage + distance);
            pagesRemaining--;
            added = true;
        }

        distance++;
        if (!added) {
            break;
        }
    }

    const pages = Array.from(pagesSet).sort((a, b) => a - b);

    // Replace with ellipses if there is a gap
    if (pages[1] - pages[0] > 1 && pages[1] !== pagination.currentPage) {
        pages[1] = '...';
    }
    if (pages[pages.length - 1] - pages[pages.length - 2] > 1 && pages[pages.length - 2] !== pagination.currentPage) {
        pages[pages.length - 2] = '...';
    }

    pages.unshift('<');
    pages.push('>');
    return pages;
}

module.exports = {
    generateTopLevelPages,
    ...(process.env.NODE_ENV === 'test' && { createPaginationHtml, buildLink, getPages }),
};
