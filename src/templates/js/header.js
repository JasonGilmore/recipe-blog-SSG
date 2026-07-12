// Script is deferred

// Handle transparent header scrolls to solid if not supported by browser
const header = document.querySelector('header');
if (!CSS.supports('animation-timeline: scroll()')) {
    // Create an invisible anchor element at the very top of the page
    const scrollAnchor = document.createElement('div');
    scrollAnchor.style.position = 'absolute';
    scrollAnchor.style.top = '60px';
    scrollAnchor.style.height = '1px';
    document.body.prepend(scrollAnchor);

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                // If the anchor is not intersecting, the page is scrolled down
                header.classList.toggle('display-solid', !entry.isIntersecting);
            });
        },
        { threshold: 0 },
    );
    observer.observe(scrollAnchor);
}

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
