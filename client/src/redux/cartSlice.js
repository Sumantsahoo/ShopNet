import {createSlice} from '@reduxjs/toolkit';

const getCartStorageKey = (owner) => `cartItems:${owner}`;

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

const persistCartItems = (cartItems, owner) => {
    localStorage.setItem(getCartStorageKey(owner), JSON.stringify(cartItems));
    localStorage.removeItem('cartSlice');
    localStorage.removeItem('cartItems');
};

const initialState = { cartItems: loadCartItems('guest'), owner: 'guest' };

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
            persistCartItems(state.cartItems, state.owner);
        },
        removeFromCart:(state,action)=>{
            const itemId=action.payload;
            state.cartItems=state.cartItems.filter((x)=> (x._id || x.productId) !== itemId);
            persistCartItems(state.cartItems, state.owner);
        },
        updateCartQuantity:(state,action)=>{
            const {id,qty}=action.payload;
            if(qty <= 0){
                state.cartItems=state.cartItems.filter((x)=>(x._id || x.productId) !== id);
            } else {
                state.cartItems=state.cartItems.map((x)=>(x._id || x.productId) === id ? {...x,qty} : x);
            }
            persistCartItems(state.cartItems, state.owner);
        },
        clearCart:(state)=>{
            state.cartItems=[];
            localStorage.removeItem(getCartStorageKey(state.owner));
            localStorage.removeItem('cartItems');
            localStorage.removeItem('cartSlice');
        },
        setCartOwner:(state,action)=>{
            const nextOwner = action.payload || 'guest';
            if (state.owner !== nextOwner) {
                state.owner = nextOwner;
                state.cartItems = loadCartItems(nextOwner);
            }
            localStorage.removeItem('cartItems');
            localStorage.removeItem('cartSlice');
        }
    },
});
export const {addToCart,removeFromCart,updateCartQuantity,clearCart,setCartOwner}=cartSlice.actions;
export {getCartOwner};
export default cartSlice.reducer;