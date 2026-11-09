import api from '../api/axios.js';

export const registerUser = async (data) => {
    const response = await api.post('/register', data);
    return response.data;
};

export const loginUser = async (data) => {
    const response = await api.post('/login', data);
    return response.data;
};

export const confirmEmail = async (code) => {
    const response = await api.post('/confirm-email', { code });
    return response.data;
};

export const resendCode = async (email) => {
    const response = await api.post('/resend-code', { email });
    return response.data;
};

export const forgotPassword = async (email) => {
    const response = await api.post('/password-reset', { email });
    return response.data;
};

export const resetPassword = async (token, new_password) => {
    const response = await api.post(`/password-reset/${token}`, { new_password });
    return response.data;
};

export const logoutUser = async () => {
    const response = await api.post('/logout');
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get('/status');
    return response.data.user;
};