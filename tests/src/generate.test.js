beforeEach(() => {
    jest.clearAllMocks();
});

const testOutputPath = 'output';
const testTempOutputPath = 'temp';
const testContentPath = 'content';
const postType = 'blogs';

jest.mock('node:fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
}));
jest.doMock('../../src/config.json', () => ({ contentDirectory: 'mockcontent', outputDirectory: 'mockoutput' }), { virtual: true });
jest.doMock('../../src/templates/siteContent.json', () => ({ siteUrl: 'test' }), { virtual: true });
jest.mock('../../src/utils.js', () => {
    const originalModule = jest.requireActual('../../src/utils.js');
    return {
        ...originalModule,
        OUTPUT_DIR_PATH: testOutputPath,
        CONTENT_DIR_PATH: testContentPath,
        dirExistsAsync: jest.fn().mockResolvedValue(true),
        siteConfig: { postTypes: { [postType]: { postTypeDirectory: 'dir' } } },
        getPostTypeConfig: jest.fn(),
        ALLOWED_IMAGE_EXTENSIONS: ['.jpg'],
        scrubSaveImage: jest.fn(),
    };
});
jest.mock('node:fs/promises', () => ({
    rm: jest.fn(),
    rename: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
}));
jest.mock('marked', () => ({ parse: jest.fn(() => '<p>html</p>') }));

const fsProm = require('node:fs/promises');
const path = require('node:path');
const utils = require('../../src/utils.js');
utils.setTempOutput(testTempOutputPath);
const generate = require('../../src/generate.js');

describe('atomicSwap', () => {
    const tempPath = 'output.tmp';
    const backupPath = 'output.old';

    test('atomic swap', async () => {
        await generate.atomicSwap(tempPath, backupPath);
        // Old backup folder removed
        expect(fsProm.rm).toHaveBeenCalledWith(backupPath, expect.anything());
        // Existing output folder renamed to backup
        expect(fsProm.rename).toHaveBeenCalledWith(testOutputPath, backupPath);
        // Already generated temp folder renamed to output
        expect(fsProm.rename).toHaveBeenCalledWith(tempPath, testOutputPath);
        // Backup deleted
        expect(fsProm.rm).toHaveBeenCalledWith(backupPath, expect.anything());
        // Final call amounts
        expect(fsProm.rm).toHaveBeenCalledTimes(2);
        expect(fsProm.rename).toHaveBeenCalledTimes(2);
    });

    test('restore backup on error if backup folder exists', async () => {
        // First rename from existing output to backup successful, second fail
        utils.dirExistsAsync.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        fsProm.rename.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('test second rename error'));

        await expect(generate.atomicSwap(tempPath, backupPath)).rejects.toThrow('test second rename error');
        // Backup restored
        expect(fsProm.rename).toHaveBeenCalledWith(backupPath, testOutputPath);
    });

    test('do not restore backup on error if backup folder does not exist', async () => {
        // First rename from existing output to backup fail
        utils.dirExistsAsync.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        fsProm.rename.mockRejectedValueOnce(new Error('test first rename error'));

        await expect(generate.atomicSwap(tempPath, backupPath)).rejects.toThrow('test first rename error');
        // Backup not restored
        expect(fsProm.rename).not.toHaveBeenCalledWith(backupPath, testOutputPath);
    });
});

test('prepareSiteGeneration', async () => {
    utils.getPostTypeConfig.mockReturnValue({ postTypeDirectory: 'blogdir' });
    fsProm.readdir.mockResolvedValueOnce(['blog1', 'blog2']).mockResolvedValueOnce(['blog1 post1', 'blog1 post2']).mockResolvedValueOnce(['blog2 post1', 'blog2 post2']);

    const mockGenerateImages = jest.fn().mockResolvedValue();
    const expectedMeta = {
        title: 'Test post',
        description: 'Test description',
    };
    const mockGetPostMeta = jest.fn().mockResolvedValue(expectedMeta);
    const result = await generate.prepareSiteGeneration({ generateImages: mockGenerateImages, getPostMeta: mockGetPostMeta });

    expect(mockGenerateImages).toHaveBeenCalledTimes(2);
    expect(mockGenerateImages).toHaveBeenCalledWith(path.join(testContentPath, 'blogdir', 'blog1'), path.join(testTempOutputPath, 'blogdir', 'blog1'), [
        'blog1 post1',
        'blog1 post2',
    ]);
    expect(mockGenerateImages).toHaveBeenCalledWith(path.join(testContentPath, 'blogdir', 'blog2'), path.join(testTempOutputPath, 'blogdir', 'blog2'), [
        'blog2 post1',
        'blog2 post2',
    ]);
    expect(mockGetPostMeta).toHaveBeenCalledTimes(2);
    expect(mockGetPostMeta).toHaveBeenCalledWith(path.join(testContentPath, 'blogdir', 'blog1'), postType, 'blog1', ['blog1 post1', 'blog1 post2']);
    expect(mockGetPostMeta).toHaveBeenCalledWith(path.join(testContentPath, 'blogdir', 'blog2'), postType, 'blog2', ['blog2 post1', 'blog2 post2']);

    expect(result).toEqual([expectedMeta, expectedMeta]);
});

test('generateImages', async () => {
    fsProm.mkdir.mockResolvedValue(true);
    const postFiles = ['post1', 'post2'];
    const mockGetPostImages = jest.fn().mockReturnValue({ filter: () => postFiles });
    utils.scrubSaveImage.mockResolvedValue();
    await generate.generateImages('/content/blogdir/blog1', '/output/blogdir/blogdir1', postFiles, { getPostImages: mockGetPostImages });

    expect(fsProm.mkdir).toHaveBeenCalledTimes(1);
    expect(fsProm.mkdir).toHaveBeenCalledWith('/output/blogdir/blogdir1', expect.anything());
    expect(utils.scrubSaveImage).toHaveBeenCalledTimes(2);
    expect(utils.scrubSaveImage).toHaveBeenCalledWith(path.join('/content/blogdir/blog1', 'post1'), '/output/blogdir/blogdir1', 'post1');
});

test('getPostImages', () => {
    expect(generate.getPostImages(['post1.jpg', 'post2.pdf'])).toEqual(['post1.jpg']);
    expect(generate.getPostImages(['post1.test', 'post2.pdf'])).toEqual([]);
    expect(generate.getPostImages([])).toEqual([]);
    expect(generate.getPostImages()).toEqual([]);
    expect(generate.getPostImages('test')).toEqual([]);
    expect(generate.getPostImages(null)).toEqual([]);
    expect(generate.getPostImages(undefined)).toEqual([]);
});

test('getPostMeta', async () => {
    utils.getPostTypeConfig.mockReturnValue({ postTypeDirectory: 'blogdir' });
    const mockGetMdFile = jest.fn().mockReturnValue('test-post.md');
    fsProm.readFile.mockResolvedValue('test content');
    const mockFm = jest.fn().mockReturnValue({
        attributes: {
            image: 'test-thumb.jpg',
            description: 'Test description',
        },
    });

    const result = await generate.getPostMeta('/content/blogdir/blog1', 'blog', 'blog1', ['post1.md'], { getMdFile: mockGetMdFile, fm: mockFm });
    expect(result).toEqual({
        description: 'Test description',
        link: '/blogdir/blog1',
        imageHashPath: '/blogdir/blog1/test-thumb.jpg',
        postType: 'blog',
        mdFilename: 'test-post.md',
    });

    // If no md file should get empty response
    const mockGetMdFileEmpty = jest.fn().mockReturnValue(null);
    const emptyResult = await generate.getPostMeta('/content/blogdir/blog1', 'blog', 'blog1', ['post1.md'], { getMdFile: mockGetMdFileEmpty, fm: mockFm });
    expect(emptyResult).toBe(undefined);
});

test('getMdFile', () => {
    expect(generate.getMdFile(['post1.md', 'post2.pdf'])).toEqual('post1.md');
    expect(generate.getMdFile(['post1.test', 'post2.pdf'])).toEqual(undefined);
    expect(generate.getMdFile([])).toEqual(undefined);
    expect(generate.getMdFile()).toEqual(undefined);
    expect(generate.getMdFile('test')).toEqual(undefined);
    expect(generate.getMdFile(null)).toEqual(undefined);
    expect(generate.getMdFile(undefined)).toEqual(undefined);
});

test('generateContent', async () => {
    utils.siteConfig.postTypes = {
        blogs: { test: 'dir' },
        recipes: { test: 'dir' },
    };
    const mockGeneratePosts = jest.fn().mockResolvedValue();
    await generate.generateContent({ generatePosts: mockGeneratePosts });
    expect(mockGeneratePosts).toHaveBeenCalledTimes(2);
    expect(mockGeneratePosts).toHaveBeenNthCalledWith(1, 'blogs');
    expect(mockGeneratePosts).toHaveBeenNthCalledWith(2, 'recipes');

    mockGeneratePosts.mockClear();
    utils.siteConfig.postTypes = {};
    expect(mockGeneratePosts).not.toHaveBeenCalled();
});

describe('generatePosts', () => {
    let mockGeneratePostPage;
    beforeEach(() => {
        utils.getPostTypeConfig.mockReturnValue({ postTypeDirectory: 'blogdir' });
        mockGeneratePostPage = jest.fn().mockResolvedValue();
    });
    test('generates posts', async () => {
        fsProm.readdir.mockResolvedValueOnce(['blog1', 'blog2']).mockResolvedValueOnce(['blog1 img', 'blog1 md']).mockResolvedValueOnce(['blog2 img', 'blog2 md']);
        await generate.generatePosts('blogs', { generatePostPage: mockGeneratePostPage });
        expect(mockGeneratePostPage).toHaveBeenCalledTimes(2);
        expect(mockGeneratePostPage).toHaveBeenCalledWith('blogs', ['blog1 img', 'blog1 md'], path.join(testContentPath, 'blogdir', 'blog1'), 'blog1');
        expect(mockGeneratePostPage).toHaveBeenCalledWith('blogs', ['blog2 img', 'blog2 md'], path.join(testContentPath, 'blogdir', 'blog2'), 'blog2');
    });

    test('throws on invalid configuration', async () => {
        utils.getPostTypeConfig.mockReturnValue(undefined);
        await expect(generate.generatePosts('', { generatePostPage: mockGeneratePostPage })).rejects.toThrow('Invalid');
        expect(mockGeneratePostPage).not.toHaveBeenCalled();
    });

    test('does not generate on empty directories', async () => {
        utils.getPostTypeConfig.mockReturnValue({ postTypeDirectory: 'blogdir' });
        fsProm.readdir.mockResolvedValueOnce([]);
        await generate.generatePosts('blogs', { generatePostPage: mockGeneratePostPage });
        expect(mockGeneratePostPage).not.toHaveBeenCalled();
    });
});

describe('generatePostPage', () => {
    beforeEach(() => {
        utils.getPostTypeConfig.mockReturnValue({ postTypeDirectory: 'blogdir' });
    });

    test('generates post page', async () => {
        fsProm.readFile.mockResolvedValue('test content');
        fsProm.writeFile.mockResolvedValue();
        const mockDeps = {
            getMdFile: jest.fn().mockReturnValue('blog1.md'),
            fm: jest.fn().mockReturnValue({
                attributes: {
                    image: 'test-thumb.jpg',
                    description: 'Test description',
                },
                body: 'Test body',
            }),
            marked: { parse: jest.fn() },
            templateHelper: {
                formatPostHtml: jest.fn().mockReturnValue('<p>content</p>'),
                processHtml: jest.fn().mockReturnValue('<p>content</p>'),
            },
            generatePost: jest.fn(),
        };

        await generate.generatePostPage('blogs', ['blog1.md'], '/content/blogdir/blog1', 'blog1', mockDeps);
        expect(fsProm.readFile).toHaveBeenCalledWith(path.join('/content/blogdir/blog1', 'blog1.md'), 'utf8');
        expect(mockDeps.fm).toHaveBeenCalledWith('test content');
        expect(mockDeps.marked.parse).toHaveBeenCalledWith('Test body');
        expect(fsProm.writeFile).toHaveBeenCalledWith(expect.stringContaining('blog1.html'), '<p>content</p>', 'utf8');
    });

    test('throws on missing md file', async () => {
        const mockGetMdFile = jest.fn().mockReturnValue(undefined);
        await expect(generate.generatePostPage('blogs', [], '/content/blogdir/blog1', 'blog1', { getMdFile: mockGetMdFile })).rejects.toThrow('Missing markdown');
    });
});

describe('getRecentPosts', () => {
    const mockPosts = [
        { title: 'Old Post', date: '2024-01-01' },
        { title: 'Newest Post', date: '2026-01-01' },
        { title: 'Middle Post', date: '2025-01-01' },
    ];

    test('sort posts by date descending', () => {
        const result = generate.getRecentPosts(mockPosts, 2);
        expect(result[0].title).toBe('Newest Post');
        expect(result[1].title).toBe('Middle Post');
    });

    test('return specified number of posts', () => {
        const result = generate.getRecentPosts(mockPosts, 1);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Newest Post');
    });

    test('return all posts if number of posts less than specified', () => {
        const result = generate.getRecentPosts(mockPosts, 100);
        expect(result).toHaveLength(3);
    });

    test('handle empty arrays', () => {
        const result = generate.getRecentPosts([], 5);
        expect(result).toEqual([]);
    });

    test('not mutate the original array', () => {
        const originalOrder = [...mockPosts].map((p) => p.title);
        generate.getRecentPosts(mockPosts, 2);
        const currentOrder = mockPosts.map((p) => p.title);
        expect(currentOrder).toEqual(originalOrder);
    });

    test('push invalid date strings to bottom', () => {
        const messyPosts = [
            { title: 'Bad Date', date: 'invalid' },
            { title: 'New Post', date: '2026-01-01' },
            { title: 'Old Post', date: '2020-01-01' },
        ];

        const result = generate.getRecentPosts(messyPosts, 3);
        expect(result[0].title).toBe('New Post');
        expect(result[1].title).toBe('Old Post');
        expect(result[2].title).toBe('Bad Date');
    });
});
