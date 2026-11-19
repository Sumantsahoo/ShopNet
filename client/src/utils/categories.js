export const PRODUCT_CATEGORIES = [
    { slug: 'fashion', label: 'Fashion', aliases: ['clothing', 'apparel'] },
    { slug: 'mobiles', label: 'Mobiles', aliases: ['mobile', 'phones', 'smartphones'] },
    { slug: 'electronics', label: 'Electronics', aliases: ['electronic'] },
    { slug: 'beauty', label: 'Beauty', aliases: ['personal care', 'makeup'] },
    { slug: 'home', label: 'Home', aliases: [] },
    { slug: 'appliances', label: 'Appliances', aliases: ['home appliance', 'home appliances'] },
    { slug: 'toys', label: 'Toys', aliases: ['toy'] },
    { slug: 'bags', label: 'Bags', aliases: ['bag', 'luggage'] },
    { slug: 'food-grocery', label: 'Food & Grocery', aliases: ['food', 'grocery', 'groceries'] },
    { slug: 'auto-accessories', label: 'Auto Accessories', aliases: ['automotive', 'car accessories'] },
    { slug: 'sports', label: 'Sports', aliases: ['sport', 'fitness'] },
    { slug: 'furniture', label: 'Furniture', aliases: ['home furniture'] },
    { slug: 'books', label: 'Books', aliases: ['book'] },
    { slug: 'two-wheelers', label: '2 Wheelers', aliases: ['two wheeler', 'two-wheelers', 'bikes', 'scooters'] }
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

const CATEGORY_ICONS = {
    fashion: '👗',
    shoes: '👟',
    mobiles: '📱',
    electronics: '💻',
    beauty: '💄',
    ac: '❄️',
    tablet: '📱',
    fan: '🌀',
    laptop: '💻',
    home: '🏠',
    appliances: '💡',
    toys: '🧸',
    bags: '👜',
    'food-grocery': '🛒',
    'auto-accessories': '🚗',
    sports: '⚽',
    furniture: '🛋️',
    books: '📚',
    'two-wheelers': '🛵'
};

const CATEGORY_PHOTOS = {
    fashion: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=640&q=80',
    mobiles: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=640&q=80',
    electronics: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=640&q=80',
    beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=640&q=80',
    home: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=640&q=80',
    appliances: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=640&q=80',
    toys: 'https://images.unsplash.com/photo-1599623560574-39d485900c95?auto=format&fit=crop&w=640&q=80',
    bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=640&q=80',
    'food-grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=640&q=80',
    'auto-accessories': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=640&q=80',
    sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=640&q=80',
    furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=640&q=80',
    books: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=640&q=80',
    'two-wheelers': 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=640&q=80'
};

export const getCategoryIcon = (category) => CATEGORY_ICONS[getCategorySlug(category)] || '🛍️';

export const getCategoryImageUrl = (category, products = []) => {
    const slug = getCategorySlug(category);
    const productImage = products.find((product) => (
        getCategorySlug(product.category) === slug && product.imageUrl
    ))?.imageUrl;
    return productImage || CATEGORY_PHOTOS[slug] || '';
};
