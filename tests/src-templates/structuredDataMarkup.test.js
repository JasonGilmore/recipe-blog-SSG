require('html-validate/jest');
const sdm = require('../../src/templates/structuredDataMarkup.js');

beforeEach(() => {
    jest.clearAllMocks();
});

jest.mock('../../src/utils.js', () => ({
    ...jest.requireActual('../../src/utils.js'),
    siteContent: {
        siteUrl: 'https://example.com',
        siteName: 'Example Site',
        secondaryIntroduction: 'Welcome to the site',
    },
    getHashPath: jest.fn((p) => `${p}.hash`),
}));

describe('structuredDataMarkup', () => {
    const getSchemaType = (data, type) => {
        return data['@graph']?.find((item) => item['@type'] === type);
    };

    test('createHomepageData contains valid JSON-LD with WebPage and WebSite info', () => {
        const html = sdm.createHomepageData();
        expect(html).toHTMLValidate();
        expect(html).toContain('<script type="application/ld+json">');

        const jsonString = html.replace('<script type="application/ld+json">', '').replace('</script>', '');
        const data = JSON.parse(jsonString);
        expect(data['@graph']).toHaveLength(2);
        const webPage = getSchemaType(data, 'WebPage');
        expect(webPage.url).toBe('https://example.com');
        expect(webPage.name).toBe('Example Site');
        expect(webPage.description).toBe('Welcome to the site');
        expect(webPage.isPartOf['@type']).toBe('WebSite');

        const webSite = getSchemaType(data, 'WebSite');
        expect(webSite['@type']).toBe('WebSite');
        expect(webSite.url).toBe('https://example.com');
        expect(webSite.name).toBe('Example Site');
        expect(webSite.description).toBe('Welcome to the site');
    });

    test('createTopLevelData contains valid JSON-LD with breadcrumbs', () => {
        const postTypeConfig = { postTypeDirectory: 'recipes', postTypeDisplayName: 'Recipes' };
        const html = sdm.createTopLevelData(postTypeConfig, 'Top level desc');
        expect(html).toHTMLValidate();
        expect(html).toContain('<script type="application/ld+json">');

        const jsonString = html.replace('<script type="application/ld+json">', '').replace('</script>', '');
        const data = JSON.parse(jsonString);
        const webPage = getSchemaType(data, 'WebPage');
        expect(webPage.url).toBe('https://example.com/recipes/');
        expect(webPage.name).toBe('Recipes');
        expect(webPage.description).toBe('Top level desc');
        expect(webPage.isPartOf['@type']).toBe('WebSite');

        const breadcrumbList = getSchemaType(data, 'BreadcrumbList');
        const list = breadcrumbList.itemListElement;
        expect(list).toHaveLength(2);
        expect(list[0].position).toBe(1);
        expect(list[0].name).toBe('Example Site');
        expect(list[0].item).toBe('https://example.com');

        expect(list[1].position).toBe(2);
        expect(list[1].name).toBe('Recipes');
        expect(list[1].item).toBe('https://example.com/recipes/');
    });

    test('createPostData contains valid JSON-LD for Recipe structured data including breadcrumbs', () => {
        const postTypeConfig = { postTypeDirectory: 'recipes', structuredDataContentType: 'Recipe', postTypeDisplayName: 'Recipes' };
        const attrs = {
            title: 'R1',
            description: 'Desc',
            keywords: 'a,b',
            image: 'img.jpg',
            date: new Date('2026-02-01T12:00:00Z'),
        };

        const html = sdm.createPostData(postTypeConfig, attrs, '/recipes/r1');
        expect(html).toHTMLValidate();
        expect(html).toContain('<script type="application/ld+json">');

        const jsonString = html.replace('<script type="application/ld+json">', '').replace('</script>', '');
        const data = JSON.parse(jsonString);
        const recipe = getSchemaType(data, 'Recipe');
        expect(recipe.name).toBe('R1');
        expect(recipe.image).toBe('https://example.com/recipes/r1/img.jpg.hash');
        expect(recipe.datePublished).toBe('2026-02-01');
        expect(recipe.description).toBe('Desc');
        expect(recipe.keywords).toBe('a,b');

        expect(recipe.isPartOf).toHaveLength(2);
        const webPage = recipe.isPartOf.find((p) => p['@type'] === 'WebPage');
        expect(webPage['@id']).toBe('https://example.com/recipes/');
        const webSite = recipe.isPartOf.find((p) => p['@type'] === 'WebSite');
        expect(webSite['@type']).toBe('WebSite');

        const breadcrumbList = getSchemaType(data, 'BreadcrumbList');
        const list = breadcrumbList.itemListElement;
        expect(list).toHaveLength(3);
        expect(list[0].position).toBe(1);
        expect(list[0].name).toBe('Example Site');
        expect(list[0].item).toBe('https://example.com');

        expect(list[1].position).toBe(2);
        expect(list[1].name).toBe('Recipes');
        expect(list[1].item).toBe('https://example.com/recipes/');

        expect(list[2].position).toBe(3);
        expect(list[2].name).toBe('R1');
        expect(list[2].item).toBe('https://example.com/recipes/r1');
    });

    test('createPostData contains valid JSON-LD for BlogPosting structured data ', () => {
        const postTypeConfig = { postTypeDirectory: 'blogs', structuredDataContentType: 'BlogPosting', postTypeDisplayName: 'Blogs' };
        const attrs = {
            title: 'B1',
            description: 'Desc',
            keywords: 'a,b',
            image: 'img.jpg',
            date: new Date('2026-02-01T12:00:00Z'),
        };

        const html = sdm.createPostData(postTypeConfig, attrs, '/blogs/b1');
        expect(html).toHTMLValidate();
        expect(html).toContain('<script type="application/ld+json">');

        const jsonString = html.replace('<script type="application/ld+json">', '').replace('</script>', '');
        const data = JSON.parse(jsonString);
        const blog = getSchemaType(data, 'BlogPosting');
        expect(blog.name).toBe('B1');
        expect(blog.headline).toBe('B1');
        expect(blog.image).toBe('https://example.com/blogs/b1/img.jpg.hash');
        expect(blog.datePublished).toBe('2026-02-01T12:00:00.000Z');
        expect(blog.description).toBe('Desc');
        expect(blog.keywords).toBe('a,b');

        expect(blog.isPartOf).toHaveLength(2);
        const webPage = blog.isPartOf.find((p) => p['@type'] === 'WebPage');
        expect(webPage['@id']).toBe('https://example.com/blogs/');
        const webSite = blog.isPartOf.find((p) => p['@type'] === 'WebSite');
        expect(webSite['@type']).toBe('WebSite');
    });

    test('createPostData falls back to Article for unknown type', () => {
        const postTypeConfig = { postTypeDirectory: 'others', structuredDataContentType: 'Unknown', postTypeDisplayName: 'Others' };
        const attrs = {
            title: 'O1',
            description: 'Desc',
            keywords: 'a,b',
            image: 'img.jpg',
            date: new Date('2026-02-01T12:00:00Z'),
        };

        const html = sdm.createPostData(postTypeConfig, attrs, '/others/o1');
        expect(html).toHTMLValidate();
        expect(html).toContain('<script type="application/ld+json">');

        const jsonString = html.replace('<script type="application/ld+json">', '').replace('</script>', '');
        const data = JSON.parse(jsonString);
        const other = getSchemaType(data, 'Article');
        expect(other.name).toBe('O1');
        expect(other.image).toBe('https://example.com/others/o1/img.jpg.hash');
        expect(other.datePublished).toBe('2026-02-01T12:00:00.000Z');
        expect(other.description).toBe('Desc');
        expect(other.keywords).toBe('a,b');

        expect(other.isPartOf).toHaveLength(2);
        const webPage = other.isPartOf.find((p) => p['@type'] === 'WebPage');
        expect(webPage['@id']).toBe('https://example.com/others/');
        const webSite = other.isPartOf.find((p) => p['@type'] === 'WebSite');
        expect(webSite['@type']).toBe('WebSite');
    });

    test('createGenericPageData contains valid JSON-LD', () => {
        const html = sdm.createGenericPageData('About', '/about');
        expect(html).toHTMLValidate();
        expect(html).toContain('<script type="application/ld+json">');

        const jsonString = html.replace('<script type="application/ld+json">', '').replace('</script>', '');
        const data = JSON.parse(jsonString);
        const webPage = getSchemaType(data, 'WebPage');
        expect(webPage.url).toBe('https://example.com/about');
        expect(webPage.name).toContain('About');
        expect(webPage.isPartOf['@type']).toBe('WebSite');
    });
});
