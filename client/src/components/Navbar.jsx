import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import { AuthContext } from "../context/AuthContext";
import { LANGUAGE_OPTIONS, useLanguage } from '../context/LanguageContext';

const Navbar=()=>{
    const{user,logout}=useContext(AuthContext);
    const { language, setLanguage, t } = useLanguage();
    const navigate=useNavigate();
    const handleLogout=()=>{
        logout();
        navigate('/login')
    }
    return(
        <nav className="navbar">
             <div className="navbar-brand">
                <Link to="/">
                <img src="/logo.png" alt="ShopNest Logo" className="navbar-logo" />
                ShopNest</Link>
             </div>
        <ul className="navbar-links">
            <li><Link to='/shop'>{t('products')}</Link></li>
            {user?.role !== 'admin' && <li><Link to='/cart'>{t('cart')}</Link></li>}
            {user ?(
                <>
                <li><Link to='/profile'>{t('profile')}</Link></li>
                {user.role !== 'admin' && <li><Link to='/orders'>{t('myOrders')}</Link></li>}
                {user.role === 'admin' && (
                    <>
                        <li><Link to='/admin'>{t('dashboard')}</Link></li>
                        <li><Link to='/admin/products/new'>{t('addProduct')}</Link></li>
                        <li><Link to='/admin/products/edit'>{t('editProducts')}</Link></li>
                        <li><Link to='/admin/users'>{t('customers')}</Link></li>
                        <li><Link to='/admin/orders'>{t('manageOrders')}</Link></li>
                    </>
                )}
                <li><button onClick={handleLogout} className='btn-logout'>{t('logout')}</button></li>
                </>

            ):(
                <li><Link to='/login'>{t('login')}</Link></li>
            )
            }
            <li className="navbar-language-item">
                <label className="navbar-language-label" htmlFor="shopnest-language">{t('language')}</label>
                <select id="shopnest-language" className="navbar-language-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
                    {LANGUAGE_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                </select>
            </li>
            </ul>     
        </nav>     
    );
};
export default Navbar;