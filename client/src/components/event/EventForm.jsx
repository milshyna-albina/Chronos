import { useState, useEffect, useMemo } from 'react';
import { createEvent, updateEvent } from '../../services/calendarService.js';
import { getTags } from '../../services/tagService.js';
import {CALENDAR_COLOR} from "../../utils/colors.js";

function EventForm({ selectedDate, eventToEdit, calendars, user, onSuccess, onCancel }) {
    const editableSharedCalendars = useMemo(() => calendars.shared.filter(cal => {
        const myData = cal.sharedWith?.find(m => {
            const memberId = m.user?.id;
            const currentUserId = user?.id;
            return String(memberId) === String(currentUserId);
        });
        return myData?.role === 'editor';
    }), [calendars.shared, user?.id]);

    const allAvailableCalendars = useMemo(
        () => [...calendars.owned, ...editableSharedCalendars],
        [calendars.owned, editableSharedCalendars]
    );

    const initialCalendarId = eventToEdit ? eventToEdit.calendarId : (allAvailableCalendars.length > 0 ? allAvailableCalendars[0].id : '');
    const initialCalendarColor = eventToEdit ? eventToEdit.color : (allAvailableCalendars.length > 0 ? allAvailableCalendars[0].color : CALENDAR_COLOR);

    const [selectedCalendarId, setSelectedCalendarId] = useState(initialCalendarId);
    const [eventColor, setEventColor] = useState(initialCalendarColor);
    const [eventName, setEventName] = useState(eventToEdit?.name || '');
    const [eventDescription, setEventDescription] = useState(eventToEdit?.description || '');
    const [eventType, setEventType] = useState(eventToEdit?.type || 'arrangement');
    const [location, setLocation] = useState(eventToEdit?.location || '');
    const [notificationChannel, setNotificationChannel] = useState(eventToEdit?.notificationChannel || 'in-app');
    const [reminderMinutesBefore, setReminderMinutesBefore] = useState(eventToEdit?.reminderMinutesBefore || 15);
    const [availableTags, setAvailableTags] = useState([]);
    const initialTags = eventToEdit?.tags ? eventToEdit.tags.map(t => typeof t === 'object' ? t.name : t) : [];
    const [selectedTags, setSelectedTags] = useState(initialTags);
    const rec = eventToEdit?.recurrence || { frequency: 'none' };
    const [frequency, setFrequency] = useState(rec.frequency || 'none');
    const [interval, setIntervalValue] = useState(rec.interval || 1);
    const [daysOfWeek, setDaysOfWeek] = useState(rec.daysOfWeek || []);
    const [endsType, setEndsType] = useState(rec.until ? 'date' : 'never');

    useEffect(() => {
        getTags().then(data => setAvailableTags(data.tags || [])).catch(console.error);
    }, []);

    useEffect(() => {
        if (eventToEdit) return;
        const updateColorAsync = async () => {
            await Promise.resolve();
            const selectedCal = allAvailableCalendars.find(
                cal => String(cal.id) === String(selectedCalendarId)
            );
            if (selectedCal) {
                setEventColor(selectedCal.color || CALENDAR_COLOR);
            }
        };

        updateColorAsync().catch(console.error);
    }, [selectedCalendarId, allAvailableCalendars, eventToEdit]);

    const formatYMD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const [untilDate, setUntilDate] = useState(() => {
        if (rec.until) return formatYMD(new Date(rec.until));
        return '';
    });

    const initStart = eventToEdit ? new Date(eventToEdit.startDate) : (selectedDate || new Date());
    const initEnd = eventToEdit ? new Date(eventToEdit.endDate) : (selectedDate || new Date());
    const [startDateVal, setStartDateVal] = useState(() => formatYMD(initStart));
    const [endDateVal, setEndDateVal] = useState(() => formatYMD(initEnd));

    const [startTime, setStartTime] = useState(() => {
        if (eventToEdit) {
            return `${String(initStart.getHours()).padStart(2, '0')}:${String(initStart.getMinutes()).padStart(2, '0')}`;
        }
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    });

    const [endTime, setEndTime] = useState(() => {
        if (eventToEdit) {
            return `${String(initEnd.getHours()).padStart(2, '0')}:${String(initEnd.getMinutes()).padStart(2, '0')}`;
        }
        const later = new Date();
        later.setHours(later.getHours() + 1);
        const hours = String(later.getHours()).padStart(2, '0');
        const minutes = String(later.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    });

    const [error, setError] = useState('');

    const handleCalendarChange = (e) => {
        setSelectedCalendarId(e.target.value);
    };

    const toggleTag = (tagName) => {
        setSelectedTags(prev =>
            prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
        );
    };

    const toggleDayOfWeek = (day) => {
        setDaysOfWeek(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setEventType(newType);
        if (newType === 'arrangement') {
            setNotificationChannel('in-app');
        }
        else if (newType === 'task') {
            setNotificationChannel('none');
        }
        else if (newType === 'reminder') {
            setNotificationChannel('email');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedCalendarId) {
            setError('Please select a calendar');
            return;
        }

        const parseDateTime = (dateStr, timeStr) => {
            const [y, m, d] = dateStr.split('-');
            const [h, min] = timeStr.split(':');
            return new Date(y, m - 1, d, h, min);
        };

        const startDateTime = parseDateTime(startDateVal, startTime);
        const endDateTime = parseDateTime(endDateVal, endTime);

        if (startDateTime >= endDateTime) {
            setError('End time cannot be earlier than start time');
            return;
        }

        if (frequency !== 'none' && endsType === 'date' && untilDate) {
            const untilDateTime = new Date(untilDate);
            untilDateTime.setHours(23, 59, 59, 999);
            if (untilDateTime <= startDateTime) {
                setError('The repeat end date must be after the event start date.');
                return;
            }
        }

        let recurrenceData = { frequency: 'none' };

        if (frequency !== 'none') {
            recurrenceData = {
                frequency,
                interval: parseInt(interval, 10)
            };

            if (frequency === 'weekly' && daysOfWeek.length > 0) {
                recurrenceData.daysOfWeek = daysOfWeek;
            }

            if (endsType === 'date' && untilDate) {
                const untilDateTime = new Date(untilDate);
                untilDateTime.setHours(23, 59, 59, 999);
                recurrenceData.until = untilDateTime.toISOString();
            }
        }

        const eventData = {
            name: eventName,
            description: eventDescription,
            type: eventType,
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            location: location,
            tags: selectedTags,
            color: eventColor,
            recurrence: recurrenceData,
            notificationChannel: notificationChannel,
            reminderMinutesBefore: parseInt(reminderMinutesBefore, 10)
        };

        try {
            if (eventToEdit) {
                await updateEvent(selectedCalendarId, eventToEdit.id, eventData);
            } else {
                await createEvent(selectedCalendarId, eventData);
            }
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    return (
        <div>
            <h3>{eventToEdit ? 'Edit event' : 'Add event'}</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Calendar</label>
                    <select value={selectedCalendarId} onChange={handleCalendarChange} disabled={!!eventToEdit}>
                        {calendars.owned.map(cal => (
                            <option key={cal.id} value={cal.id}>{cal.name}</option>
                        ))}
                        {editableSharedCalendars.map(cal => (
                            <option key={cal.id} value={cal.id}>{cal.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Name</label>
                    <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
                </div>

                <div>
                    <label>Description</label>
                    <input type="text" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
                </div>

                {eventType === 'arrangement' && (
                    <div>
                        <label>Location</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
                    </div>
                )}

                <div>
                    <label>Tags</label>
                    {availableTags.length === 0 ? (
                        <p>No tags</p>
                    ) : (
                        <div>
                            {availableTags.map(tag => (
                                <label key={tag.id} style={{ backgroundColor: tag.color }}>
                                    <input type="checkbox" checked={selectedTags.includes(tag.name)} onChange={() => toggleTag(tag.name)} />
                                    {tag.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label>Color</label>
                    <input type="color" value={eventColor} onChange={(e) => setEventColor(e.target.value)} />
                </div>

                <div>
                    <label>Start</label>
                    <input type="date" value={startDateVal} onChange={(e) => setStartDateVal(e.target.value)} required />
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>

                <div>
                    <label>End</label>
                    <input type="date" value={endDateVal} onChange={(e) => setEndDateVal(e.target.value)} required />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>

                <div>
                    <label>Type</label>
                    <select value={eventType} onChange={handleTypeChange}>
                        <option value="arrangement">Arrangement</option>
                        <option value="reminder">Reminder</option>
                        <option value="task">Task</option>
                    </select>
                </div>

                <div>
                    <label>Notification</label>
                    <select value={notificationChannel} onChange={(e) => setNotificationChannel(e.target.value)}>
                        <option value="none">None</option>
                        <option value="email">Email</option>
                        <option value="in-app">In-App</option>
                        <option value="both">Both</option>
                    </select>
                </div>

                {notificationChannel !== 'none' && (
                    <div>
                        <label>Remind before </label>
                        <input type="number" min="1" value={reminderMinutesBefore} onChange={(e) => setReminderMinutesBefore(e.target.value)} required />
                         <span> minutes</span>
                    </div>
                )}

                <div>
                    <label>Repeat</label>
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>

                {frequency !== 'none' && (
                    <div>
                        <div>
                            <label>Repeat every</label>
                            <input type="number" min="1" value={interval} onChange={(e) => setIntervalValue(e.target.value)} required />
                            <span>
                                {frequency === 'daily' && ' days'}
                                {frequency === 'weekly' && ' weeks'}
                                {frequency === 'monthly' && ' months'}
                                {frequency === 'yearly' && ' years'}
                            </span>
                        </div>

                        {frequency === 'weekly' && (
                            <div>
                                <label>Repeat on</label>
                                <div>
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                                        <label key={index}>
                                            <input type="checkbox" checked={daysOfWeek.includes((index + 1) % 7)} onChange={() => toggleDayOfWeek((index + 1) % 7)} />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label>Ends</label>
                            <div>
                                <label>
                                    <input type="radio" name="endsType" value="never" checked={endsType === 'never'} onChange={() => setEndsType('never')} />
                                    Never
                                </label>
                                <label>
                                    <input type="radio" name="endsType" value="date" checked={endsType === 'date'} onChange={() => setEndsType('date')} />
                                    On date
                                </label>
                            </div>

                            {endsType === 'date' && (
                                <input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} required={endsType === 'date'} />
                            )}
                        </div>
                    </div>
                )}

                <button type="submit">Save</button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </form>

            {error && <p>{error}</p>}
        </div>
    );
}

export default EventForm;