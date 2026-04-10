const utils = require('../../lib/utils.js');
jest.doMock('../../src/utils.js', () => ({
    ...jest.requireActual('../../src/utils.js'),
    siteConfig: {
        postTypes: {
            recipes: {},
            blogs: {},
        },
    },
}));

describe('parseRequest', () => {
    test('canonical post path sets correct response', () => {
        const result = utils.parseRequest('/recipes/bread');
        expect(result).toEqual({
            isPost: true,
            matchedPostType: 'recipes',
            postName: 'bread',
            isCanonicalPostPath: true,
        });
    });

    test('longer post path is post but not canonical', () => {
        const result = utils.parseRequest('/recipes/sourdough/extra');
        expect(result).toEqual({
            isPost: true,
            matchedPostType: 'recipes',
            postName: 'extra',
            isCanonicalPostPath: false,
        });
    });

    test('top-level page path is not a post but matchedPostType', () => {
        const result = utils.parseRequest('/recipes/');
        expect(result).toEqual({
            isPost: false,
            matchedPostType: 'recipes',
            postName: undefined,
            isCanonicalPostPath: false,
        });
    });

    test('path with extension is not treated as post', () => {
        const result = utils.parseRequest('/recipes/bread.html');
        expect(result).toEqual({
            isPost: false,
            matchedPostType: 'recipes',
            postName: undefined,
            isCanonicalPostPath: false,
        });
    });

    test('non-post path returns no matchedPostType', () => {
        const result = utils.parseRequest('/about');
        expect(result).toEqual({
            isPost: false,
            matchedPostType: undefined,
            postName: undefined,
            isCanonicalPostPath: false,
        });
    });
});
