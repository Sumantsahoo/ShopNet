import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.token) {
      setWishlistItems([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const fetchWishlist = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/authorite/wishlist', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Could not load wishlist.');
        if (!cancelled) setWishlistItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Could not load wishlist:', error);
        if (!cancelled) setWishlistItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWishlist();
    return () => { cancelled = true; };
  }, [user?.token]);

  const toggleWishlist = async (product) => {
    if (!user?.token) throw new Error('Sign in to save products to your wishlist.');
    const productId = product?._id || product?.productId;
    if (!productId) throw new Error('Product could not be saved.');

    const alreadySaved = wishlistItems.some((item) => (item._id || item.productId) === productId);
    const response = await fetch(`/api/authorite/wishlist/${productId}`, {
      method: alreadySaved ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${user.token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not update wishlist.');

    setWishlistItems((current) => alreadySaved
      ? current.filter((item) => (item._id || item.productId) !== productId)
      : current.some((item) => (item._id || item.productId) === productId) ? current : [...current, product]);
    return !alreadySaved;
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, wishlistLoading: loading, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};