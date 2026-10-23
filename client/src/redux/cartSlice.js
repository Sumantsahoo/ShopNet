import {createSlice} from '@reduxjs/toolkit';

const getCartStorageKey = (owner) => `cartItems:${owner}`;
const getCheckoutItemsStorageKey = (owner) => `checkoutItemIds:${owner}`;
const getItemId = (item) => item?._id || item?.productId;

const getCartOwner = (user) => {
    const userId = user?.id || user?._id || user?.email;
    return userId ? `user:${String(userId).toLowerCase()}` : 'guest';
};

const loadCartItems = (owner) => {
    try {
        const savedItems = localStorage.getItem(getCartStorageKey(owner));
        const parsedItems = savedItems ? JSON.parse(savedItems) : [];
        return Array.isArray(parsedItems) ? parsedItems : [];
    } catch (error) {
        console.error('Could not restore saved cart:', error);
        return [];
    }
};

const loadCheckoutItemIds = (owner) => {
    try {
        const savedIds = localStorage.getItem(getCheckoutItemsStorageKey(owner));
        const parsedIds = savedIds ? JSON.parse(savedIds) : [];
        return Array.isArray(parsedIds) ? parsedIds : [];
    } catch (error) {
        console.error('Could not restore checkout selection:', error);
        return [];
    }
};

const persistCartState = (cartItems, checkoutItemIds, owner) => {
    localStorage.setItem(getCartStorageKey(owner), JSON.stringify(cartItems));
    localStorage.setItem(getCheckoutItemsStorageKey(owner), JSON.stringify(checkoutItemIds));
    localStorage.removeItem('cartSlice');
    localStorage.removeItem('cartItems');
};

const initialState = {
    cartItems: loadCartItems('guest'),
    checkoutItemIds: loadCheckoutItemIds('guest'),
    owner: 'guest'
};

const cartSlice=createSlice({
    name:'cart',
    initialState,
    reducers:{
        addToCart:(state,action) =>{
            const item=action.payload;
            const itemId = item._id || item.productId;
            const existItem=state.cartItems.find(x => (x._id || x.productId) === itemId)
            if(existItem){
                state.cartItems=state.cartItems.map(x=>(x._id || x.productId) === itemId
                    ? {...x, ...item, qty: (Number(x.qty) || 0) + (Number(item.qty) || 1)}
                    : x);
            }
            else{
                state.cartItems=[...state.cartItems,item]
            }
            if (!state.checkoutItemIds.some((id) => String(id) === String(itemId))) {
                state.checkoutItemIds.push(itemId);
            }
            persistCartState(state.cartItems, state.checkoutItemIds, state.owner);
        },
        removeFromCart:(state,action)=>{
            const itemId=action.payload;
            state.cartItems=state.cartItems.filter((x)=> (x._id || x.productId) !== itemId);
            state.checkoutItemIds=state.checkoutItemIds.filter((id) => String(id) !== String(itemId));
            persistCartState(state.cartItems, state.checkoutItemIds, state.owner);
        },
        updateCartQuantity:(state,action)=>{
            const {id,qty}=action.payload;
            if(qty <= 0){
                state.cartItems=state.cartItems.filter((x)=>(x._id || x.productId) !== id);
                state.checkoutItemIds=state.checkoutItemIds.filter((selectedId) => String(selectedId) !== String(id));
            } else {
                state.cartItems=state.cartItems.map((x)=>(x._id || x.productId) === id ? {...x,qty} : x);
            }
            persistCartState(state.cartItems, state.checkoutItemIds, state.owner);
        },
        setCheckoutItems:(state,action)=>{
            const availableIds = new Set(state.cartItems.map((item) => String(getItemId(item))));
            state.checkoutItemIds = [...new Set((action.payload || []).map(String))]
                .filter((id) => availableIds.has(id));
            persistCartState(state.cartItems, state.checkoutItemIds, state.owner);
        },
        removeCartItems:(state,action)=>{
            const purchasedIds = new Set((action.payload || []).map(String));
            state.cartItems=state.cartItems.filter((item) => !purchasedIds.has(String(getItemId(item))));
            state.checkoutItemIds=state.checkoutItemIds.filter((id) => !purchasedIds.has(String(id)));
            persistCartState(state.cartItems, state.checkoutItemIds, state.owner);
        },
        clearCart:(state)=>{
            state.cartItems=[];
            state.checkoutItemIds=[];
            localStorage.removeItem(getCartStorageKey(state.owner));
            localStorage.removeItem(getCheckoutItemsStorageKey(state.owner));
            localStorage.removeItem('cartItems');
            localStorage.removeItem('cartSlice');
        },
        setCartOwner:(state,action)=>{
            const nextOwner = action.payload || 'guest';
            if (state.owner !== nextOwner) {
                state.owner = nextOwner;
                state.cartItems = loadCartItems(nextOwner);
                state.checkoutItemIds = loadCheckoutItemIds(nextOwner);
            }
            localStorage.removeItem('cartItems');
            localStorage.removeItem('cartSlice');
        }
    },
});
export const {addToCart,removeFromCart,updateCartQuantity,setCheckoutItems,removeCartItems,clearCart,setCartOwner}=cartSlice.actions;
export {getCartOwner};
export default cartSlice.reducer;