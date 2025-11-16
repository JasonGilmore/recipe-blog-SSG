const express = require('express');
const app = express();
const path = require('node:path');
const srcUtils = require('./src/utils.js');
const utils = require('./lib/utils.js');
const visitCounter = require('./lib/visitCounter.js');
const port = process.env.PORT || 3000;

srcUtils.validateConfigurations();
app.set('trust proxy', true);

if (srcUtils.siteConfig.enableVisitCounter) {
    app.use(visitCounter.middleware);
    visitCounter.startAutoSave();
}

// Rewrite content paths and count visits
// When "/recipes/bread" serve "/recipes/bread/bread.html"
app.use((req, res, next) => {
    const { isContentItem, postName } = utils.parseContentRequest(req.path);
    if (isContentItem) {
        req.url = `${req.url}/${postName}.html`;
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
