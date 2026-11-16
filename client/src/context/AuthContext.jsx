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
    const updateUser=(updates)=>{
        setUser((current)=>{
            if (!current) return current;
            const updatedUser = { ...current, ...updates };
            localStorage.setItem('userInfo', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };
    return(
        <AuthContext.Provider value={{user,login,logout,updateUser}}>
        {children}
        </AuthContext.Provider>
    );
};