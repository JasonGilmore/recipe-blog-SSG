// Script is deferred
const burgerMenuButton = document.querySelector('.burger-container');
if (burgerMenuButton) {
    burgerMenuButton.addEventListener('click', toggleBurger);
    burgerMenuButton.addEventListener('keydown', (event) => {
        event.key === 'Enter' && toggleBurger();
    });
}

function toggleBurger() {
    const burgerContainer = document.querySelector('.burger-container');
    const headerLinks = document.querySelector('.header-small-nav');
    burgerContainer.classList.toggle('burger-select');
    burgerContainer.setAttribute('aria-expanded', !(burgerContainer.getAttribute('aria-expanded') === 'true'));
    headerLinks.classList.toggle('header-small-nav-active');
}
