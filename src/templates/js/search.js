let searchDialog = null;
let searchResultsContainer = null;
let searchInput = null;
let placeholders = '#SEARCH_PLACEHOLDERS';
let searchTimeout = null;
let searchIndexPromise = null;
let promiseRetries = 0;

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
        }, 350);
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
    getSearchIndex();
}

// Retrieve the search index once and cache the results. If failed, will retry once on perform search or reopen dialog
function getSearchIndex() {
    const url = '#SEARCH_INDEX_PLACEHOLDER';
    if (searchIndexPromise) return searchIndexPromise;

    searchIndexPromise = fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error('Error retrieving index.');
            // todo consider need to validate resopnse, otherwise not iterable err thrown later
            if (!res) throw new Error('Search index empty.');
            return res.json();
        })
        .catch((err) => {
            if (promiseRetries < 1) {
                promiseRetries++;
                searchIndexPromise = null;
            }
        });

    return searchIndexPromise;
}

async function performSearch(query) {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
        searchResultsContainer.innerHTML = '';
        return;
    }

    const data = await getSearchIndex();
    if (!data) {
        searchResultsContainer.innerHTML = '';
        addMessageResult('Unable to retrieve search results. Please try again.');
        return;
    }

    const matches = [];
    const LIMIT = 4; // todo update to 10 or another number
    let exceedResults = false;

    for (const post of data) {
        // todo refine search for priority results on title and description
        if (`${post.title.toLowerCase()} ${post.description.toLowerCase()} ${post.keywords}`.includes(cleanQuery)) {
            if (matches.length === LIMIT) {
                exceedResults = true;
                break;
            }
            matches.push(post);
        }
    }

    // Render results
    searchResultsContainer.innerHTML = '';
    if (matches.length === 0) {
        addMessageResult("We couldn't find anything matching your search.");
        return;
    }

    const fragment = document.createDocumentFragment();
    matches.forEach((match, index) => {
        fragment.appendChild(createResultItem(match, index, query));
    });
    searchResultsContainer.appendChild(fragment);

    if (exceedResults) {
        addMessageResult('Refine your search for more results.');
    }
}

function addMessageResult(message) {
    const messageDiv = document.createElement('div');
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
    const title = document.createElement('p');
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

    if (!query || query.length < 3) return text;

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
