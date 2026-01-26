// Simple visit counter with total post hits and daily stats. Daily unique app hits is captured using an ip and user-agent set.
// Visits are saved to memory immediately, and this is saved to disk every 1 hour.
// At the start of a new day (12am) the ip and user-agent set is cleared, and older than 30 day stats are deleted.
// Visit counting is in local time with prototype pollution defenses

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const srcUtils = require('../src/utils.js');
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
const searchTermFreqToday = new Map();

const TOTAL_POST_HITS_KEY = 'totalPostHits';
const UNIQUE_APP_HITS_KEY = 'uniqueAppHits';
const HOMEPAGE_HITS_KEY = 'homepageHits';
const POST_HITS_KEY = 'postHits';
const SEARCH_HITS_KEY = 'searchHits';
const TOP_SEARCHES_KEY = 'topSearches';

// Load saved visit counts
let visitCounter;
try {
    visitCounter = JSON.parse(fs.readFileSync(visitCountFilePath), (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.assign(Object.create(null), value);
        }
        return value;
    });
} catch (err) {
    console.log('Failed to parse existing visitCounts.json, starting fresh.');
    visitCounter = Object.create(null);
}

if (!visitCounter[TOTAL_POST_HITS_KEY]) {
    visitCounter[TOTAL_POST_HITS_KEY] = Object.create(null);
}

// Restore searchTermFreqToday on server boot to minimise impact of server restart
const statsToday = getStatsGroup(new Date());
const topSearchesObj = statsToday[TOP_SEARCHES_KEY] || Object.create(null);
for (const [key, value] of Object.entries(topSearchesObj)) {
    searchTermFreqToday.set(key, value);
}

// Visits are not recorded if ?test=true or if an asset
// pathname includes search string
function middleware(req, res, next) {
    try {
        const lowerCasePath = req.path ? req.path.toLowerCase() : req.path;
        const shouldSkipCounting = req.query.test?.toLowerCase() === 'true' || (typeof req.body?.pathname === 'string' && req.body.pathname.toLowerCase().includes('test=true'));

        // Count unique visit
        if (req.method === 'GET' && !shouldSkipCounting) {
            countUniqueVisit(req.ip, req.headers['user-agent']);
        }

        // Skip assets
        const isImage = srcUtils.allowedImageExtensions.some((ext) => lowerCasePath.endsWith(ext)) || lowerCasePath.endsWith('.ico');
        if (lowerCasePath.startsWith(`/${srcUtils.CSS_FOLDER}`) || lowerCasePath.startsWith(`/${srcUtils.JS_FOLDER}`) || lowerCasePath.endsWith('.json') || isImage) {
            return next();
        }

        // Skip tracking test traffic
        if (req.method === 'POST' && lowerCasePath === '/track-event' && shouldSkipCounting) {
            return res.sendStatus(200);
        }

        // Count page hits
        if (req.method === 'POST' && lowerCasePath === '/track-event' && req.body?.event === 'pageview' && typeof req.body?.pathname === 'string') {
            const path = req.body.pathname.split('?')[0].toLowerCase();
            const { isPost, matchedPostType, postName } = utils.parseRequest(path);

            if (isPost || path === '/') {
                const page = isPost ? postName : 'homepage';
                countPageVisit(matchedPostType, page);
            }

            return res.sendStatus(200);
        }

        // Count search hits and terms
        if (req.method === 'POST' && lowerCasePath === '/track-event' && req.body?.event === 'search' && typeof req.body?.query === 'string') {
            countSearch(req.body.query);
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

    // Schedule the new day reset
    scheduleNextMidnight();
}

// Schedule reset at next local midnight
// Recalculate midnight after each run to account for drift and DST shifts
function scheduleNextMidnight() {
    const now = new Date();
    const nextLocalMidnight = new Date(now).setHours(24, 0, 0, 0);
    const msToMidnight = nextLocalMidnight - now;

    setTimeout(() => {
        try {
            newDayReset();
        } finally {
            scheduleNextMidnight();
        }
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
        visitCounter[TOTAL_POST_HITS_KEY][postType] = Object.create(null);
    }
    visitCounter[TOTAL_POST_HITS_KEY][postType][page] = (visitCounter[TOTAL_POST_HITS_KEY][postType][page] || 0) + 1;
}

// Update the search hit, to be saved on the next saveVisits
function countSearch(query) {
    const MAX_QUERY_LENGTH = 100;
    const MAX_KEYS = 10000;
    const cleanQuery = query.toLowerCase().trim().slice(0, MAX_QUERY_LENGTH);
    if (!cleanQuery) return;

    const statsToday = getStatsGroup(new Date());
    statsToday[SEARCH_HITS_KEY]++;

    let count = searchTermFreqToday.get(cleanQuery) || 0;
    if (count > 0) {
        searchTermFreqToday.set(cleanQuery, ++count);
    } else if (searchTermFreqToday.size < MAX_KEYS) {
        searchTermFreqToday.set(cleanQuery, 1);
    }
}

// Save all site visits
function saveVisits() {
    // Calculate and add frequent searches
    const statsToday = getStatsGroup(new Date());
    statsToday[TOP_SEARCHES_KEY] = getTopSearches();

    // Save with atomic write
    try {
        const tmpPath = `${visitCountFilePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(visitCounter, null, 4), 'utf8');
        fs.renameSync(tmpPath, visitCountFilePath);
    } catch (err) {
        console.error('Error saving site visits to file (saveVisits):', err);
    }
}

// Returns the top results limited by MAX_RESULTS, but will extend in case of a tie
function getTopSearches() {
    const MAX_RESULTS = 5;
    const sorted = Array.from(searchTermFreqToday.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length < MAX_RESULTS) return Object.assign(Object.create(null), Object.fromEntries(sorted));
    const thresholdFreq = sorted[MAX_RESULTS - 1][1];
    return Object.assign(Object.create(null), Object.fromEntries(sorted.filter((entry) => entry[1] >= thresholdFreq)));
}

function generateHash(ip, ua) {
    return crypto.createHash('MD5').update(ip).update('|').update(ua).digest('hex');
}

// Get the date's stats group, initialise if it doesn't exist
function getStatsGroup(date) {
    const day = getISODateFormat(new Date(date));

    const DEFAULT_STATS = Object.assign(Object.create(null), {
        [UNIQUE_APP_HITS_KEY]: 0,
        [HOMEPAGE_HITS_KEY]: 0,
        [POST_HITS_KEY]: 0,
        [SEARCH_HITS_KEY]: 0,
        [TOP_SEARCHES_KEY]: null,
    });

    if (!visitCounter[day]) {
        visitCounter[day] = DEFAULT_STATS;
    } else {
        // If day already initialised, merge defaults in case of property changes
        visitCounter[day] = Object.assign(Object.create(null), DEFAULT_STATS, visitCounter[day]);
    }

    return visitCounter[day];
}

// Called at the start of the day to reset
function newDayReset() {
    try {
        saveVisits();
        appHitIpSetToday.clear();
        searchTermFreqToday.clear();

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
