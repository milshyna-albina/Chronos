import api from '../api/axios.js';

export const getCalendarsWithEvents = async (startDate, endDate) => {
    const response = await api.get(`/calendars?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
};

export const createCalendar = async (calendarData) => {
    const response = await api.post('/calendars', calendarData);
    return response.data;
};

export const updateCalendar = async (calendarId, calendarData) => {
    const response = await api.patch(`/calendars/${calendarId}`, calendarData);
    return response.data;
};

export const toggleCalendarVisibility = async (calendarId, isHidden) => {
    const response = await api.patch(`/calendars/${calendarId}/hide`, { isHidden });
    return response.data;
};

export const deleteCalendar = async (calendarId) => {
    const response = await api.delete(`/calendars/${calendarId}`);
    return response.data;
};

export const shareCalendar = async (calendarId, shareData) => {
    const response = await api.post(`/calendars/${calendarId}/share`, shareData);
    return response.data;
};

export const removeSharedMember = async (calendarId, userId) => {
    const response = await api.delete(`/calendars/${calendarId}/share/${userId}`);
    return response.data;
};

export const createEvent = async (calendarId, eventData) => {
    const response = await api.post(`/calendars/${calendarId}/events`, eventData);
    return response.data;
};