const config = require('../src/config.json');
const path = require('path');

const OUTPUT_DIRECTORY = path.join(__dirname, config.outputDirectory);

function capitaliseFirstLetter(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

module.exports = { OUTPUT_DIRECTORY, capitaliseFirstLetter };
