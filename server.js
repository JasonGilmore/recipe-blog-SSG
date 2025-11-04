const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const utils = require('./src/utils.js');

utils.validateConfigurations();
const contentTypes = Object.keys(utils.siteConfig.content);

// Rewrite content paths
// When "/recipes/bread" serve "/public/recipes/bread/bread.html"
app.use((req, res, next) => {
    const noExt = !path.extname(req.path);
    const isContent = contentTypes.some((contentType) => req.path.startsWith(`/${contentType}`));
    const reqParts = req.path.split('/').filter(Boolean);
    if (noExt && isContent && reqParts.length > 1) {
        const contentItem = reqParts[reqParts.length - 1];
        req.url = `${req.url}/${contentItem}.html`;
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
            console.error('Error during shutdown, forcing shutdown.');
            process.exit(1);
        }
        console.log('Server closed gracefully.');
        process.exit(0);
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
