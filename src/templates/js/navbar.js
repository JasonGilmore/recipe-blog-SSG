function toggleBurger() {
    let burgerContainer = document.querySelector('.burger-container');
    let navbarLinks = document.querySelector('.navbar-small-links');
    burgerContainer.classList.toggle('burger-select');
    navbarLinks.classList.toggle('navbar-small-links-active');
}
