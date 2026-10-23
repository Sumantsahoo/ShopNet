import React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useLanguage } from '../context/LanguageContext';

const Home=() =>{
    const { pathname } = useLocation();
    const { t } = useLanguage();
    const isShopPage = pathname === '/shop';
    const [products, setProducts] = useState([]);
    const [loading,setLoading] = useState(true);
    const [error,setError] = useState('');

    useEffect(() => {
        const fetchProducts=async() =>{
            try{
                const res=await fetch('/api/products');
                if (!res.ok) {
                    throw new Error(`Products request failed (${res.status})`);
                }
                const data=await res.json();
                if (!Array.isArray(data)) {
                    throw new Error('The products response was not a list.');
                }
                setProducts(data);
            }
            catch(error){
                 console.error('Could not load products:', error);
                 setError('Products could not be loaded. Please try again in a moment.');
            }
            finally{
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    return (
        <div className='home-container'>
             {!isShopPage && (
                <div className="hero-banner">
                          <h1>{t('welcome')}</h1>
                          <p>{t('discover')}</p>
                </div>
             )}
                 <h2>{isShopPage ? t('shopAll') : t('allProducts')}</h2>
             {loading ?(
                     <div>{t('loading')}</div>
             ):(
                error ? <p role="alert">{error}</p> : products.length === 0 ? <p>{t('noProducts')}</p> : (
                    <div className="product-grid">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>
                )
             )
             }
        </div>
    );    
};
export default Home;