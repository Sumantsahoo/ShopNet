const apiBaseUrl = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');

export const apiFetch = (path, options) => {
  const requestUrl = typeof path === 'string' && path.startsWith('/api/')
    ? `${apiBaseUrl}${path}`
    : path;

  return fetch(requestUrl, options);
};