export const PRODUCT_CATEGORIES = [
    { slug: 'fashion', label: 'Fashion', aliases: ['clothing', 'apparel'] },
    { slug: 'mobiles', label: 'Mobiles', aliases: ['mobile', 'phones', 'smartphones'] },
    { slug: 'electronics', label: 'Electronics', aliases: ['electronic'] },
    { slug: 'beauty', label: 'Beauty', aliases: ['personal care', 'makeup'] },
    { slug: 'home-appliances', label: 'Home Appliances', aliases: ['home appliance', 'appliances'] },
    { slug: 'toys', label: 'Toys', aliases: ['toy'] },
    { slug: 'bags', label: 'Bags', aliases: ['bag', 'luggage'] },
    { slug: 'food-grocery', label: 'Food & Grocery', aliases: ['food', 'grocery', 'groceries'] },
    { slug: 'auto-accessories', label: 'Auto Accessories', aliases: ['automotive', 'car accessories'] },
    { slug: 'sports', label: 'Sports', aliases: ['sport', 'fitness'] },
    { slug: 'furniture', label: 'Furniture', aliases: ['home furniture'] },
    { slug: 'books', label: 'Books', aliases: ['book'] },
    { slug: 'two-wheelers', label: 'Two Wheelers', aliases: ['two wheeler', 'two-wheelers', 'bikes', 'scooters'] }
];

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

export const getCategorySlug = (value) => {
    const normalized = normalize(value);
    const match = PRODUCT_CATEGORIES.find(({ slug, label, aliases }) => (
        [slug, label, ...aliases].some((candidate) => normalize(candidate) === normalized)
    ));
    return match?.slug || normalized;
};

export const getCategoryLabel = (slug) => (
    PRODUCT_CATEGORIES.find((category) => category.slug === slug)?.label || slug
);
