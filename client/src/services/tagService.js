import api from '../api/axios.js';

export const getTags = async () => {
    const response = await api.get('/tags');
    return response.data;
};

export const createTag = async (tagData) => {
    const response = await api.post('/tags', tagData);
    return response.data;
};

export const updateTag = async (tagId, tagData) => {
    const response = await api.patch(`/tags/${tagId}`, tagData);
    return response.data;
};