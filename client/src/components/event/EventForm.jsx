import { useState, useEffect, useMemo } from 'react';
import { createEvent } from '../../services/calendarService.js';
import { getTags } from '../../services/tagService.js';
import {CALENDAR_COLOR} from "../../utils/colors.js";

function EventForm({ selectedDate, calendars, user, onSuccess, onCancel }) {
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

    const initialCalendarId = allAvailableCalendars.length > 0 ? allAvailableCalendars[0].id : '';
    const initialCalendarColor = allAvailableCalendars.length > 0 ? allAvailableCalendars[0].color : CALENDAR_COLOR;

    const [selectedCalendarId, setSelectedCalendarId] = useState(initialCalendarId);
    const [eventColor, setEventColor] = useState(initialCalendarColor);
    const [eventName, setEventName] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventType, setEventType] = useState('arrangement');
    const [location, setLocation] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

    useEffect(() => {
        getTags().then(data => setAvailableTags(data.tags || [])).catch(console.error);
    }, []);

    useEffect(() => {
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
    }, [selectedCalendarId, allAvailableCalendars]);

    const formatYMD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const [startDateVal, setStartDateVal] = useState(() => formatYMD(selectedDate));
    const [endDateVal, setEndDateVal] = useState(() => formatYMD(selectedDate));

    const [startTime, setStartTime] = useState(() => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    });

    const [endTime, setEndTime] = useState(() => {
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

        const eventData = {
            name: eventName,
            description: eventDescription,
            type: eventType,
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            location: location,
            tags: selectedTags,
            color: eventColor
        };

        try {
            await createEvent(selectedCalendarId, eventData);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    return (
        <div>
            <h3>Add event</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Calendar</label>
                    <select value={selectedCalendarId} onChange={handleCalendarChange}>
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
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                        <option value="arrangement">Arrangement</option>
                        <option value="reminder">Reminder</option>
                        <option value="task">Task</option>
                    </select>
                </div>

                <button type="submit">Save</button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </form>

            {error && <p>{error}</p>}
        </div>
    );
}

export default EventForm;