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

export const updateSharedMemberRole = async (calendarId, userId, role) => {
    const response = await api.patch(`/calendars/${calendarId}/share/${userId}`, { role });
    return response.data;
};

export const respondToInvite = async (calendarId, action) => {
    const response = await api.patch(`/calendars/${calendarId}/invites`, { action });
    return response.data;
};

export const generateShareLink = async (calendarId, role) => {
    const response = await api.post(`/calendars/${calendarId}/link`, { role });
    return response.data;
};

export const disableShareLink = async (calendarId) => {
    const response = await api.delete(`/calendars/${calendarId}/link`);
    return response.data;
};

export const joinCalendarViaLink = async (token) => {
    const response = await api.post(`/calendars/share/${token}`);
    return response.data;
};
