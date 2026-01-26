// Script is deferred
if (!window.hasTrackedPage) {
    window.hasTrackedPage = true;
    fetch('/track-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event: 'pageview',
            pathname: window.location.pathname + window.location.search,
        }),
    });
}
