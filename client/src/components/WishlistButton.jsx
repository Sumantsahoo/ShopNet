import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const WishlistButton = ({ product, compact = false }) => {
  const { user } = useContext(AuthContext);
  const { wishlistItems, toggleWishlist } = useWishlist();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const productId = product?._id || product?.productId;
  const isSaved = wishlistItems.some((item) => (item._id || item.productId) === productId);

  const handleToggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user?.token) {
      navigate('/login');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await toggleWishlist(product);
    } catch (toggleError) {
      setError(toggleError.message || 'Could not update wishlist.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="wishlist-control">
      <button
        type="button"
        className={`wishlist-button${isSaved ? ' is-saved' : ''}${compact ? ' is-compact' : ''}`}
        onClick={handleToggle}
        disabled={busy}
        aria-label={isSaved ? t('removeWishlist') : t('addWishlist')}
        aria-pressed={isSaved}
        title={isSaved ? t('removeWishlist') : t('addWishlist')}
      >
        <span aria-hidden="true">{isSaved ? '♥' : '♡'}</span>
        {!compact && <span>{isSaved ? t('removeWishlist') : t('addWishlist')}</span>}
      </button>
      {error && <span className="wishlist-error" role="alert">{error}</span>}
    </span>
  );
};

export default WishlistButton;