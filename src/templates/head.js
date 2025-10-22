const siteContent = require('./siteContent.json');
const utils = require('../utils.js');

function createHead() {
    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <!-- TODO additional meta such as description -->
                <!-- TODO open graph data -->
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${siteContent.siteName}</title>
                <link rel="icon" type="image/x-icon" href="${utils.IMAGE_ASSETS_FOLDER}/favicon.ico" />
                <link rel="stylesheet" href="/css/main.css" />
            </head>
    `;
}

module.exports = createHead;
