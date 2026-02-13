require('html-validate/jest');

jest.mock('../../src/utils.js', () => ({
    getPostTypeConfig: jest.fn(() => ({ postTypeDisplayName: 'Recipes' })),
    removeLastS: jest.fn((s) => s.replace(/s$/, '')),
}));

const createPostCards = require('../../src/templates/postCards.js');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('createPostCards', () => {
    const samplePost = {
        postType: 'recipes',
        link: '/recipes/choc-chip-cookies',
        imageHashPath: '/hash/images/img.jpg',
        title: 'Cookie Recipe',
        description: 'Tasty cookies',
    };

    test('generate valid html with type icon on homepage', () => {
        const html = createPostCards([samplePost], true, 'h3');

        expect(html).toHTMLValidate();
        expect(html).toContain('<a href="/recipes/choc-chip-cookies"');
        expect(html).toContain('type-icon');
        expect(html).toContain('/hash/images/img.jpg');
        expect(html).toContain('<h3 class="post-thumbnail-title">Cookie Recipe</h3>');
        expect(html).toContain('Tasty cookies');
    });

    test('does not include type icon when not homepage', () => {
        const html = createPostCards([samplePost], false, 'h2');
        // html would normally be minified to remove trailing whitespace for isHomePage template empty
        expect(html).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(html).not.toContain('type-icon');
    });

    test('fall back to h2 for invalid titleType', () => {
        const html = createPostCards([samplePost], false, 'h9');
        // html would normally be minified to remove trailing whitespace for isHomePage template empty
        expect(html).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
        expect(html).toContain('<h2 class="post-thumbnail-title">Cookie Recipe</h2>');
    });

    test('call utils helpers for post type and title', () => {
        const utils = require('../../src/utils.js');
        createPostCards([samplePost], true, 'h3');
        expect(utils.getPostTypeConfig).toHaveBeenCalledWith('recipes');
        expect(utils.removeLastS).toHaveBeenCalledWith('Recipes');
    });
});
