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
