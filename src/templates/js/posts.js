const jumpToRecipeButtons = document.querySelectorAll('.jump-to-recipe');
jumpToRecipeButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const recipeBox = document.querySelector('#recipe');
        recipeBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.location.hash !== '#recipe') {
            history.pushState(null, '', '#recipe');
        }
    });
});

let goToTopButton = document.getElementById('goToTop');
if (goToTopButton) {
    window.addEventListener('scroll', function () {
        goToTopButton.style.visibility = document.documentElement.scrollTop > 2000 ? 'visible' : 'hidden';
    });

    goToTopButton.addEventListener('click', function () {
        const mainPageContainer = document.querySelector('.content-page-container');
        mainPageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}
