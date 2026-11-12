import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api',
    withCredentials: true,
    headers: {'Content-Type': 'application/json'},
});

api.interceptors.response.use((response) => response, (error) => {
    const isLogin = error.config && error.config.url.includes('/login');
    const isCheckAuth = error.config && error.config.url.includes('/users/current');

    if (error.response && error.response.status === 401) {
        if (isCheckAuth) {
            return Promise.reject(error);
        }
        if (!isLogin) {
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
    }

    return Promise.reject(error);
});

export default api;