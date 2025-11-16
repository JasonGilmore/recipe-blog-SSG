// Simple visit counter per page and per unique site visit
// Unique site visit is captured using an ip address set, and saved at midnight for the previous day
// Visit count is in local time

const fs = require('node:fs');
const path = require('node:path');
const utils = require('./utils');

// Prepare visit counter
const visitCounterDirectory = path.join(__dirname, '../data');
if (!fs.existsSync(visitCounterDirectory)) {
    fs.mkdirSync(visitCounterDirectory);
}
const visitCountFilePath = path.join(__dirname, '../data/visitCounts.json');
if (!fs.existsSync(visitCountFilePath)) {
    fs.writeFileSync(visitCountFilePath, JSON.stringify({}));
}

const visitCounter = JSON.parse(fs.readFileSync(visitCountFilePath));
const ipSetToday = new Set();
const uniqueVisitsLabel = 'uniqueVisits';

// Update the page visit, count will be saved on the next saveVisits
function countPageVisit(contentType, pageName) {
    if (!visitCounter[contentType]) {
        visitCounter[contentType] = {};
    }
    visitCounter[contentType][pageName] = (visitCounter[contentType][pageName] || 0) + 1;
}

// Add unique visits to visitCounter, to be saved on the next saveVisits
// Called at the start of the day, to save the previous day's visits, and resets the visit counter
function addUniqueVisits() {
    try {
        // Only save if it is the start of the next day
        const now = new Date();
        if (!(now.getUTCHours == 0 && now.getUTCMinutes < 10)) {
            return;
        }

        if (!visitCounter[uniqueVisitsLabel]) {
            visitCounter[uniqueVisitsLabel] = {};
        }

        const previousDay = new Date(now);
        previousDay.setDate(previousDay.getDate() - 1);
        const formattedDate = getDateFormat(previousDay);
        visitCounter[uniqueVisitsLabel][formattedDate] = ipSetToday.size;
        ipSetToday.clear();

        // Rotate unique visits, only store 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        for (const date in visitCounter[uniqueVisitsLabel]) {
            const savedVisitDate = new Date(date);
            savedVisitDate.setHours(0, 0, 0, 0);
            if (savedVisitDate < thirtyDaysAgo) {
                delete visitCounter[uniqueVisitsLabel][date];
            }
        }
    } catch (err) {
        console.error('Error updating visits (addUniqueVisits): ', err);
    }
}

// Save all site visits
function saveVisits() {
    try {
        fs.writeFile(visitCountFilePath, JSON.stringify(visitCounter, null, 4), (err) => {
            if (err) {
                console.error('Error writing site visits: ', err);
            }
        });
    } catch (err) {
        console.error('Error saving site visits to file (saveVisits): ', err);
    }
}

function middleware(req, res, next) {
    try {
        // Don't include requests for assets
        const url = req.path;
        if (!(url.startsWith('/css') || url.startsWith('/js') || url.startsWith('/images'))) {
            setUniqueVisit(req.ip);
            const { isContentItem, matchedContentType, postName } = utils.parseContentRequest(req.path);
            if (isContentItem) {
                countPageVisit(matchedContentType, postName);
            }
        }
    } catch (err) {
        console.error('Error counting visits (middleware): ', err);
    } finally {
        next();
    }
}

// Start timers to save visits
function startAutoSave() {
    // Save page visits every 1 hour, to reduce impact of data loss on server downtime
    setInterval(saveVisits, 60 * 60 * 1000);

    // Schedule setting unique visits at midnight, to set the previous day's visits. Repeat every 24 hours
    const now = new Date();
    const closeToMidnight = new Date(now).setHours(23, 59, 59, 999);
    const msToMidnight = closeToMidnight - now + 1;

    setTimeout(() => {
        addUniqueVisits();
        setInterval(addUniqueVisits, 24 * 60 * 60 * 1000);
    }, msToMidnight);
}

function setUniqueVisit(ip) {
    ipSetToday.add(ip);
}

// Returns the date in ISO format in the local timezone
function getDateFormat(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
}

module.exports = {
    middleware,
    startAutoSave,
};
