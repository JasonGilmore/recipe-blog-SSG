require('html-validate/jest');
const path = require('node:path');
const fsProm = require('node:fs/promises');
const templateHelper = require('../../src/templates/templateHelper.js');
const postCards = require('../../src/templates/postCards.js');
const topLevelPages = require('../../src/templates/topLevelPages.js');

jest.mock('../../src/utils.js', () => {
    return {
        ...jest.requireActual('../../src/utils.js'),
        siteConfig: { postTypes: { recipes: {}, blogs: {} } },
        getOutputPath: jest.fn(() => '/output'),
        getPostTypeConfig: jest.fn((t) => ({ postTypeDirectory: t, postTypeDisplayName: t === 'recipes' ? 'Recipes' : 'Blogs' })),
        siteContent: { recipesImage: null, recipesDescription: null, blogsImage: null, blogsDescription: null, maxPostsPerPage: 2 },
        getHashPath: jest.fn((p) => `/hash${p}`),
        IMAGE_ASSETS_FOLDER: 'images',
        PAGE_TYPES: { TOP_LEVEL: 'TOP' },
    };
});
jest.mock('node:fs/promises');
jest.mock('../../src/templates/templateHelper.js');
jest.mock('../../src/templates/structuredDataMarkup.js', () => ({ createTopLevelData: jest.fn(() => ({ sd: 'data' })) }));
jest.mock('../../src/templates/head.js', () => jest.fn(() => '<html lang="en"><head><title>title</title></head>'));
jest.mock('../../src/templates/header.js', () => jest.fn(() => '<header></header>'));
jest.mock('../../src/templates/postCards.js');
jest.mock('../../src/templates/footer.js', () => ({ createFooter: jest.fn(() => '<footer></footer>') }));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('generateTopLevelPages and createTopLevelPages', () => {
    test('write top-level index.html for each post type', async () => {
        templateHelper.processHtml.mockResolvedValueOnce('content1').mockResolvedValueOnce('content2');
        // No pagination due to small number of posts
        const allPostMeta = [
            { postType: 'recipes', date: '2022-01-01' },
            { postType: 'blogs', date: '2022-01-02' },
        ];
        await topLevelPages.generateTopLevelPages(allPostMeta);

        expect(templateHelper.processHtml).toHaveBeenCalledTimes(2);
        expect(fsProm.writeFile).toHaveBeenCalledTimes(2);
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'recipes/index.html'), 'content1', 'utf8');
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'blogs/index.html'), 'content2', 'utf8');
    });

    test('generated page contains title, description, icon and post-cards output', async () => {
        postCards.mockReturnValue('<post-cards></post-cards>');
        const utils = require('../../src/utils.js');
        utils.siteContent.recipesImage = 'recipes.png';
        utils.siteContent.recipesDescription = 'Recipes desc';
        utils.getHashPath.mockReturnValueOnce('/hash/images/recipes.png');
        templateHelper.processHtml.mockImplementation((x) => Promise.resolve(x));
        const allPostMeta = [{ postType: 'recipes', date: '2022-01-01', title: 'R1' }];
        await topLevelPages.generateTopLevelPages(allPostMeta);

        // First arg to processHtml is the generated html
        const generatedHtml = templateHelper.processHtml.mock.calls[0][0];
        // html would normally be minified to remove trailing whitespace
        expect(generatedHtml).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(generatedHtml).toContain('Recipes');
        expect(generatedHtml).toContain('Recipes desc');
        expect(generatedHtml).toContain('/hash/images/recipes.png');
        expect(generatedHtml).toContain('<post-cards>');
        expect(generatedHtml).toContain('<footer>');
    });

    test('filter and sorts post to create individual top-level pages', async () => {
        const utils = require('../../src/utils.js');
        utils.siteContent.recipesImage = 'recipes.png';
        utils.siteContent.recipesDescription = 'Recipes desc';
        utils.siteContent.blogsImage = 'blogs.png';
        utils.siteContent.blogsDescription = 'Blogs desc';
        templateHelper.processHtml.mockImplementation((x) => Promise.resolve(x));
        postCards.mockImplementation((postMeta) => postMeta.map((p) => p.title).join(' '));
        // Posts are sorted descending, no pagination due to small number of posts
        const allPostMeta = [
            { postType: 'recipes', date: '2022-01-01', title: 'R1' },
            { postType: 'recipes', date: '2022-01-10', title: 'R2' },
            { postType: 'blogs', date: '2022-01-01', title: 'B1' },
        ];
        await topLevelPages.generateTopLevelPages(allPostMeta);

        // First arg to processHtml is the generated html
        const generatedPostHtml = templateHelper.processHtml.mock.calls[0][0];
        const generatedBlogHtml = templateHelper.processHtml.mock.calls[1][0];

        // Posts
        expect(generatedPostHtml).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(generatedPostHtml).toContain('R1');
        expect(generatedPostHtml).toContain('R2');
        expect(generatedPostHtml).not.toContain('B1');
        const oldestPostIndex = generatedPostHtml.indexOf('R1');
        const latestPostIndex = generatedPostHtml.indexOf('R2');
        expect(latestPostIndex).toBeLessThan(oldestPostIndex);

        // Blogs
        expect(generatedBlogHtml).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(generatedBlogHtml).toContain('B1');
        expect(generatedBlogHtml).not.toContain('R1');
        expect(generatedBlogHtml).not.toContain('R2');
    });

    test('pages divided for pagination', async () => {
        templateHelper.processHtml.mockResolvedValueOnce('recipesPage1').mockResolvedValueOnce('recipesPage2').mockResolvedValueOnce('blogsPage1');
        const allPostMeta = [
            { postType: 'recipes', date: '2022-01-01', title: 'R1' },
            { postType: 'recipes', date: '2022-01-10', title: 'R2' },
            { postType: 'recipes', date: '2022-01-01', title: 'R3' },
            { postType: 'blogs', date: '2022-01-01', title: 'B1' },
        ];
        await topLevelPages.generateTopLevelPages(allPostMeta);

        expect(templateHelper.processHtml).toHaveBeenCalledTimes(3);
        expect(fsProm.writeFile).toHaveBeenCalledTimes(3);
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'recipes/index.html'), 'recipesPage1', 'utf8');
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'recipes/page/2/index.html'), 'recipesPage2', 'utf8');
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'blogs/index.html'), 'blogsPage1', 'utf8');
    });
});

describe('getPages', () => {
    test('constructs pagination', () => {
        const pagination = { currentPage: 1, totalPages: 3, pagePosts: [] };
        const pageResults = topLevelPages.getPages(pagination);
        expect(pageResults).toEqual(['<', 1, 2, 3, '>']);
    });

    test('constructs pagination with ellipses at end', () => {
        const pagination = { currentPage: 1, totalPages: 9, pagePosts: [] };
        const pageResults = topLevelPages.getPages(pagination);
        expect(pageResults).toEqual(['<', 1, 2, 3, 4, 5, '...', 9, '>']);
    });

    test('constructs pagination with ellipses at start', () => {
        const pagination = { currentPage: 9, totalPages: 9, pagePosts: [] };
        const pageResults = topLevelPages.getPages(pagination);
        expect(pageResults).toEqual(['<', 1, '...', 5, 6, 7, 8, 9, '>']);
    });

    test('constructs pagination with ellipses at start and end', () => {
        const pagination = { currentPage: 5, totalPages: 9, pagePosts: [] };
        const pageResults = topLevelPages.getPages(pagination);
        expect(pageResults).toEqual(['<', 1, '...', 4, 5, 6, '...', 9, '>']);
    });
});

describe('createPaginationHtml', () => {
    const mockConfig = { postTypeDirectory: 'recipes' };
    test('returns an empty string if total pages is 1', () => {
        const pagination = { currentPage: 1, totalPages: 1, pagePosts: [] };
        const result = topLevelPages.createPaginationHtml(mockConfig, pagination);
        expect(result).toBe('');
    });

    test('returns correct html for multiple pages', () => {
        const pagination = { currentPage: 1, totalPages: 3, pagePosts: [] };
        const result = topLevelPages.createPaginationHtml(mockConfig, pagination);
        const linkCount = result.match(/<a/g).length;
        expect(result).toContain('<div class="pagination-wrapper">');
        expect(result).toContain('<nav class="pagination" aria-label="Pagination">');
        // 4 links - page 1, 2, 3 and next. Previous disabled since page 1
        expect(linkCount).toBe(4);
    });
});

describe('buildLink', () => {
    const mockConfig = { postTypeDirectory: 'recipes' };
    const pagination = { currentPage: 2, totalPages: 5 };

    test('returns a span for ellipsis', () => {
        const result = topLevelPages.buildLink(mockConfig, pagination, '...');
        expect(result).toContain('<span class="pagination-ellipsis"');
    });

    test('returns a disabled span for the previous link on page 1', () => {
        const firstPagePagination = { currentPage: 1, totalPages: 5 };
        const result = topLevelPages.buildLink(mockConfig, firstPagePagination, '<');
        expect(result).toContain('<span class="pagination-link disabled">');
    });

    test('returns a disabled span for next link on the last page', () => {
        const lastPagePagination = { currentPage: 5, totalPages: 5 };
        const result = topLevelPages.buildLink(mockConfig, lastPagePagination, '>');
        expect(result).toContain('<span class="pagination-link disabled">');
    });

    test('returns enabled previous and next links when both available', () => {
        const next = topLevelPages.buildLink(mockConfig, pagination, '>');
        expect(next).toContain('aria-label="Next Page"');
        expect(next).not.toContain('<span class="pagination-link disabled">');

        const prev = topLevelPages.buildLink(mockConfig, pagination, '<');
        expect(prev).toContain('aria-label="Previous Page"');
        expect(next).not.toContain('<span class="pagination-link disabled">');
    });

    test('returns an active link for the current page', () => {
        const result = topLevelPages.buildLink(mockConfig, pagination, 2);
        expect(result).toContain('class="pagination-link active"');
        expect(result).toContain('aria-current="page"');
        expect(result).toContain('aria-label="Page 2"');
    });
});
