import React,{createContext,useEffect,useState} from "react";
import { useDispatch } from 'react-redux';
import { getCartOwner, setCartOwner } from '../redux/cartSlice';
export const AuthContext=createContext();
export const AuthProvider=({children}) =>{
    const dispatch = useDispatch();
    const [user,setUser]=useState(()=>{
        const userInfo=localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    });
    useEffect(()=>{
        dispatch(setCartOwner(getCartOwner(user)));
    },[dispatch,user]);
    const login=(userData)=>{
        dispatch(setCartOwner(getCartOwner(userData)));
        setUser(userData);
        localStorage.setItem('userInfo',JSON.stringify(userData));
    };
    const logout=()=>{
        dispatch(setCartOwner('guest'));
        setUser(null);
        localStorage.removeItem('userInfo');
    };
    return(
        <AuthContext.Provider value={{user,login,logout}}>
        {children}
        </AuthContext.Provider>
    );
};