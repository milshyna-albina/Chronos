import api from '../api/axios.js';

export const registerUser = async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
};

export const loginUser = async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
};

export const confirmEmail = async (code) => {
    const response = await api.post('/auth/confirm-email', { code });
    return response.data;
};

export const resendCode = async (email) => {
    const response = await api.post('/auth/resend-code', { email });
    return response.data;
};

export const forgotPassword = async (email) => {
    const response = await api.post('/auth/password-reset', { email });
    return response.data;
};

export const resetPassword = async (token, new_password) => {
    const response = await api.post(`/auth/password-reset/${token}`, { new_password });
    return response.data;
};

export const logoutUser = async () => {
    const response = await api.post('/auth/logout');
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get('/auth/status');
    return response.data.user;
};