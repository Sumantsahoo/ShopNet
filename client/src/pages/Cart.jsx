import React from 'react';
import {useSelector,useDispatch} from 'react-redux';
import {Link,useNavigate} from 'react-router-dom';
import {removeFromCart,updateCartQuantity} from '../redux/cartSlice';
import { useLanguage } from '../context/LanguageContext';
import '../styles/cart.css';

const Cart = () => {
    const cartItems=useSelector((state)=>state.cart.cartItems);
    const dispatch=useDispatch();
    const navigate=useNavigate();
    const { t } = useLanguage();

    const handleRemove=(id)=>{
        dispatch(removeFromCart(id));
    };
    const handleUpdateQty=(item,qty)=>{
        dispatch(updateCartQuantity({id:item._id || item.productId,qty}));
    };
    const totalPrice=cartItems.reduce((acc,item)=> acc+item.price*item.qty,0);

    return(
        <div className='cart-container'>
            <h2>{t('shoppingCart')}</h2>
            {cartItems.length===0 ?(
                <p>{t('cartEmpty')} <Link to='/shop'>{t('goShopping')}</Link></p>
            ):
            (
                <div className='cart-layout'>
                    <div className='cart-items'>
                        {
                            cartItems.map((item)=>(
                                <div key={item._id || item.productId} className='cart-item'>
                                    <img src={item.imageUrl} alt={item.name} className='cart-item-image'/>
                                    <div className='cart-item-details'>
                                        <h4>{item.name}</h4>
                                        <p>₹{item.price}</p>
                                        <div className='qty-controls'>
                                            <button aria-label={`Decrease ${item.name} quantity`} onClick={()=> handleUpdateQty(item,item.qty-1)}>-</button>
                                            <span>{item.qty}</span>
                                            <button aria-label={`Increase ${item.name} quantity`} onClick={()=> handleUpdateQty(item,item.qty+1)}>+</button>
                                        </div>
                                        <button onClick={()=> handleRemove(item._id || item.productId)} className='btn-remove'>{t('remove')}</button>
                                    </div>
                                </div>
                            ))
                        }
                        <div className='cart-summary'>
                            <h3>{t('total')}: {totalPrice.toFixed(2)}</h3>
                            <button onClick={()=>navigate('/checkout')} className='btn btn-checkout'>{t('proceedCheckout')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};
export default Cart;
