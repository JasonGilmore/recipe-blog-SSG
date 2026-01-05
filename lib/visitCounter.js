// Simple visit counter with total post hits and daily stats. Daily unique app hits is captured using an ip and user-agent set.
// Visits are saved to memory immediately, and this is saved to disk every 1 hour.
// At the start of a new day (12am) the ip and user-agent set is cleared, and older than 30 day stats are deleted.
// Visit counting is in local time

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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

const appHitIpSetToday = new Set();
const TOTAL_POST_HITS_KEY = 'totalPostHits';
const UNIQUE_APP_HITS_KEY = 'uniqueAppHits';
const HOMEPAGE_HITS_KEY = 'homepageHits';
const POST_HITS_KEY = 'postHits';
const visitCounter = JSON.parse(fs.readFileSync(visitCountFilePath));
if (!visitCounter[TOTAL_POST_HITS_KEY]) {
    visitCounter[TOTAL_POST_HITS_KEY] = {};
}

function middleware(req, res, next) {
    try {
        // Don't include requests for assets
        const url = req.path;
        if (url.startsWith('/css') || url.startsWith('/js')) {
            return next();
        }
        countUniqueVisit(req.ip, req.headers['user-agent']);

        // Track specific site hits
        if (req.method === 'POST' && url == '/track-event' && req.body && req.body.event == 'pageview' && req.body.pathname) {
            const { isPost, matchedPostType, postName } = utils.parseRequest(req.body.pathname);
            if (isPost || req.body.pathname === '/') {
                const page = isPost ? postName : 'homepage';
                countPageVisit(matchedPostType, page);
            }

            return res.sendStatus(200);
        }
        next();
    } catch (err) {
        console.error('Error counting visits (middleware):', err);
        next();
    }
}

// Start timers to save visits
function startAutoSave() {
    // Save all visits every 1 hour, to reduce impact of data loss on server downtime
    setInterval(saveVisits, 60 * 60 * 1000).unref();

    // Schedule a reset at the start of a new day. Repeat every 24 hours
    const now = new Date();
    const closeToMidnight = new Date(now).setHours(23, 59, 59, 999);
    const msToMidnight = closeToMidnight - now + 1;

    setTimeout(() => {
        newDayReset();
        setInterval(newDayReset, 24 * 60 * 60 * 1000).unref();
    }, msToMidnight).unref();
}

// Update the unique site visit, to be saved on the next saveVisits
function countUniqueVisit(ip, userAgent) {
    const userAgentToUse = userAgent || '';
    const hash = generateHash(ip, userAgentToUse);
    if (!appHitIpSetToday.has(hash)) {
        appHitIpSetToday.add(hash);
        const statsToday = getStatsGroup(new Date());
        statsToday[UNIQUE_APP_HITS_KEY]++;
    }
}

// Update the page visit, to be saved on the next saveVisits
function countPageVisit(postType, page) {
    const statsToday = getStatsGroup(new Date());
    // Save the page visit
    // Homepage
    if (page === 'homepage') {
        statsToday[HOMEPAGE_HITS_KEY]++;
        return;
    }

    // Post page
    statsToday[POST_HITS_KEY]++;
    if (!visitCounter[TOTAL_POST_HITS_KEY][postType]) {
        visitCounter[TOTAL_POST_HITS_KEY][postType] = {};
    }
    visitCounter[TOTAL_POST_HITS_KEY][postType][page] = (visitCounter[TOTAL_POST_HITS_KEY][postType][page] || 0) + 1;
}

// Save all site visits
function saveVisits() {
    try {
        fs.writeFile(visitCountFilePath, JSON.stringify(visitCounter, null, 4), (err) => {
            if (err) {
                console.error('Error writing site visits:', err);
            }
        });
    } catch (err) {
        console.error('Error saving site visits to file (saveVisits):', err);
    }
}

function generateHash(ip, ua) {
    return crypto.createHash('MD5').update(ip).update('|').update(ua).digest('hex');
}

// Get the date's stats group, initialise if it doesn't exist
function getStatsGroup(date) {
    const day = getISODateFormat(new Date(date));
    if (!visitCounter[day]) {
        visitCounter[day] = {
            [UNIQUE_APP_HITS_KEY]: 0,
            [HOMEPAGE_HITS_KEY]: 0,
            [POST_HITS_KEY]: 0,
        };
    }
    return visitCounter[day];
}

// Called at the start of the day to reset
function newDayReset() {
    try {
        // Only reset if it is the start of a new day
        const now = new Date();
        if (!(now.getUTCHours() == 0 && now.getUTCMinutes() < 10)) {
            return;
        }

        appHitIpSetToday.clear();

        // Rotate daily stats, only store 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        for (const item in visitCounter) {
            if (item === TOTAL_POST_HITS_KEY) {
                continue;
            }
            const savedVisitDate = new Date(item);
            savedVisitDate.setHours(0, 0, 0, 0);
            if (savedVisitDate < thirtyDaysAgo) {
                delete visitCounter[item];
            }
        }
    } catch (err) {
        console.error('Error resetting visit counting (newDayReset):', err);
    }
}

// Returns the date in ISO format in the local timezone
function getISODateFormat(date) {
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
