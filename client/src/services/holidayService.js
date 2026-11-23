import api from '../api/axios.js';

export const getHolidays = async (year) => {
    const response = await api.get(`/holidays?year=${year}`);
    return response.data;
};