window.addEventListener('load', () => {
    fetch('/track-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event: 'pageview',
            pathname: window.location.pathname,
        }),
    });
});
