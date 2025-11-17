const express = require('express');
const app = express();
const helmet = require('helmet');
const path = require('node:path');
const srcUtils = require('./src/utils.js');
const utils = require('./lib/utils.js');
const visitCounter = require('./lib/visitCounter.js');
const port = process.env.PORT || 3000;

srcUtils.validateConfigurations();
app.set('trust proxy', true);

// Precompute paths for cache control
const contentTypePaths = Object.keys(srcUtils.siteConfig.content).map((ct) => `/${ct}/`);
const assetPaths = ['/js', '/images', '/css'];

const CACHE_MAX_AGE_SECONDS = 30; // TODO update cache time
//res.set({ 'Cache-Control': 'public, max-age=345600, must-revalidate' }); // 4 days
const CONTENT_CACHE_HEADER = `public, max-age=${CACHE_MAX_AGE_SECONDS}, must-revalidate`;
const NO_CACHE_HEADER = 'no-cache';

app.use(
    helmet({
        strictTransportSecurity: false, // handled by reverse proxy
    })
);

if (srcUtils.siteConfig.enableVisitCounter) {
    app.use(visitCounter.middleware);
    visitCounter.startAutoSave();
}

// Rewrite content paths, count visits and set cache control
// When "/recipes/bread" serve "/recipes/bread/bread.html"
app.use((req, res, next) => {
    const { isContentItem, matchedContentType, postName } = utils.parseContentRequest(req.path);
    if (isContentItem) {
        req.url = `${req.url}/${postName}.html`;
    }
    next();
});

// Set cache control
app.use((req, res, next) => {
    const path = req.path;

    // Check if is content, noting that site pages like /recipes/ should not be included as may have new content
    const isContent = contentTypePaths.some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
    const isAsset = assetPaths.some((prefix) => path.startsWith(prefix));

    // Don't cache other content as it may change such as home page, content pages and footers
    res.setHeader('Cache-Control', isContent || isAsset ? CONTENT_CACHE_HEADER : NO_CACHE_HEADER);

    // if (isContent || isAsset) {
    //     console.log('Caching: ' + req.path);
    // } else {
    //     console.log('Not caching: ' + req.path);
    // }

    // TODO update so no server reload required on changes such as new contentTypePaths
    next();
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const server = app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});

const gracefulShutdown = (signal) => {
    setTimeout(() => {
        console.error('Forcing shutdown due to timeout.');
        process.exit(1);
    }, 3000);

    server.close((err) => {
        if (err) {
            console.error('Error during shutdown, forcing shutdown: ' + err);
            process.exit(1);
        }
        console.log('Server closed gracefully.');
        process.exit(0);
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
