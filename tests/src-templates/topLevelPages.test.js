require('html-validate/jest');
const path = require('node:path');
const fsProm = require('node:fs/promises');
const templateHelper = require('../../src/templates/templateHelper.js');
const postCards = require('../../src/templates/postCards.js');
const generateTopLevelPages = require('../../src/templates/topLevelPages.js');

jest.mock('../../src/utils.js', () => {
    return {
        ...jest.requireActual('../../src/utils.js'),
        siteConfig: { postTypes: { recipes: {}, blogs: {} } },
        getOutputPath: jest.fn(() => '/output'),
        getPostTypeConfig: jest.fn((t) => ({ postTypeDirectory: t, postTypeDisplayName: t === 'recipes' ? 'Recipes' : 'Blogs' })),
        siteContent: { recipesImage: null, recipesDescription: null, blogsImage: null, blogsDescription: null },
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

describe('generateTopLevelPages', () => {
    test('write top-level index.html for each post type', async () => {
        templateHelper.processHtml.mockResolvedValueOnce('content1').mockResolvedValueOnce('content2');
        const allPostMeta = [
            { postType: 'recipes', date: '2022-01-01' },
            { postType: 'blogs', date: '2022-01-02' },
        ];
        await generateTopLevelPages(allPostMeta);

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
        await generateTopLevelPages(allPostMeta);

        // First arg to processHtml is the generated html
        const generatedHtml = templateHelper.processHtml.mock.calls[0][0];
        expect(generatedHtml).toHTMLValidate();
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
        // Posts are sorted descending
        const allPostMeta = [
            { postType: 'recipes', date: '2022-01-01', title: 'R1' },
            { postType: 'recipes', date: '2022-01-10', title: 'R2' },
            { postType: 'blogs', date: '2022-01-01', title: 'B1' },
        ];
        await generateTopLevelPages(allPostMeta);

        // First arg to processHtml is the generated html
        const generatedPostHtml = templateHelper.processHtml.mock.calls[0][0];
        const generatedBlogHtml = templateHelper.processHtml.mock.calls[1][0];

        // Posts
        expect(generatedPostHtml).toHTMLValidate();
        expect(generatedPostHtml).toContain('R1');
        expect(generatedPostHtml).toContain('R2');
        expect(generatedPostHtml).not.toContain('B1');
        const oldestPostIndex = generatedPostHtml.indexOf('R1');
        const latestPostIndex = generatedPostHtml.indexOf('R2');
        expect(latestPostIndex).toBeLessThan(oldestPostIndex);

        // Blogs
        expect(generatedBlogHtml).toHTMLValidate();
        expect(generatedBlogHtml).toContain('B1');
        expect(generatedBlogHtml).not.toContain('R1');
        expect(generatedBlogHtml).not.toContain('R2');
    });
});
