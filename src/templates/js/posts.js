// Script is deferred

// Click, enter and space to use buttons
const container = document.querySelector('.content-page-container');
container.addEventListener('click', handleContainerEvents);
container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        if (e.key === ' ') e.preventDefault();
        handleContainerEvents(e);
    }
});

function handleContainerEvents(e) {
    const jumpToRecipeBtn = e.target.closest('.jump-to-recipe');
    const jumpToTopBtn = e.target.closest('#jumpToTop');

    if (jumpToRecipeBtn) {
        jumpToRecipeHandler(e);
    } else if (jumpToTopBtn) {
        jumpToTopHandler(e);
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
