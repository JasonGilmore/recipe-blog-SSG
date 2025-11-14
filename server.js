const fs = require('fs');
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const utils = require('./src/utils.js');

// Prepare visit counter
const visitCountFilePath = path.join(__dirname, 'visitCounter.json');
if (!fs.existsSync(visitCountFilePath)) {
    fs.writeFileSync(visitCountFilePath, JSON.stringify({}));
}
const visitCounter = JSON.parse(fs.readFileSync(visitCountFilePath));

function incrementSiteVisit(contentType, pageName) {
    if (!visitCounter[contentType]) {
        visitCounter[contentType] = {};
    }
    visitCounter[contentType][pageName] = (visitCounter[contentType][pageName] || 0) + 1;
    fs.writeFile(visitCountFilePath, JSON.stringify(visitCounter, null, 4), (err) => {
        if (err) {
            console.error('Error writing counter file: ', err);
        }
    });
}

utils.validateConfigurations();
const contentTypes = Object.keys(utils.siteConfig.content);

// Rewrite content paths and count visits
// When "/recipes/bread" serve "/public/recipes/bread/bread.html"
app.use((req, res, next) => {
    const noExt = !path.extname(req.path);
    let matchedContentType;
    const isContent = contentTypes.some((contentType) => {
        if (req.path.startsWith(`/${contentType}`)) {
            matchedContentType = contentType;
            return true;
        }
        return false;
    });

    const reqParts = req.path.split('/').filter(Boolean);
    if (noExt && isContent && reqParts.length > 1) {
        const contentItem = reqParts[reqParts.length - 1];
        incrementSiteVisit(matchedContentType, contentItem);
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
