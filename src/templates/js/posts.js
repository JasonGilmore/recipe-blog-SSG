// Script is deferred
const container = document.querySelector('.content-page-container');
container.addEventListener('click', jumpToRecipeDelegation);

function jumpToRecipeDelegation(e) {
    const button = e.target.closest('.jump-to-recipe');
    if (!button) return;

    const recipeBox = document.querySelector('#recipe');
    recipeBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.hash !== '#recipe') {
        history.pushState(null, '', '#recipe');
    }

    // Remove persistent hover even on mobile devices
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    button.blur();
}

let goToTopButton = document.getElementById('goToTop');
if (goToTopButton) {
    window.addEventListener('scroll', function () {
        goToTopButton.style.visibility = document.documentElement.scrollTop > 2000 ? 'visible' : 'hidden';
    });

    goToTopButton.addEventListener('click', function () {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
}
