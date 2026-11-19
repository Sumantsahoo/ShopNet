import React, { useMemo } from 'react';
import '../styles/productFilters.css';

const getOptions = (products, field) => [...new Set(products.flatMap((product) => {
    const value = product[field];
    return Array.isArray(value) ? value : (value ? [value] : []);
}).map((value) => String(value).trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

const ProductFilters = ({ products, optionProducts = products, filters, onFilterChange, sortOrder, onSortChange, onClear }) => {
    const options = useMemo(() => ({
        brands: getOptions(optionProducts, 'brand'),
        colors: getOptions(optionProducts, 'color'),
        genders: getOptions(optionProducts, 'gender'),
        countries: getOptions(optionProducts, 'countryOfOrigin'),
        occasions: getOptions(optionProducts, 'occasion'),
        sizes: getOptions(optionProducts, 'sizes')
    }), [optionProducts]);

    return (
        <div className="product-filter-toolbar" role="group" aria-label="Sort and filter products">
            <label>
                Sort
                <select value={sortOrder} onChange={(event) => onSortChange(event.target.value)}>
                    <option value="recommended">Recommended</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="rating">Customer rating</option>
                    <option value="discount">Discount</option>
                    <option value="newest">Newest</option>
                </select>
            </label>
            <label>
                Brand
                <select value={filters.brand} onChange={(event) => onFilterChange('brand', event.target.value)}>
                    <option value="">All brands</option>
                    {options.brands.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
            </label>
            <label>
                Color
                <select value={filters.color} onChange={(event) => onFilterChange('color', event.target.value)}>
                    <option value="">All colors</option>
                    {options.colors.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
            </label>
            <fieldset className="product-price-filter">
                <legend>Price</legend>
                <input aria-label="Minimum price" type="number" min="0" placeholder="Min ₹" value={filters.minPrice} onChange={(event) => onFilterChange('minPrice', event.target.value)} />
                <input aria-label="Maximum price" type="number" min="0" placeholder="Max ₹" value={filters.maxPrice} onChange={(event) => onFilterChange('maxPrice', event.target.value)} />
            </fieldset>
            <label>
                Rating
                <select value={filters.minRating} onChange={(event) => onFilterChange('minRating', event.target.value)}>
                    <option value="">Any rating</option>
                    <option value="4">4★ and above</option>
                    <option value="3">3★ and above</option>
                    <option value="2">2★ and above</option>
                </select>
            </label>
            <label>
                Gender
                <select value={filters.gender} onChange={(event) => onFilterChange('gender', event.target.value)}>
                    <option value="">All</option>
                    {options.genders.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
            </label>
            <label>
                Country
                <select value={filters.countryOfOrigin} onChange={(event) => onFilterChange('countryOfOrigin', event.target.value)}>
                    <option value="">Any country</option>
                    {options.countries.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
            </label>
            <label>
                Occasion
                <select value={filters.occasion} onChange={(event) => onFilterChange('occasion', event.target.value)}>
                    <option value="">Any occasion</option>
                    {options.occasions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
            </label>
            <label>
                Size
                <select value={filters.size} onChange={(event) => onFilterChange('size', event.target.value)}>
                    <option value="">Any size</option>
                    {options.sizes.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
            </label>
            <label className="product-filter-check">
                <input type="checkbox" checked={filters.discountOnly} onChange={(event) => onFilterChange('discountOnly', event.target.checked)} />
                Discount
            </label>
            <label className="product-filter-check">
                <input type="checkbox" checked={filters.fastDelivery} onChange={(event) => onFilterChange('fastDelivery', event.target.checked)} />
                Delivery in 2 days
            </label>
            <button type="button" className="product-filter-clear" onClick={onClear}>Clear filters</button>
        </div>
    );
};

export default ProductFilters;
