let searchDialog = null;
let searchResultsContainer = null;
let searchInput = null;
let placeholders = '#SEARCH_PLACEHOLDERS';

let searchTimeout = null;
let searchIndex = null;
let searchStore = null;
let searchPromise = null;
let searchFailures = 0;

const searchTrack = '#SEARCH_TRACK_PLACEHOLDER';
let searchTrackTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    // Handle open dialog
    document.addEventListener('click', (e) => {
        if (e.target.closest('.search-button')) {
            showSearch();
            closeBurger();
        }
    });

    // Handle close dialog
    searchDialog = document.querySelector('.search-dialog');
    searchResultsContainer = document.querySelector('.search-results');

    const closeDialog = () => searchDialog.close();
    const closeSearchBtn = document.querySelector('.close-search');
    closeSearchBtn.addEventListener('click', closeDialog);
    closeSearchBtn.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            closeDialog();
        }
    });

    // Debounce search
    searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', (event) => {
        clearTimeout(searchTimeout);

        if (event.target.value.trim() === '') {
            searchResultsContainer.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(event.target.value);
        }, 400);

        if (searchTrack) {
            clearTimeout(searchTrackTimeout);
            searchTrackTimeout = setTimeout(() => {
                trackSearch(event.target.value);
            }, 2000);
        }
    });

    // If touch device using virtual keyboard, hide the keyboard on enter since search results already shown
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (navigator.maxTouchPoints > 0 && window.visualViewport.height < window.innerHeight) {
                searchInput.blur();
            }
        }
    });
});

function showSearch() {
    searchDialog.showModal();

    // When search is opened, randomise the search input placeholder
    if (searchDialog.open) {
        searchInput.placeholder = Array.isArray(placeholders) ? placeholders[Math.floor(Math.random() * placeholders.length)] : placeholders;
    }

    // Preload the search index
    searchPromise = prepareSearch();
}

// Retrieve the search data (index + store) and initialise search. Allows 1 retry on next prepareSearch
// Check readiness with searchIndex, as failure will return a resolved promise of null
async function prepareSearch() {
    const dataUrl = '#SEARCH_INDEX_PLACEHOLDER';

    if (searchIndex || searchFailures > 1) return;
    if (searchPromise) return searchPromise;

    try {
        const response = await fetch(dataUrl);
        const data = await response.json();

        searchIndex = lunr.Index.load(data.index);
        searchStore = data.store;
    } catch (err) {
        searchFailures++;
        searchIndex = null;
        searchPromise = null;
    }
}

async function performSearch(query) {
    // Ensure search is ready
    await prepareSearch();
    if (!searchIndex) {
        searchResultsContainer.innerHTML = '';
        addMessageResult('Unable to retrieve search results. Please try again.');
        return;
    }

    // Search index is already normalised
    const cleanQuery = query
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (!cleanQuery) {
        searchResultsContainer.innerHTML = '';
        return;
    }

    const LIMIT = 8;
    let exceedResults = false;

    // Search and enforce literal string searching
    const queryWithoutSpecial = cleanQuery.replace(/([\*\:\^\~\+\-])/g, '');
    let results = searchIndex.search(queryWithoutSpecial);

    if (results.length > LIMIT) {
        results = results.slice(0, LIMIT);
        exceedResults = true;
    }

    // Render results
    searchResultsContainer.innerHTML = '';
    if (results.length === 0) {
        addMessageResult("We couldn't find anything matching your search.");
        return;
    }

    const fragment = document.createDocumentFragment();
    results.forEach((result, index) => {
        const match = searchStore[result.ref];
        fragment.appendChild(createResultItem(match, index, query));
    });
    searchResultsContainer.appendChild(fragment);

    if (exceedResults) {
        addMessageResult('Refine your search for more results.');
    }
}

function addMessageResult(message) {
    const messageDiv = document.createElement('p');
    messageDiv.classList.add('search-result-message');
    messageDiv.textContent = message;
    searchResultsContainer.appendChild(messageDiv);
}

function createResultItem(result, index, query) {
    const resultContainer = document.createElement('a');
    resultContainer.setAttribute('href', result.link);
    resultContainer.classList.add('search-result');
    resultContainer.style.animationDelay = `${index * 0.05}s`;

    // Image
    const img = document.createElement('img');
    img.src = result.imageHashPath;
    img.alt = '';

    // Text div
    const textDiv = document.createElement('div');
    textDiv.classList.add('text-container');

    // Title
    const title = document.createElement('h2');
    title.classList.add('result-title');
    title.innerHTML = toSafeHighlightedText(result.title, query);

    // Description
    const description = document.createElement('p');
    description.classList.add('result-description');
    description.innerHTML = toSafeHighlightedText(result.description, query);

    textDiv.appendChild(title);
    textDiv.appendChild(description);

    resultContainer.appendChild(img);
    resultContainer.appendChild(textDiv);
    return resultContainer;
}

// Escapes dangerous characters and returns text with highlights on any query matches
function toSafeHighlightedText(text, query) {
    const helperDiv = document.createElement('div');
    helperDiv.textContent = text;
    const safeText = helperDiv.innerHTML;

    if (!query || query.length < 3 || !text) return safeText;

    helperDiv.textContent = query;
    const safeQuery = RegExp.escape(helperDiv.innerHTML);

    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return safeText.replaceAll(regex, '<mark>$1</mark>');
}

function closeBurger() {
    const burgerContainer = document.querySelector('.burger-container');
    const headerLinks = document.querySelector('.header-small-nav');

    if (burgerContainer && headerLinks) {
        burgerContainer.classList.remove('burger-select');
        burgerContainer.setAttribute('aria-expanded', 'false');
        headerLinks.classList.remove('header-small-nav-active');
    }
}

function trackSearch(query) {
    fetch('/track-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event: 'search',
            query: query,
            pathname: window.location.pathname + window.location.search,
        }),
    });
}
