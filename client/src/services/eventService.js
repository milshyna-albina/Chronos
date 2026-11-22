import api from '../api/axios.js';

export const createEvent = async (calendarId, eventData) => {
    const response = await api.post(`/calendars/${calendarId}/events`, eventData);
    return response.data;
};

export const updateEvent = async (calendarId, eventId, eventData) => {
    const response = await api.patch(`/calendars/${calendarId}/events/${eventId}`, eventData);
    return response.data;
};

export const deleteEvent = async (calendarId, eventId, deleteData = {}) => {
    const response = await api.delete(`/calendars/${calendarId}/events/${eventId}`, { data: deleteData });
    return response.data;
};

export const shareEvent = async (calendarId, eventId, shareData) => {
    const response = await api.post(`/calendars/${calendarId}/events/${eventId}/share`, shareData);
    return response.data;
};

export const removeEventMember = async (calendarId, eventId, userId) => {
    const response = await api.delete(`/calendars/${calendarId}/events/${eventId}/share/${userId}`);
    return response.data;
};

export const updateEventMemberRole = async (calendarId, eventId, userId, role) => {
    const response = await api.patch(`/calendars/${calendarId}/events/${eventId}/share/${userId}`, { role });
    return response.data;
};

export const respondToEventInvite = async (calendarId, eventId, action) => {
    const response = await api.patch(`/calendars/${calendarId}/events/${eventId}/invites`, { action });
    return response.data;
};

export const generateEventShareLink = async (calendarId, eventId, role) => {
    const response = await api.post(`/calendars/${calendarId}/events/${eventId}/link`, { role });
    return response.data;
};

export const disableEventShareLink = async (calendarId, eventId) => {
    const response = await api.delete(`/calendars/${calendarId}/events/${eventId}/link`);
    return response.data;
};

export const joinEventViaLink = async (token) => {
    const response = await api.post(`/events/share/${token}`);
    return response.data;
};