// Script is deferred

const printTrackEnabled = '#PRINT_TRACK_PLACEHOLDER';
let isPrintTracked = false;

// Print mode
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('format') === 'print') {
        updatePageForPrint();
    }
});

window.addEventListener('afterprint', (event) => {
    if (printTrackEnabled && !isPrintTracked) {
        trackPrint();
    }
});

// Click, enter and space to use buttons
const main = document.querySelector('main');
main.addEventListener('click', handleMainEvents);
main.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        if (e.key === ' ') e.preventDefault();
        handleMainEvents(e);
    }
});

function handleMainEvents(e) {
    const jumpToRecipeBtn = e.target.closest('.jump-to-recipe');
    const jumpToTopBtn = e.target.closest('#jumpToTop');
    const printRecipeBtn = e.target.closest('.print-recipe');
    const printPagePrintButton = e.target.closest('.print-page-print-button');

    if (jumpToRecipeBtn) {
        jumpToRecipeHandler(e);
    } else if (jumpToTopBtn) {
        jumpToTopHandler(e);
    } else if (printRecipeBtn) {
        printRecipeHandler(e);
    } else if (printPagePrintButton) {
        window.print();
    }
}

function jumpToRecipeHandler(e) {
    const button = e.target;
    const recipeBox = document.querySelector('#recipe');
    recipeBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.hash !== '#recipe') {
        history.pushState(null, '', '#recipe');
    }

    // Remove persistent hover even on mobile devices
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    button.blur();

    // Dynamically add tabIndex so navigation to url with recipe box anchor doesn't show border
    setFocusable(recipeBox);
    recipeBox.focus({ preventScroll: true });
}

function jumpToTopHandler() {
    // Make body focusable to shift screen reader to start of page
    document.body.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusable(document.body);
    document.body.focus({ preventScroll: true });
}

function printRecipeHandler() {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('format', 'print');
    currentUrl.hash = '';
    window.open(currentUrl.toString(), '_blank');
}

// Format the page for print mode
function updatePageForPrint() {
    const existingPrintButton = document.querySelector('.print-recipe');
    const recipeBox = document.querySelector('.recipe-box');
    if (!existingPrintButton && !recipeBox) return;

    // Add font controls, and move and edit the print button to the top of the page
    document.body.classList.add('print-recipe-mode');
    const contentPageContainer = document.querySelector('.content-page-container');
    const printControlsContainer = document.createElement('div');
    printControlsContainer.classList.add('print-controls');
    printControlsContainer.style.cssText = 'display: flex; gap: 5px; padding: 30px;';

    const changeSize = (modifier) => {
        const currentSize = parseFloat(window.getComputedStyle(contentPageContainer).fontSize);
        const newSize = currentSize + modifier;
        if (newSize >= 10 && newSize <= 36) {
            contentPageContainer.style.fontSize = newSize + 'px';
        }
    };

    const buttonIncrease = document.createElement('button');
    buttonIncrease.textContent = 'Increase Font +';
    buttonIncrease.classList.add('button-style-box');
    buttonIncrease.onclick = () => changeSize(2);

    const buttonDecrease = document.createElement('button');
    buttonDecrease.textContent = 'Decrease Font -';
    buttonDecrease.classList.add('button-style-box');
    buttonDecrease.onclick = () => changeSize(-2);

    existingPrintButton.classList.replace('print-recipe', 'print-page-print-button');
    existingPrintButton.style.display = 'inline-flex';
    existingPrintButton.childNodes[1].textContent = ' Print';
    printControlsContainer.append(buttonDecrease, buttonIncrease, existingPrintButton);

    recipeBox.style.cssText = 'border: none; box-shadow: none; padding: 0; margin: 0;';
    contentPageContainer.style.cssText = 'width: 100%; margin: 0; padding: 15px;';

    // Add the site icon, name and current page url to the top of the page
    const smallHeading = document.querySelector('.header-small-heading .site-title-block');
    smallHeading.style.cssText = 'display: flex; padding-left: 15px;';
    const currentUrl = new URL(window.location.href);
    const cleanUrl = currentUrl.origin + currentUrl.pathname;
    const pageLink = document.createElement('a');
    pageLink.href = cleanUrl;
    pageLink.textContent = cleanUrl;
    pageLink.style.cssText = 'display: block; textDecoration: none; color: inherit; padding-left: 15px;';
    contentPageContainer.before(smallHeading, pageLink, printControlsContainer);

    setTimeout(() => {
        jumpToTopHandler();
    }, 0);
}

// Toggle jump to top button visibility based on scroll position
let jumpToTopBtn = document.getElementById('jumpToTop');
if (jumpToTopBtn) {
    window.addEventListener('scroll', function () {
        jumpToTopBtn.style.visibility = document.documentElement.scrollTop > 2000 ? 'visible' : 'hidden';
    });
}

function setFocusable(element) {
    element.setAttribute('tabindex', '-1');
    setTimeout(() => {
        element.removeAttribute('tabindex');
    }, 200);
}

function trackPrint() {
    isPrintTracked = true;
    fetch('/track-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event: 'print',
            pathname: window.location.pathname + window.location.search,
        }),
    });
}
