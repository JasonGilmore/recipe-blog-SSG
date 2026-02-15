require('html-validate/jest');
const path = require('node:path');
const fsProm = require('node:fs/promises');
const utils = require('../../src/utils.js');
const helper = require('../../src/templates/templateHelper.js');

beforeEach(() => {
    jest.clearAllMocks();
});

jest.mock('../../src/utils.js', () => ({
    ...jest.requireActual('../../src/utils.js'),
    getHashPaths: jest.fn(() => ({ '/recipes/cookies/image1.jpg': '/recipes/cookies/image1.12345.jpg' })),
    getStringHash: jest.fn((s) => `12345`),
    SEARCH_DATA_FILENAME: 'search-data.json',
    getHashFilename: jest.fn((base, hash, ext) => `${base}.${hash}${ext}`),
    getOutputPath: jest.fn(() => '/output'),
    setHashPath: jest.fn(),
    isFeatureEnabled: jest.fn(),
}));
jest.mock('lunr', () => ({
    Builder: function () {
        this._docs = [];
        this.ref = function () {
            return this;
        };
        this.field = function () {
            return this;
        };
        this.add = function (doc) {
            this._docs.push(doc);
        };
        this.build = function () {
            return { built: true, docs: this._docs };
        };
    },
}));
jest.mock('front-matter', () => jest.fn((s) => ({ body: s })));
jest.mock('html-minifier-terser');
jest.mock('csso');
jest.mock('terser');
jest.mock('node:fs/promises');

describe('icons', () => {
    test('getUpArrow produce SVG', () => {
        expect(helper.getUpArrow()).toHTMLValidate();
        expect(helper.getUpArrow()).toContain('<svg');
    });

    test('getDownArrow produce SVG', () => {
        expect(helper.getUpArrow()).toHTMLValidate();
        expect(helper.getDownArrow()).toContain('<svg');
    });

    test('getSearchIcon produce SVG', () => {
        expect(helper.getSearchIcon()).toHTMLValidate();
        expect(helper.getSearchIcon()).toContain('<svg');
    });
});

test('formatPostHtml replaces markers, image paths and checkbox transformation', () => {
    const input = `
            <p>{recipeboxstart}</p>
            <p>{recipeboxend}</p>
            {jumptorecipebox}
            <p>{lightstyleboxstart}</p>
            <p>{lightstyleboxend}</p>
            <p>{darkstyleboxstart}</p>
            <p>{darkstyleboxend}</p>
            <table><tr><td>1</td></tr></table>
            <img src="./image1.jpg">
            <img src="./image2.jpg">
            <li><input disabled="" type="checkbox">Ingredient one</li>
        `;
    const formattedHtml = helper.formatPostHtml(input, 'recipes', 'cookies');
    expect(formattedHtml).toContain('table-wrapper');
    expect(formattedHtml).toContain('recipe-box');
    expect(formattedHtml).toContain('jump-to-recipe');
    expect(formattedHtml).toContain('light-style-box');
    expect(formattedHtml).toContain('dark-style-box');

    // src="./ should have been rewritten to /recipes/name/ with hash
    expect(formattedHtml).toContain('src="/recipes/cookies/image1.12345.jpg"');

    // first image has fetchpriority
    expect(formattedHtml).toContain('fetchpriority="high"');
    const firstImgIndex = formattedHtml.indexOf('/recipes/cookies/image1.12345.jpg');
    const secondImgIndex = formattedHtml.indexOf('/recipes/cookies/image2.jpg');
    expect(firstImgIndex).toBeLessThan(secondImgIndex);

    // checkbox transformed to label with id
    expect(formattedHtml).toContain('<input type="checkbox" id="checkbox-1">');
    expect(formattedHtml).toContain('<label for="checkbox-1">Ingredient one</label>');
});

describe('generateSearchData', () => {
    test('create search data file and sets hash path', async () => {
        const allPostMeta = [{ link: '/recipes/r1', mdFilename: 'r1.md', title: 'T', description: 'D', keywords: 'k', imageHashPath: '/img.jpg' }];
        fsProm.readFile.mockResolvedValue('Post content');
        await helper.generateSearchData(allPostMeta);

        expect(fsProm.mkdir).toHaveBeenCalledWith('/output', { recursive: true });
        expect(fsProm.writeFile).toHaveBeenCalled();
        expect(utils.setHashPath).toHaveBeenCalled();
    });

    test('clean markdown', async () => {
        const allPostMeta = [{ link: '/recipes/r1', mdFilename: 'r1.md', title: 'T', description: 'D', keywords: 'k', imageHashPath: '/img.jpg' }];
        const content = 'Post content';
        const comment = '<!-- prettier-ignore-start -->';
        const imageLink = '![An image](./image.jpg)'; // keeps anchor text
        const link = '[A link](/recipes/cookies)'; // keeps anchor text
        const placeholderContent = '{recipeboxstart}{recipeboxend}';
        const wordNum = 'hello1';
        const tableChars = '|--';
        const taskList = '[ ]';
        const point = '*';
        const additionalChars = '#~';
        const forbidden = [comment, imageLink, link, placeholderContent, wordNum, tableChars, taskList, point, additionalChars];
        const markdown = [content, ...forbidden].join('\n');
        fsProm.readFile.mockResolvedValue(markdown);
        await helper.generateSearchData(allPostMeta);

        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'search-data.12345.json'), expect.anything(), 'utf8');
        const searchDataString = fsProm.writeFile.mock.calls[0][1];
        forbidden.forEach((item) => {
            expect(searchDataString).not.toContain(item);
        });
        // Alt text and link text is still included
        expect(searchDataString).toContain('An image');
        expect(searchDataString).toContain('A link');
    });

    test('normalise characters', async () => {
        const allPostMeta = [{ link: '/recipes/r1', mdFilename: 'r1.md', title: 'T', description: 'D', keywords: 'k', imageHashPath: '/img.jpg' }];
        const content = 'Post content Crème brûlée';
        fsProm.readFile.mockResolvedValue(content);
        await helper.generateSearchData(allPostMeta);

        const searchDataString = fsProm.writeFile.mock.calls[0][1];
        expect(searchDataString).not.toContain('Crème brûlée');
        expect(searchDataString).toContain('Creme brulee');
    });

    test('search index and store created', async () => {
        const allPostMeta = [
            { link: '/recipes/r1', mdFilename: 'r1.md', title: 'T1', description: 'D1', keywords: 'k1', imageHashPath: '/img1.jpg' },
            { link: '/recipes/r2', mdFilename: 'r2.md', title: 'T2', description: 'D2', keywords: 'k2', imageHashPath: '/img2.jpg' },
        ];
        const content = 'Post content';
        fsProm.readFile.mockResolvedValue(content);
        await helper.generateSearchData(allPostMeta);

        const searchDataString = fsProm.writeFile.mock.calls[0][1];

        const searchDataIndexList = JSON.parse(searchDataString).index.docs;
        expect(searchDataIndexList).toHaveLength(2);
        expect(searchDataIndexList[0]).toMatchObject({
            link: '/recipes/r1',
            title: 'T1',
            description: 'D1',
            keywords: 'k1',
            content: 'Post content',
        });
        expect(searchDataIndexList[1]).toMatchObject({
            link: '/recipes/r2',
            title: 'T2',
            description: 'D2',
            keywords: 'k2',
            content: 'Post content',
        });

        const searchDataStore = JSON.parse(searchDataString).store;
        expect(Object.keys(searchDataStore)).toHaveLength(2);
        expect(searchDataStore['/recipes/r1']).toMatchObject({
            link: '/recipes/r1',
            title: 'T1',
            description: 'D1',
            imageHashPath: '/img1.jpg',
        });
        expect(searchDataStore['/recipes/r2']).toMatchObject({
            link: '/recipes/r2',
            title: 'T2',
            description: 'D2',
            imageHashPath: '/img2.jpg',
        });
    });
});

describe('minification helpers', () => {
    test('processHtml respects feature flag', async () => {
        const { minify } = require('html-minifier-terser');
        const html = '<div>  x  </div>';
        const minHtml = '<div>x</div>';
        minify.mockReturnValue(minHtml);

        utils.isFeatureEnabled.mockReturnValue(false);
        expect(await helper.processHtml(html)).toBe(html);

        utils.isFeatureEnabled.mockReturnValue(true);
        expect(await helper.processHtml(html)).toBe(minHtml);
    });

    test('processCss respects feature flag', async () => {
        const { minify } = require('csso');
        const css = '.main { color: red; }';
        const minCss = '.main{color:red;}';
        minify.mockReturnValue({ css: minCss });

        utils.isFeatureEnabled.mockReturnValue(false);
        expect(await helper.processCss(css)).toBe(css);

        utils.isFeatureEnabled.mockReturnValue(true);
        expect(await helper.processCss(css)).toBe(minCss);
    });

    test('processJs respects feature flag', async () => {
        const { minify } = require('terser');
        const js = 'const x = 1 + 2;';
        const minJs = 'const x=3';
        minify.mockReturnValue({ code: minJs });

        utils.isFeatureEnabled.mockReturnValue(false);
        expect(await helper.processJs(js)).toBe(js);

        utils.isFeatureEnabled.mockReturnValue(true);
        expect(await helper.processJs(js)).toBe(minJs);
    });
});
