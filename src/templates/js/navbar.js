document.addEventListener('DOMContentLoaded', () => {
    const burgerMenuButton = document.querySelector('.burger-container');
    if (burgerMenuButton) {
        burgerMenuButton.addEventListener('click', toggleBurger);
        burgerMenuButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                toggleBurger();
            }
        });
    }
});

function toggleBurger() {
    let burgerContainer = document.querySelector('.burger-container');
    let navbarLinks = document.querySelector('.header-small-nav');
    burgerContainer.classList.toggle('burger-select');
    burgerContainer.setAttribute('aria-expanded', !(burgerContainer.getAttribute('aria-expanded') === 'true'));
    navbarLinks.classList.toggle('header-small-nav-active');
}
