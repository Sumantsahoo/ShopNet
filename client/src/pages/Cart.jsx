import React from 'react';
import {useSelector,useDispatch} from 'react-redux';
import {Link,useNavigate} from 'react-router-dom';
import {removeFromCart,setCheckoutItems,updateCartQuantity} from '../redux/cartSlice';
import { useLanguage } from '../context/LanguageContext';
import '../styles/cart.css';

const Cart = () => {
    const cartItems=useSelector((state)=>state.cart.cartItems);
    const checkoutItemIds=useSelector((state)=>state.cart.checkoutItemIds);
    const dispatch=useDispatch();
    const navigate=useNavigate();
    const { t } = useLanguage();

    const handleRemove=(id)=>{
        dispatch(removeFromCart(id));
    };
    const handleUpdateQty=(item,qty)=>{
        dispatch(updateCartQuantity({id:item._id || item.productId,qty}));
    };
    const selectedItems=cartItems.filter((item)=>checkoutItemIds.some((id)=>String(id)===String(item._id || item.productId)));
    const selectedTotal=selectedItems.reduce((total,item)=>total+Number(item.price)*Number(item.qty),0);
    const allSelected=cartItems.length>0 && selectedItems.length===cartItems.length;

    const toggleCheckoutItem=(itemId)=>{
        const isSelected=checkoutItemIds.some((id)=>String(id)===String(itemId));
        dispatch(setCheckoutItems(isSelected
            ? checkoutItemIds.filter((id)=>String(id)!==String(itemId))
            : [...checkoutItemIds,itemId]));
    };

    return(
        <div className='cart-container'>
            <h2>{t('shoppingCart')}</h2>
            {cartItems.length===0 ?(
                <p>{t('cartEmpty')} <Link to='/shop'>{t('goShopping')}</Link></p>
            ):
            (
                <div className='cart-layout'>
                    <div className='cart-items'>
                        <button
                            type="button"
                            className="cart-selection-toggle"
                            onClick={()=>dispatch(setCheckoutItems(allSelected ? [] : cartItems.map((item)=>item._id || item.productId)))}
                        >
                            {allSelected ? t('clearSelection') : t('selectAll')}
                        </button>
                        {
                            cartItems.map((item)=>(
                                <div key={item._id || item.productId} className='cart-item'>
                                    <label className="cart-select-item">
                                        <input
                                            type="checkbox"
                                            checked={checkoutItemIds.some((id)=>String(id)===String(item._id || item.productId))}
                                            onChange={()=>toggleCheckoutItem(item._id || item.productId)}
                                            aria-label={`Select ${item.name} for checkout`}
                                        />
                                    </label>
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
                            <div>
                                <p>{t('selectedItems').replace('{count}', String(selectedItems.length))}</p>
                                <h3>{t('selectedSubtotal')}: ₹{selectedTotal.toFixed(2)}</h3>
                            </div>
                            <button onClick={()=>navigate('/checkout')} className='btn btn-checkout' disabled={selectedItems.length===0}>{t('buySelectedItems')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};
export default Cart;
