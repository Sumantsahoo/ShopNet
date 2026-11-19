const SEARCH_HISTORY_KEY = 'shopnest-search-history';
const LEGACY_SEARCHES_KEY = 'shopnest-recent-searches';
const SEARCH_HISTORY_DAYS = 60;
const SEARCH_HISTORY_LIMIT = 100;

const filterRecentSearches = (history) => {
    const cutoff = Date.now() - SEARCH_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    return history
        .filter((entry) => typeof entry.term === 'string' && entry.term.trim() &&
            Number.isFinite(new Date(entry.searchedAt).getTime()) &&
            new Date(entry.searchedAt).getTime() >= cutoff)
        .sort((left, right) => new Date(right.searchedAt) - new Date(left.searchedAt))
        .slice(0, SEARCH_HISTORY_LIMIT);
};

export const readSearchHistory = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || 'null');
        if (Array.isArray(saved)) return filterRecentSearches(saved);

        const legacy = JSON.parse(localStorage.getItem(LEGACY_SEARCHES_KEY) || '[]');
        const now = new Date().toISOString();
        return filterRecentSearches(Array.isArray(legacy)
            ? legacy.filter((term) => typeof term === 'string').map((term) => ({ term, searchedAt: now }))
            : []);
    } catch (error) {
        console.error('Could not read recent search history:', error);
        return [];
    }
};

const writeSearchHistory = (history) => {
    const recent = filterRecentSearches(history);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(recent));
    localStorage.setItem(LEGACY_SEARCHES_KEY, JSON.stringify(recent.slice(0, 6).map((entry) => entry.term)));
    return recent;
};

export const recordLocalSearch = (term) => {
    const query = typeof term === 'string' ? term.trim().slice(0, 80) : '';
    if (!query) return readSearchHistory();
    const history = readSearchHistory().filter((entry) => entry.term.toLocaleLowerCase() !== query.toLocaleLowerCase());
    try {
        return writeSearchHistory([{ term: query, searchedAt: new Date().toISOString() }, ...history]);
    } catch (error) {
        console.error('Could not save recent search history:', error);
        return history;
    }
};

export const removeLocalSearch = (term) => {
    try {
        return writeSearchHistory(readSearchHistory().filter((entry) => entry.term !== term));
    } catch (error) {
        console.error('Could not remove recent search history:', error);
        return readSearchHistory();
    }
};
