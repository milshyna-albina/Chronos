import api from '../api/axios.js';

export const searchUsers = async (email) => {
    const response = await api.get(`/users/search?email=${email}`);
    return response.data;
};

export const getUserById = async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

export const updateAvatar = async (avatarFile) => {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const response = await api.patch('/users/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const updateUser = async (data) => {
    const response = await api.patch('/users/', data);
    return response.data;
};

export const deleteUser = async () => {
    const response = await api.delete('/users/');
    return response.data;
};