const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const srcUtils = require('./src/utils.js');
const utils = require('./lib/utils.js');

const port = process.env.PORT || 3000;
const app = express();
srcUtils.validateConfigurations();
app.set('trust proxy', true);

app.use(
    helmet({
        strictTransportSecurity: false, // handled by reverse proxy
    })
);

if (srcUtils.isFeatureEnabled('enableVisitCounter')) {
    const visitCounter = require('./lib/visitCounter.js');
    app.use(express.json());
    app.use(visitCounter.middleware);
    visitCounter.startAutoSave();
}

// Rewrite canonical post paths
// When "/recipes/bread" serve "/recipes/bread/bread.html"
app.use((req, res, next) => {
    const { isPost, isCanonicalPostPath, matchedPostType, postName } = utils.parseRequest(req.path);
    if (isPost && isCanonicalPostPath) {
        const newPath = `/${matchedPostType}/${postName}/${postName}`;
        const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        req.url = newPath + queryString;
    }
    next();
});

// Set cache control
app.use((req, res, next) => {
    const path = req.path;

    // Images and assets use content hash filenames for cache busting
    // Cache images for 5 days
    const isImage = srcUtils.allowedImageExtensions.some((ext) => path.endsWith(ext));
    if (isImage || path.endsWith('.ico')) {
        res.setHeader('Cache-Control', 'public, max-age=432000, must-revalidate');
    } else if (path.endsWith('.js') || path.endsWith('.css')) {
        // Cache static assets for 5 days
        res.setHeader('Cache-Control', 'public, max-age=432000, must-revalidate');
    } else {
        // All other content such as html pages do not cache
        res.setHeader('Cache-Control', 'no-cache');
    }

    next();
});

// Allow cross origin request to image files for link preview tools
// Image files are from the images folder (for favicon and other images) and each post's icon image
app.use((req, res, next) => {
    const isImage = srcUtils.allowedImageExtensions.some((suffix) => req.path.endsWith(suffix)) || req.path.endsWith('.ico');
    if (isImage) {
        const isIconImage = req.path.includes('-icon');
        const isImageFolder = req.path.startsWith(`/${srcUtils.IMAGE_ASSETS_FOLDER}`);
        if (isIconImage || isImageFolder) {
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
    }
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
