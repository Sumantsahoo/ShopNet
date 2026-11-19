const normalize = (value) => String(value || '').trim().toLocaleLowerCase();

const getSearchScore = (product, searchTerms) => {
    const fields = [product.name, product.brand, product.category, product.description, product.color, product.occasion]
        .map(normalize)
        .filter(Boolean);
    return searchTerms.reduce((score, rawTerm) => {
        const term = normalize(rawTerm);
        if (!term) return score;
        const matchingFields = fields.filter((field) => field.includes(term));
        if (matchingFields.length) return score + Math.min(matchingFields.length, 3) * 4;
        const tokens = term.split(/\s+/).filter((token) => token.length > 2);
        return score + tokens.filter((token) => fields.some((field) => field.includes(token))).length;
    }, 0);
};

const getAffinityScore = (product, sourceProducts) => sourceProducts.reduce((score, source) => {
    if (String(source._id) === String(product._id)) return score;
    return score +
        (normalize(source.category) && normalize(source.category) === normalize(product.category) ? 4 : 0) +
        (normalize(source.brand) && normalize(source.brand) === normalize(product.brand) ? 3 : 0) +
        (normalize(source.gender) && normalize(source.gender) === normalize(product.gender) ? 1 : 0) +
        (normalize(source.color) && normalize(source.color) === normalize(product.color) ? 1 : 0) +
        (normalize(source.occasion) && normalize(source.occasion) === normalize(product.occasion) ? 1 : 0);
}, 0);

const rankRecommendations = (products, { searchTerms = [], sourceProducts = [], excludeIds = [], mode = 'combined' } = {}) => {
    const excluded = new Set(excludeIds.map(String));
    return products
        .filter((product) => Number(product.stock) > 0 && product.showInAllProducts !== false && !excluded.has(String(product._id)))
        .map((product, index) => {
            const searchScore = getSearchScore(product, searchTerms);
            const affinityScore = getAffinityScore(product, sourceProducts);
            const score = mode === 'search'
                ? searchScore
                : mode === 'affinity'
                    ? affinityScore
                    : searchScore + affinityScore;
            return { product, index, score };
        })
        .filter(({ score }) => score > 0)
        .sort((left, right) => right.score - left.score ||
            Number(right.product.rating || 0) - Number(left.product.rating || 0) ||
            left.index - right.index)
        .map(({ product }) => product);
};

const takeUniqueProducts = (products, seen = new Set(), limit = 12) => {
    const selected = [];
    for (const product of products) {
        const id = String(product._id);
        if (seen.has(id)) continue;
        seen.add(id);
        selected.push(product);
        if (selected.length >= limit) break;
    }
    return selected;
};

module.exports = { getSearchScore, getAffinityScore, rankRecommendations, takeUniqueProducts };
