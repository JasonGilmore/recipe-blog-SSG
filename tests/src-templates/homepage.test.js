require('html-validate/jest');
const path = require('node:path');
const templateHelper = require('../../src/templates/templateHelper.js');

beforeEach(() => {
    jest.clearAllMocks();
});

jest.mock('../../src/utils.js', () => ({
    ...jest.requireActual('../../src/utils.js'),
    getOutputPath: jest.fn(() => '/output'),
    siteContent: {
        siteName: 'Site',
        heroImage: 'hero.jpg',
        heroImageAlt: 'alt text',
        mainIntroduction: 'Main intro',
        secondaryIntroduction: 'Welcome',
        recentPostsCount: 3,
        recentPostsMessage: 'Recent posts',
        featuredPostsCount: 3,
        featuredPostsMessage: 'Featured posts',
        featuredPostsTop: true,
    },
    isFeatureEnabled: jest.fn(),
    getHashPath: jest.fn((p) => `/hash${p}`),
    IMAGE_ASSETS_FOLDER: 'images',
    PAGE_TYPES: { HOMEPAGE: 'HOMEPAGE' },
}));

jest.mock('node:fs/promises');
jest.mock('../../src/templates/templateHelper.js');
jest.mock('../../src/templates/structuredDataMarkup.js', () => ({
    createHomepageData: jest.fn(() => ({ sd: 'data' })),
}));
jest.mock('../../src/templates/head.js', () => jest.fn(() => '<html lang="en"><head><title>title</title></head>'));
jest.mock('../../src/templates/header.js', () => jest.fn(() => '<header></header>'));
jest.mock('../../src/templates/postCards.js', () => jest.fn(() => '<post-cards></post-cards>'));
jest.mock('../../src/templates/footer.js', () => ({ createFooter: jest.fn(() => '<footer></footer>') }));

const generateHomepage = require('../../src/templates/homepage.js');

describe('generateHomepage', () => {
    test('write processed homepage html to output', async () => {
        const fsProm = require('node:fs/promises');
        templateHelper.processHtml.mockResolvedValue('processed-content');
        await generateHomepage([{ title: 'one' }]);

        expect(fsProm.writeFile).toHaveBeenCalledTimes(1);
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', '/index.html'), 'processed-content', 'utf8');
    });

    test('build valid html containing header, hero image, posts and footer', async () => {
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockImplementation((featureName) => featureName === 'enableFeaturedPosts');
        templateHelper.processHtml.mockImplementation((html) => Promise.resolve(html));
        await generateHomepage([{ title: 'one', featured: true, 'featured-order': 1 }], [{ title: 'one' }]);
        // First arg to processHtml is the generated html
        const processedHtml = templateHelper.processHtml.mock.calls[0][0];

        expect(processedHtml).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(processedHtml).toContain('<head>');
        expect(processedHtml).toContain('<header>');
        expect(processedHtml).toContain('/hash/images/hero.jpg');
        expect(processedHtml).toContain('Main intro');
        expect(processedHtml).toContain('Welcome');
        expect(processedHtml).toContain('Recent posts');
        expect(processedHtml).toContain('Featured posts');
        expect(processedHtml).toContain('<post-cards></post-cards>');
        expect(processedHtml).toContain('<footer>');
    });

    test('featured posts are not included in recent posts', async () => {
        const createPostCards = require('../../src/templates/postCards.js');
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockImplementation((featureName) => featureName === 'enableFeaturedPosts');
        const posts = [
            { title: 'Featured post', date: '2026-01-01', featured: true },
            { title: 'Recent post', date: '2025-01-01' },
        ];
        templateHelper.processHtml.mockImplementation((html) => Promise.resolve(html));
        await generateHomepage(posts);

        expect(createPostCards).toHaveBeenCalledTimes(2);
        expect(createPostCards.mock.calls[0][0]).toEqual([posts[0]]);
        expect(createPostCards.mock.calls[1][0]).toEqual([posts[1]]);
    });

    test('featured posts positioned before recent posts', async () => {
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockImplementation((featureName) => featureName === 'enableFeaturedPosts');
        const posts = [
            { title: 'Featured post', date: '2026-01-01', featured: true },
            { title: 'Recent post', date: '2025-01-01' },
        ];
        templateHelper.processHtml.mockImplementation((html) => Promise.resolve(html));
        await generateHomepage(posts);

        const processedHtml = templateHelper.processHtml.mock.calls[0][0];
        expect(processedHtml.indexOf('Featured posts')).toBeLessThan(processedHtml.indexOf('Recent posts'));
    });

    test('featured posts positioned after recent posts', async () => {
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockImplementation((featureName) => featureName === 'enableFeaturedPosts');
        const posts = [
            { title: 'Featured post', date: '2026-01-01', featured: true },
            { title: 'Recent post', date: '2025-01-01' },
        ];
        utils.siteContent.featuredPostsTop = false;
        templateHelper.processHtml.mockImplementation((html) => Promise.resolve(html));
        await generateHomepage(posts);

        const processedHtml = templateHelper.processHtml.mock.calls[0][0];
        expect(processedHtml.indexOf('Recent posts')).toBeLessThan(processedHtml.indexOf('Featured posts'));
    });

    test('disabled featured posts are not generated and remain eligible for recent posts', async () => {
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockImplementation((featureName) => featureName !== 'enableFeaturedPosts');
        const createPostCards = require('../../src/templates/postCards.js');
        const posts = [
            { title: 'Featured post', date: '2026-01-01', featured: true },
            { title: 'Recent post', date: '2025-01-01' },
        ];
        templateHelper.processHtml.mockImplementation((html) => Promise.resolve(html));
        await generateHomepage(posts);

        expect(createPostCards).toHaveBeenCalledTimes(1);
        expect(createPostCards.mock.calls[0][0]).toEqual(posts);
        expect(templateHelper.processHtml.mock.calls[0][0]).not.toContain('Featured posts');
    });
});
