// Load utils within each test as its imports may need to be mocked

beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    // Mock config so utils.js sets top-level config on load
    jest.mock('node:fs', () => ({
        existsSync: jest.fn().mockReturnValue(true),
    }));
    jest.doMock('../../src/config.json', () => ({ contentDirectory: 'mockcontent', outputDirectory: 'mockoutput' }), { virtual: true });
});

describe('Config loader', () => {
    test('load config if exists', () => {
        const fs = require('node:fs');
        jest.doMock('../../src/config.json', () => ({ contentDirectory: 'configContent1', outputDirectory: 'configOutput1' }), { virtual: true });

        const utils = require('../../src/utils.js');
        expect(fs.existsSync).toHaveBeenCalled();
        expect(utils.siteConfig.contentDirectory).toBe('configContent1');
    });

    test('load default config as fallback', () => {
        const fs = require('node:fs');
        fs.existsSync.mockReturnValue(false);
        jest.doMock('../../src/config.default.json', () => ({ contentDirectory: 'configContent2', outputDirectory: 'configOutput2' }), { virtual: true });

        const utils = require('../../src/utils.js');
        expect(fs.existsSync).toHaveBeenCalled();
        expect(utils.siteConfig.contentDirectory).toBe('configContent2');
    });

    test('getPostTypeConfig', () => {
        jest.doMock('../../src/config.json', () => ({ contentDirectory: 'configContent3', outputDirectory: 'configOutput3', postTypes: { blogs: { blog1: 'blog1' } } }), {
            virtual: true,
        });
        const utils = require('../../src/utils.js');
        expect(utils.getPostTypeConfig('blogs')).toEqual({ blog1: 'blog1' });
    });
});

describe('validateConfigurations', () => {
    test('missing postTypes', () => {
        jest.doMock('../../src/config.json', () => ({ contentDirectory: 'content1', outputDirectory: 'output1' }), { virtual: true });
        const utils = require('../../src/utils.js');
        expect(() => utils.validateConfigurations()).toThrow('missing required sections: postTypes');
    });

    test('missing sections', () => {
        jest.doMock('../../src/config.json', () => ({ contentDirectory: 'content2', outputDirectory: 'output2', postTypes: { recipes: { test: 'test' } } }), { virtual: true });
        const utils = require('../../src/utils.js');
        expect(() => utils.validateConfigurations()).toThrow('Check contains');
    });

    test('no missing items', () => {
        jest.doMock(
            '../../src/config.json',
            () => ({ contentDirectory: 'content3', outputDirectory: 'output3', postTypes: { recipes: { postTypeDisplayName: 'recipes', postTypeDirectory: 'recipes' } } }),
            { virtual: true },
        );
        const utils = require('../../src/utils.js');
        expect(() => utils.validateConfigurations()).not.toThrow('Check contains');
    });
});

test('setTempOutput and getOutputPath', () => {
    // tempOutputDirName tested in test for setHashPath > normalisePath
    const outputDir = '/folder';
    const utils = require('../../src/utils.js');
    expect(utils.getOutputPath()).not.toBe(outputDir);
    utils.setTempOutput(outputDir);
    expect(utils.getOutputPath()).toBe(outputDir);
    expect(() => utils.setTempOutput('')).toThrow('Invalid');
});

describe('prepareDirectory', () => {
    const mockFsProm = (isDirectory) => {
        jest.doMock('node:fs/promises', () => ({
            rm: jest.fn().mockResolvedValue(undefined),
            stat: jest.fn().mockResolvedValue({ isDirectory: () => isDirectory }),
            mkdir: jest.fn().mockResolvedValue(undefined),
        }));
    };

    test('should throw error on invalid output path', async () => {
        const utils = require('../../src/utils.js');
        const invalidPath = '/invalid/output';
        await expect(() => utils.prepareDirectory(invalidPath)).rejects.toThrow('Invalid path');
    });

    test('deletes and creates directory if valid path and exists', async () => {
        mockFsProm(true);
        const fsProm = require('node:fs/promises');
        const utils = require('../../src/utils.js');
        const validPath = utils.OUTPUT_DIR_PATH + '/output';
        await utils.prepareDirectory(validPath);
        expect(fsProm.rm).toHaveBeenCalledWith(validPath, { recursive: true, force: true });
        expect(fsProm.mkdir).toHaveBeenCalledWith(validPath);
    });

    test('creates and does not delete if directory does not exist', async () => {
        mockFsProm(false);
        const fsProm = require('node:fs/promises');
        const utils = require('../../src/utils.js');
        const validPath = utils.OUTPUT_DIR_PATH + '/output';
        await utils.prepareDirectory(validPath);
        expect(fsProm.rm).not.toHaveBeenCalled();
        expect(fsProm.mkdir).toHaveBeenCalledWith(validPath);
    });
});

test('getFileHash', async () => {
    const testBuffer = Buffer.from('hello world');
    jest.doMock('node:fs/promises', () => ({
        readFile: jest.fn().mockResolvedValue(testBuffer),
    }));
    const crypto = require('node:crypto');
    const expected = crypto.createHash('MD5').update(testBuffer).digest('hex');
    const fsProm = require('fs/promises');

    const utils = require('../../src/utils.js');
    const hash = await utils.getFileHash('/path/to/file');
    expect(hash).toBe(expected);
    expect(fsProm.readFile).toHaveBeenCalledWith('/path/to/file');
});

test('getStringHash', () => {
    const testString = 'hello world';
    const crypto = require('node:crypto');
    const expected = crypto.createHash('MD5').update(Buffer.from(testString, 'utf8')).digest('hex');
    const utils = require('../../src/utils.js');
    const hash = utils.getStringHash(testString);
    expect(hash).toBe(expected);
});

test('getHashFilename', () => {
    const utils = require('../../src/utils.js');
    const hashFilename = utils.getHashFilename('main', '1a2b3c', '.css');
    expect(hashFilename).toBe('main.1a2b3c.css');
});

describe('Hash path utils', () => {
    test('set and normalise path', () => {
        // Set tempOutputDirName to 'folder.tmp'
        const outputDir = '/folder.tmp';
        const utils = require('../../src/utils.js');
        utils.setTempOutput(outputDir);
        utils.setHashPath('test/folder.tmp/css/main.js', 'test/folder.tmp/css/main.1a2b3c.js');
        expect(utils.getHashPath('/css/main.js')).toBe('/css/main.1a2b3c.js');
    });

    test('should return original path if no mapping', () => {
        const utils = require('../../src/utils.js');
        expect(utils.getHashPath('/noexist/file.js')).toBe('/noexist/file.js');
    });

    test('should return all hash paths', () => {
        const utils = require('../../src/utils.js');
        utils.setHashPath('a.js', 'a.hash.js');
        utils.setHashPath('b.js', 'b.hash.js');
        const paths = utils.getHashPaths();
        expect(paths).toEqual({
            '/a.js': '/a.hash.js',
            '/b.js': '/b.hash.js',
        });
    });
});

test('isFeatureEnabled', () => {
    jest.doMock('../../src/config.json', () => ({ contentDirectory: 'featureContent', outputDirectory: 'featureOutput', feature: true }), {
        virtual: true,
    });
    const utils = require('../../src/utils.js');
    expect(utils.isFeatureEnabled('feature')).toBe(true);

    jest.doMock('../../src/config.json', () => ({ contentDirectory: 'featureContent', outputDirectory: 'featureOutput', falseFeature: false }), {
        virtual: true,
    });
    expect(utils.isFeatureEnabled('notFeature')).toBe(false);

    jest.doMock('../../src/config.json', () => ({ contentDirectory: 'featureContent', outputDirectory: 'featureOutput', emptyFeature: '' }), {
        virtual: true,
    });
    expect(utils.isFeatureEnabled('emptyFeature')).toBe(false);

    expect(utils.isFeatureEnabled('nonExistentFeature')).toBe(false);
});

test('removeLastS', () => {
    const utils = require('../../src/utils.js');
    expect(utils.removeLastS('hellosss')).toBe('helloss');
    expect(utils.removeLastS('helloss')).toBe('hellos');
    expect(utils.removeLastS('hellos')).toBe('hello');
    expect(utils.removeLastS('helloS')).toBe('hello');
    expect(utils.removeLastS('hello')).toBe('hello');
    expect(utils.removeLastS(123)).toBe(123);
    expect(utils.removeLastS('')).toBe('');
    expect(utils.removeLastS(null)).toBe(null);
    expect(utils.removeLastS(undefined)).toBe(undefined);
});

describe('Exists async', () => {
    test('dirExistsAsync true', async () => {
        jest.doMock('node:fs/promises', () => ({
            stat: jest.fn().mockResolvedValue({ isDirectory: () => true }),
        }));
        const utils = require('../../src/utils.js');
        await expect(utils.dirExistsAsync('/test')).resolves.toBe(true);
    });

    test('dirExistsAsync false', async () => {
        jest.doMock('node:fs/promises', () => ({
            stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
        }));
        const utils = require('../../src/utils.js');
        await expect(utils.dirExistsAsync('/test')).resolves.toBe(false);
    });

    test('dirExistsAsync exception indicates no directory', async () => {
        jest.doMock('node:fs/promises', () => ({
            stat: jest.fn().mockRejectedValue('no directory'),
        }));
        const utils = require('../../src/utils.js');
        await expect(utils.dirExistsAsync('/test')).resolves.toBe(false);
    });

    test('fileExistsAsync true', async () => {
        jest.doMock('node:fs/promises', () => ({
            stat: jest.fn().mockResolvedValue({ isFile: () => true }),
        }));
        const utils = require('../../src/utils.js');
        await expect(utils.fileExistsAsync('/test/file.txt')).resolves.toBe(true);
    });

    test('fileExistsAsync false', async () => {
        jest.doMock('node:fs/promises', () => ({
            stat: jest.fn().mockResolvedValue({ isFile: () => false }),
        }));
        const utils = require('../../src/utils.js');
        await expect(utils.fileExistsAsync('/test/file.txt')).resolves.toBe(false);
    });

    test('fileExistsAsync exception indicates no file', async () => {
        jest.doMock('node:fs/promises', () => ({
            stat: jest.fn().mockRejectedValue('no file'),
        }));
        const utils = require('../../src/utils.js');
        await expect(utils.dirExistsAsync('/test/file.txt')).resolves.toBe(false);
    });
});

describe('scrubSaveImage', () => {
    beforeEach(() => {
        jest.mock('node:fs', () => ({
            existsSync: jest.fn().mockReturnValue(true),
            createReadStream: jest.fn(),
            createWriteStream: jest.fn(),
        }));

        jest.mock('exif-be-gone');

        jest.mock('node:crypto', () => ({
            createHash: jest.fn().mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('mockhash123'),
            }),
        }));

        jest.mock('node:stream/promises', () => ({
            pipeline: jest.fn(async (...streams) => {
                const hashTransformer = streams[2];
                const testChunk = Buffer.from('test data');
                const callback = jest.fn();
                hashTransformer._transform(testChunk, 'utf8', callback);
                return Promise.resolve();
            }),
        }));

        jest.mock('node:fs/promises', () => ({
            rename: jest.fn().mockResolvedValue(),
        }));
    });

    test('should process image and return hash filename', async () => {
        const path = require('node:path');
        const fsProm = require('node:fs/promises');
        const { pipeline } = require('node:stream/promises');
        const utils = require('../../src/utils.js');

        const result = await utils.scrubSaveImage('/path/image.jpg', '/out', 'image.jpg');
        expect(pipeline).toHaveBeenCalled();
        expect(utils.getHashPath('/out/image.jpg')).toBe('/out/image.mockhash123.jpg');

        expect(fsProm.rename).toHaveBeenCalledTimes(1);
        expect(fsProm.rename).toHaveBeenCalledWith(path.join('/out', 'image.jpg.tmp'), path.join('/out/image.mockhash123.jpg'));
        expect(result).toBe('image.mockhash123.jpg');
    });

    test('should throw error if processing fails', async () => {
        jest.mock('node:stream/promises', () => ({
            pipeline: jest.fn().mockRejectedValue('test stream error'),
        }));
        const utils = require('../../src/utils.js');

        await expect(() => utils.scrubSaveImage('/path/image.jpg', '/out', 'image.jpg')).rejects.toThrow('Error removing exif');
    });
});
