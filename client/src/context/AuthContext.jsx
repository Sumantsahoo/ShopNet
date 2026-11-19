import React,{createContext,useCallback,useEffect,useState} from "react";
import { useDispatch } from 'react-redux';
import { getCartOwner, setCartOwner } from '../redux/cartSlice';
import { apiFetch } from '../utils/api';
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
    const logout=useCallback(()=>{
        dispatch(setCartOwner('guest'));
        setUser(null);
        localStorage.removeItem('userInfo');
    },[dispatch]);
    useEffect(() => {
        const token = user?.token;
        if (!token) return undefined;
        let cancelled = false;
        const refreshProfile = async () => {
            try {
                const response = await apiFetch('/api/authorite/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        if (!cancelled) logout();
                        return;
                    }
                    throw new Error(data.message || 'Could not refresh account access.');
                }
                if (!cancelled) {
                    setUser((current) => {
                        if (!current || current.token !== token) return current;
                        const refreshedUser = {
                            ...current,
                            id: data.id,
                            name: data.name,
                            email: data.email,
                            role: data.role,
                            isCofounder: data.isCofounder,
                            employeePosition: data.employeePosition,
                            employeeCompanyId: data.employeeCompanyId
                        };
                        localStorage.setItem('userInfo', JSON.stringify(refreshedUser));
                        return refreshedUser;
                    });
                }
            } catch (error) {
                if (!cancelled) console.error('Could not refresh account access:', error.message);
            }
        };
        refreshProfile();
        return () => { cancelled = true; };
    }, [logout, user?.token]);
    const login=(userData)=>{
        dispatch(setCartOwner(getCartOwner(userData)));
        setUser(userData);
        localStorage.setItem('userInfo',JSON.stringify(userData));
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