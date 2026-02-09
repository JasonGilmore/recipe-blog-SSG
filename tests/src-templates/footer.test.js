require('html-validate/jest');
const footer = require('../../src/templates/footer.js');

beforeEach(() => {
    jest.clearAllMocks();
});

const fsProm = require('node:fs/promises');
const path = require('node:path');
const utils = require('../../src/utils.js');
const { processHtml } = require('../../src/templates/templateHelper.js');
const createHead = require('../../src/templates/head.js');
const createHeader = require('../../src/templates/header.js');
jest.mock('../../src/utils.js', () => {
    const originalModule = jest.requireActual('../../src/utils.js');
    return {
        ...originalModule,
        dirExistsAsync: jest.fn(),
        getOutputPath: jest.fn(),
        FOOTER_DIR_PATH: '/footers',
    };
});
jest.mock('node:fs/promises', () => ({
    writeFile: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
}));
jest.mock('front-matter', () =>
    jest.fn().mockReturnValue({
        attributes: {
            displayName: 'disclaimer',
            order: '1',
        },
        body: 'content',
    }),
);
jest.mock('marked', () => ({ parse: jest.fn(() => '<p>footer html content</p>') }));
jest.mock('../../src/templates/templateHelper.js', () => ({ processHtml: jest.fn() }));
jest.mock('../../src/templates/structuredDataMarkup.js', () => ({ createGenericPageData: jest.fn() }));
jest.mock('../../src/templates/head.js', () => jest.fn());
jest.mock('../../src/templates/header.js', () => jest.fn());

describe('generateFooters', () => {
    test('does not generate if no footers found', async () => {
        utils.dirExistsAsync.mockResolvedValue(false);
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await footer.generateFooters();
        expect(fsProm.writeFile).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Footers not found'));
        logSpy.mockRestore();
    });

    test('does not generate if no files found', () => {
        utils.dirExistsAsync.mockResolvedValue(true);
        fsProm.readdir.mockResolvedValue([]);

        expect(fsProm.writeFile).not.toHaveBeenCalled();
    });

    test('generate all footers found', async () => {
        utils.dirExistsAsync.mockResolvedValue(true);
        utils.getOutputPath.mockReturnValue('/output');
        processHtml.mockResolvedValueOnce('content1').mockResolvedValueOnce('content2');
        fsProm.readdir.mockResolvedValue(['footer1.md', 'footer2.md', 'footer3.pdf']);
        fsProm.readFile.mockResolvedValueOnce('footer1 content').mockResolvedValueOnce('footer2 content');
        const mockCreateFooterPage = jest.fn();
        await footer.generateFooters({ createFooterPage: mockCreateFooterPage });

        expect(fsProm.readFile).toHaveBeenCalledTimes(2);
        expect(fsProm.readFile).toHaveBeenCalledWith(path.join('/footers', 'footer1.md'), 'utf8');
        expect(fsProm.readFile).toHaveBeenCalledWith(path.join('/footers', 'footer2.md'), 'utf8');
        expect(fsProm.writeFile).toHaveBeenCalledTimes(2);
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'footer1.html'), 'content1', 'utf8');
        expect(fsProm.writeFile).toHaveBeenCalledWith(path.join('/output', 'footer2.html'), 'content2', 'utf8');
    });
});

test('createFooterPage', () => {
    const mockCreateFooter = jest.fn();
    createHead.mockReturnValue('<html lang="en"><head><title>title</title></head>');

    const html = footer.createFooterPage('footer content', 'Footer', 'footer', { createFooter: mockCreateFooter });
    expect(html).toHTMLValidate({ rules: { 'no-trailing-whitespace': 'off' } });
    expect(html).toContain('footer content');
});

describe('createFooter', () => {
    test('gracefully handles non-array inputs', () => {
        expect(footer.createFooter(null)).toBe('');
        expect(footer.createFooter('not an array')).toBe('');
        expect(footer.createFooter({ order: 1 })).toBe('');
    });

    test('does not generate if no footers', () => {
        const result = footer.createFooter([]);
        expect(result).toBe('');
    });

    test('generates valid HTML for footers', () => {
        const footers = [
            { order: 1, location: '/footer1', displayName: 'Footer1' },
            { order: 2, location: '/footer2', displayName: 'Footer2' },
        ];
        const html = footer.createFooter(footers);
        expect(html).toHTMLValidate();
        expect(html).toContain('<a href="/footer1">Footer1</a>');
        expect(html).toContain('<a href="/footer2">Footer2</a>');
    });

    test('orders footers', () => {
        const footers = [
            { order: 1, location: '/footer1', displayName: 'Footer1' },
            { order: 3, location: '/footer3', displayName: 'Footer3' },
            { order: 2, location: '/footer2', displayName: 'Footer2' },
        ];

        const html = footer.createFooter(footers);
        const onePos = html.indexOf('/footer1');
        const twoPos = html.indexOf('/footer2');
        const threePos = html.indexOf('/footer3');
        expect(onePos).toBeLessThan(twoPos);
        expect(twoPos).toBeLessThan(threePos);
    });
});
