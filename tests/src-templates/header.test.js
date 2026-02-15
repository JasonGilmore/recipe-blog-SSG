require('html-validate/jest');
const createHeader = require('../../src/templates/header.js');

beforeEach(() => {
    jest.clearAllMocks();
});

jest.mock('../../src/utils.js', () => ({
    ...jest.requireActual('../../src/utils.js'),
    isFeatureEnabled: jest.fn(),
    siteConfig: { postTypes: { recipes: { postTypeDirectory: 'recipes', postTypeDisplayName: 'Recipes' } } },
    siteContent: { siteName: 'My Site', siteIcon: null },
    getHashPath: jest.fn(),
    IMAGE_ASSETS_FOLDER: 'images',
}));
jest.mock('../../src/templates/templateHelper.js', () => ({
    getSearchIcon: jest.fn(() => '<svg/>'),
}));

describe('createHeader', () => {
    test('generate valid HTML without search', () => {
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockReturnValue(false);

        const html = createHeader();
        expect(html).toHTMLValidate();
        expect(html).toContain('<a href="/recipes/"');
        expect(html).not.toContain('search-button');
        expect(html).not.toContain('search-dialog');
    });

    test('include search button and dialog when search enabled', () => {
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockImplementation((featureName) => {
            return featureName === 'enableSearch';
        });

        const html = createHeader();
        // Prefer native element off as using a section for searchResults causes screen reader to not announce the section
        expect(html).toHTMLValidate({ rules: { 'prefer-native-element': 'off' } });
        expect(html).toContain('search-button');
        expect(html).toContain('search-dialog');
    });

    test('include site icon when siteContent.siteIcon present', () => {
        const utils = require('../../src/utils.js');
        utils.isFeatureEnabled.mockReturnValue(false);
        utils.siteContent.siteIcon = 'icon.png';
        utils.getHashPath.mockReturnValue('/images/icon.hash.png');

        const html = createHeader();
        expect(html).toHTMLValidate();
        expect(html).toContain('<img');
        expect(html).toContain('/images/icon.hash.png');
    });
});
