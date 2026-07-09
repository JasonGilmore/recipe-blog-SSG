// Script is deferred
if (!window.hasTrackedPage) {
    window.hasTrackedPage = true;
    const urlParams = new URLSearchParams(window.location.search);
    if (!(urlParams.get('format') === 'print')) {
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
}
