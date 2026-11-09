import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, getCurrentUser } from '../services/authService.js';
import { AuthContext } from './AuthContext.js';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userData = await getCurrentUser();
                setUser(userData);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        void checkAuth();
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error(error);
        } finally {
            setUser(null);
            navigate('/');
        }
    };

    const value = { user, loading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};