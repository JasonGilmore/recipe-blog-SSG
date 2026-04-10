require('html-validate/jest');
const utils = require('../../src/utils.js');
const createHead = require('../../src/templates/head.js');

beforeEach(() => {
    jest.clearAllMocks();
});

jest.mock('../../src/utils.js', () => ({
    ...jest.requireActual('../../src/utils.js'),
    siteContent: {
        siteUrl: 'https://example.com',
        siteName: 'Example Site',
        heroImageSmall: 'hero.jpg',
    },
    getHashPath: jest.fn((p) => `/hash${p}`),
    IMAGE_ASSETS_FOLDER: 'images',
    JS_FOLDER: 'js',
    SEARCH_JS_FILENAME: 'search.js',
    PAGE_TYPES: { POST: 'POST', FOOTER: 'FOOTER', HOMEPAGE: 'HOMEPAGE', TOP_LEVEL: 'TOP' },
    isFeatureEnabled: jest.fn(),
}));

describe('createHead', () => {
    // Add html normally added by other templates
    const completeHtml = (html) => `${html}'<body></body></html>'`;

    test('render title, description, og tags and canonical', () => {
        const html = completeHtml(
            createHead({
                pageTitle: 'Title',
                pageDescription: 'Desc',
                pageType: 'HOMEPAGE',
                relativeUrl: '/home',
                relativeImage: null,
                structuredData: null,
            }),
        );

        // html is later minified on site build
        expect(html).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(html).toContain('<title>Title</title>');
        expect(html).toContain('<meta name="description" content="Desc" />');
        expect(html).toContain('<meta property="og:type" content="website" />');
        expect(html).toContain('<link rel="canonical" href="https://example.com/home" />');
        expect(html).toContain('/hash/js/header.js');
    });

    test('include post assets, structured data and og:type article', () => {
        const html = completeHtml(
            createHead({
                pageTitle: 'Post',
                pageDescription: null,
                pageType: utils.PAGE_TYPES.POST,
                relativeUrl: '/recipes/post',
                relativeImage: '/recipes/post/img.jpg',
                structuredData: '<script>ld</script>',
            }),
        );

        expect(html).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(html).toContain('<meta property="og:type" content="article" />');
        expect(html).toContain('/hash/css/post.css');
        expect(html).toContain('/hash/js/posts.js');
        expect(html).toContain('<script>ld</script>');
    });

    test('include page track and search modules', () => {
        utils.isFeatureEnabled.mockReturnValue(true);
        const html = completeHtml(
            createHead({
                pageTitle: 'Homepage',
                pageDescription: 'Welcome',
                pageType: utils.PAGE_TYPES.HOMEPAGE,
                relativeUrl: '/',
                relativeImage: null,
                structuredData: null,
            }),
        );

        expect(html).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(html).toContain('<script src="/hash/js/search.js" defer></script>');
        expect(html).toContain('<script src="/hash/js/pageTrack.js" defer></script>');
    });

    test('include og:type article for footer', () => {
        const html = completeHtml(createHead({ pageTitle: 'F', pageType: utils.PAGE_TYPES.FOOTER }));
        expect(html).toContain('<meta property="og:type" content="article" />');
    });

    test('include og:type website for top-level', () => {
        const html = completeHtml(createHead({ pageTitle: 'F', pageType: utils.PAGE_TYPES.TOP_LEVEL }));
        expect(html).toContain('<meta property="og:type" content="website" />');
    });
});
