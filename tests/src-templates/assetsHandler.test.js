require('html-validate/jest');
const fsProm = require('node:fs/promises');
const path = require('node:path');
const utils = require('../../src/utils.js');
const templateHelper = require('../../src/templates/templateHelper.js');
const generateAssets = require('../../src/templates/assetsHandler.js');

beforeEach(() => {
    jest.clearAllMocks();
});

jest.mock('../../src/utils.js', () => ({
    ...jest.requireActual('../../src/utils.js'),
    getOutputPath: jest.fn(() => '/output'),
    IMAGE_ASSETS_FOLDER: 'images',
    dirExistsAsync: jest.fn(),
    scrubSaveImage: jest.fn(() => Promise.resolve()),
    CSS_FOLDER: 'css',
    siteContent: { theme: { primary: '#12345' } },
    JS_FOLDER: 'js',
    SEARCH_JS_FILENAME: 'search.js',
    SEARCH_DATA_FILENAME: 'search-data.json',
    isFeatureEnabled: jest.fn(),
    getHashPath: jest.fn((p) => `/hash${p}`),
    ROBOTS_TXT_FILENAME: 'robots.txt',
    fileExistsAsync: jest.fn(),
}));
jest.mock('node:fs/promises');
jest.mock('../../src/templates/templateHelper.js', () => ({
    processCss: jest.fn((s) => `cssmin:${s}`),
    processJs: jest.fn((s) => `jsmin:${s}`),
}));

describe('generateAssets', () => {
    test('generate images', async () => {
        const isImages = (path) => path.endsWith('images');
        utils.dirExistsAsync.mockImplementation(async (path) => isImages(path));
        fsProm.readdir.mockImplementation(async (path) => (isImages(path) ? ['img1.jpg', 'img2.jpg'] : []));
        await generateAssets();

        expect(fsProm.mkdir).toHaveBeenCalledTimes(1);
        expect(fsProm.mkdir).toHaveBeenCalledWith(path.join('/output', 'images'), { recursive: true });
        expect(utils.scrubSaveImage).toHaveBeenCalledTimes(2);
        expect(utils.scrubSaveImage).toHaveBeenCalledWith(expect.anything(), path.join('/output', 'images'), 'img1.jpg');
        expect(utils.scrubSaveImage).toHaveBeenCalledWith(expect.anything(), path.join('/output', 'images'), 'img2.jpg');
    });

    test('generate css', async () => {
        const isCss = (path) => path.endsWith('css');
        utils.dirExistsAsync.mockImplementation(async (path) => isCss(path));
        fsProm.readdir.mockImplementation(async (path) => (isCss(path) ? ['main.css', 'post.css'] : []));
        fsProm.readFile.mockImplementation((p, enc) => {
            if (p.includes('main.css')) return Promise.resolve('body { --primary: #theme }');
            return Promise.resolve('css content');
        });
        await generateAssets();

        expect(fsProm.mkdir).toHaveBeenCalledTimes(1);
        expect(fsProm.mkdir).toHaveBeenCalledWith(path.join('/output', 'css'), { recursive: true });
        expect(templateHelper.processCss).toHaveBeenCalledTimes(2);
        expect(templateHelper.processCss).toHaveBeenCalledWith('css content');
        expect(templateHelper.processCss).toHaveBeenCalledWith('body { --primary: #12345 }');
        expect(fsProm.writeFile).toHaveBeenCalledTimes(2);
    });

    test('generate js with all features enabled', async () => {
        const isJs = (path) => path.endsWith('js');
        utils.dirExistsAsync.mockImplementation(async (path) => isJs(path));
        fsProm.readdir.mockImplementation(async (path) => (isJs(path) ? ['search.js', 'pageTrack.js', 'post.js'] : []));
        utils.fileExistsAsync.mockImplementation(async (path) => path.includes('robots.txt'));
        utils.isFeatureEnabled.mockReturnValue(true);
        fsProm.readFile.mockImplementation(async (p, enc) => {
            if (p.includes('search.js')) return 'search js content #SEARCH_INDEX_PLACEHOLDER';
            if (p.includes('pageTrack.js')) return 'page track js content';
            if (p.includes('post.js')) return 'post js content';
            return 'js content';
        });
        await generateAssets();

        expect(fsProm.mkdir).toHaveBeenCalledTimes(1);
        expect(fsProm.mkdir).toHaveBeenCalledWith(path.join('/output', 'js'), { recursive: true });
        expect(templateHelper.processJs).toHaveBeenCalledTimes(3);
        expect(templateHelper.processJs).toHaveBeenCalledWith('search js content /hash/search-data.json');
        expect(templateHelper.processJs).toHaveBeenCalledWith('page track js content');
        expect(templateHelper.processJs).toHaveBeenCalledWith('post js content');
        expect(fsProm.copyFile).toHaveBeenCalledWith(expect.anything(), path.join('/output', 'robots.txt'));
    });

    test('generate subset of js if features disabled', async () => {
        const isJs = (path) => path.endsWith('js');
        utils.dirExistsAsync.mockImplementation(async (path) => isJs(path));
        fsProm.readdir.mockImplementation(async (path) => (isJs(path) ? ['search.js', 'pageTrack.js', 'post.js'] : []));
        utils.fileExistsAsync.mockImplementation(async (path) => !path.includes('robots.txt'));
        utils.isFeatureEnabled.mockReturnValue(false);
        fsProm.readFile.mockImplementation(async (p, enc) => {
            if (p.includes('search.js')) return 'search js content #SEARCH_INDEX_PLACEHOLDER';
            if (p.includes('pageTrack.js')) return 'page track js content';
            if (p.includes('post.js')) return 'post js content';
            return 'js content';
        });
        await generateAssets();

        expect(templateHelper.processJs).toHaveBeenCalledTimes(1);
        expect(templateHelper.processJs).toHaveBeenCalledWith('post js content');
    });
});
