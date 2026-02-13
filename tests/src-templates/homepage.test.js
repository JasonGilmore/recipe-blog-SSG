require('html-validate/jest');
const path = require('node:path');

jest.mock('../../src/utils.js', () => ({
    getOutputPath: jest.fn(() => '/output'),
    siteContent: {
        siteName: 'Site',
        heroImage: 'hero.jpg',
        heroImageAlt: 'alt text',
        mainIntroduction: 'Main intro',
        secondaryIntroduction: 'Welcome',
        recentPostsMessage: 'Recent posts',
    },
    getHashPath: jest.fn((p) => `/hash${p}`),
    IMAGE_ASSETS_FOLDER: 'images',
    PAGE_TYPES: { HOMEPAGE: 'HOMEPAGE' },
}));

jest.mock('node:fs/promises', () => ({
    writeFile: jest.fn(),
}));
jest.mock('../../src/templates/templateHelper.js', () => ({
    processHtml: jest.fn(),
}));
jest.mock('../../src/templates/structuredDataMarkup.js', () => ({
    createHomepageData: jest.fn(() => ({ sd: 'data' })),
}));

jest.mock('../../src/templates/head.js', () => jest.fn(() => '<html lang="en"><head><title>title</title></head>'));
jest.mock('../../src/templates/header.js', () => jest.fn(() => '<header></header>'));
jest.mock('../../src/templates/postCards.js', () => jest.fn(() => '<post-cards></post-cards>'));
jest.mock('../../src/templates/footer.js', () => ({ createFooter: jest.fn(() => '<footer></footer>') }));

const generateHomepage = require('../../src/templates/homepage.js');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('generateHomepage', () => {
    test('write processed homepage html to output', async () => {
        const fsProm = require('node:fs/promises');
        const templateHelper = require('../../src/templates/templateHelper.js');
        templateHelper.processHtml.mockResolvedValue('processed-content');
        await generateHomepage([{ title: 'one' }]);

        expect(fsProm.writeFile).toHaveBeenCalledTimes(1);
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', '/index.html'), 'processed-content', 'utf8');
    });

    test('build valid html containing header, hero image, posts and footer', async () => {
        const templateHelper = require('../../src/templates/templateHelper.js');
        templateHelper.processHtml.mockImplementation((x) => Promise.resolve(x));
        await generateHomepage([{ title: 'one' }]);
        // First arg to processHtml is the generated html
        const html = templateHelper.processHtml.mock.calls[0][0];

        expect(html).toHTMLValidate();
        expect(html).toContain('<head>');
        expect(html).toContain('<header>');
        expect(html).toContain('/hash/images/hero.jpg');
        expect(html).toContain('Main intro');
        expect(html).toContain('Welcome');
        expect(html).toContain('Recent posts');
        expect(html).toContain('<post-cards></post-cards>');
        expect(html).toContain('<footer>');
    });
});
