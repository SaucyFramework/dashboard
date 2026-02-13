const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
}

export async function api(path, options = {}) {
    const url = `${basePath}/api${path}`;

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': getCsrfToken(),
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('saucy:unauthenticated'));
    }

    return response;
}

export async function get(path) {
    const response = await api(path);
    return response.json();
}

export async function post(path, data = {}) {
    const response = await api(path, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return response.json();
}
