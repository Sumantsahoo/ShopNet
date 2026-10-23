const defaultApiBaseUrl = process.env.NODE_ENV === 'production'
  ? 'https://shopnet-3-fm2s.onrender.com'
  : '';
const apiBaseUrl = (process.env.REACT_APP_API_URL || defaultApiBaseUrl).replace(/\/+$/, '');

export const apiFetch = (path, options) => {
  const requestUrl = typeof path === 'string' && path.startsWith('/api/')
    ? `${apiBaseUrl}${path}`
    : path;

  return fetch(requestUrl, options);
};