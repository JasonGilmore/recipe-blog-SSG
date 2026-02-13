require('html-validate/jest');
const createPost = require('../../src/templates/posts.js');

beforeEach(() => {
    jest.clearAllMocks();
});

jest.mock('../../src/templates/structuredDataMarkup.js', () => ({
    createPostData: jest.fn(() => '<script type="application/ld+json"></script>'),
}));
jest.mock('../../src/templates/head.js', () => jest.fn(() => '<html lang="en"><head><title>title</title></head>'));
jest.mock('../../src/utils.js', () => ({
    PAGE_TYPES: { POST: 'Post' },
}));
jest.mock('../../src/templates/header.js', () => jest.fn(() => '<header></header>'));
jest.mock('../../src/templates/templateHelper.js', () => ({ getUpArrow: jest.fn(() => '<svg/>') }));
jest.mock('../../src/templates/footer.js', () => ({ createFooter: jest.fn(() => '<footer></footer>') }));

describe('createPost', () => {
    const postHtml = '<article><p>post content</p></article>';
    const attributes = { title: 'Title', description: 'Desc', image: 'image.jpg' };

    test('generate valid HTML with provided content', () => {
        const html = createPost({}, postHtml, attributes, 'recipes', 'choc-chip-cookies');
        expect(html).toHTMLValidate();
        expect(html).toContain(postHtml);
        expect(html).toContain('<svg/>');
        expect(html).toContain('<footer></footer>');
        expect(html).toContain('<header></header>');
    });

    test('call createHead and structuredDataMarkup generator with correct params', () => {
        const head = require('../../src/templates/head.js');
        const structuredData = require('../../src/templates/structuredDataMarkup.js');

        createPost({}, postHtml, attributes, 'recipes', 'choc-chip-cookies');

        expect(structuredData.createPostData).toHaveBeenCalledWith({}, attributes, '/recipes/choc-chip-cookies');
        expect(head).toHaveBeenCalledWith(
            expect.objectContaining({
                pageTitle: 'Title',
                pageDescription: 'Desc',
                pageType: 'Post',
                relativeUrl: '/recipes/choc-chip-cookies',
                relativeImage: '/recipes/choc-chip-cookies/image.jpg',
                structuredData: expect.stringContaining('application/ld+json'),
            }),
        );
    });
});
