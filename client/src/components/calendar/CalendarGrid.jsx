import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext.js';
import { getCalendarsWithEvents } from '../../services/calendarService.js';
import { deleteEvent } from '../../services/eventService.js';
import CalendarList from './CalendarList.jsx';
import EventForm from '../event/EventForm.jsx';
import EventDetails from '../event/EventDetails.jsx';
import CalendarView from './CalendarView.jsx';
import {monthNames, dayNames, getWeekNumber, getFetchDates, generateMonthGrid, generateWeekGrid} from '../../utils/calendar.js';
import {CALENDAR_COLOR} from "../../utils/colors.js";
import { getHolidays } from '../../services/holidayService.js';
import { getTags } from '../../services/tagService.js';

const prepareEvent = (event, calendar, permissions) => ({
    ...event,
    calendarId: calendar.id,
    displayColor: event.color || calendar.color || CALENDAR_COLOR,
    calendarName: calendar.name,
    eventCreator: event.createdBy?.login || event.createdBy?.email,
    ...permissions
});

const getEventPermissions = (event, calendars, user) => {
    const userId = String(user?.id);
    const calendarId = String(
        event.calendarId?.id || event.calendarId?._id || event.calendarId
    );
    const isOwned = calendars.owned.some(c => String(c.id) === calendarId);
    if (isOwned) {
        return {
            isEditable: true,
            isDeletable: true,
            isShareable: true
        };
    }
    const sharedCal = calendars.shared.find(c => String(c.id) === calendarId);
    const calendarMember = sharedCal?.sharedWith?.find(
        member => String(member.user?.id || member.user) === userId
    );
    const isCreator = String(event.createdBy?.id || event.createdBy) === userId;
    const isCalendarEditor = calendarMember?.role === 'editor';
    const eventMember = event.participants?.find(
        participant => String(participant.user?.id || participant.user) === userId
    );
    const isEventEditor = eventMember?.role === 'editor' && eventMember?.status === 'accepted';
    return {
        isEditable: isCreator || isCalendarEditor || isEventEditor,
        isDeletable: isCreator || isCalendarEditor,
        isShareable: isCreator || isCalendarEditor || isEventEditor
    };
};

function CalendarGrid({ searchedEvent }) {
    const { user } = useAuthContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendars, setCalendars] = useState({ owned: [], shared: [], invitedEvents: [] });
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewingEvent, setViewingEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [viewMode, setViewMode] = useState('month');
    const getYear = currentDate.getFullYear();
    const getMonth = currentDate.getMonth();
    const currentTimestamp = currentDate.getTime();
    const [holidays, setHolidays] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [tags, setTags] = useState([]);

    const fetchCalendarData = useCallback(() => {
        const current = new Date(currentTimestamp);
        const { startDateStr, endDateStr } = getFetchDates(viewMode, current);

        return getCalendarsWithEvents(startDateStr, endDateStr).then(data => {
            setError('');
            setCalendars(data);
        }).catch(err => {
            setError(err.response?.data?.message || 'Server error');
        });
    }, [currentTimestamp, viewMode]);

    useEffect(() => {
        void fetchCalendarData();
    }, [fetchCalendarData]);

    useEffect(() => {
        getHolidays(getYear)
            .then(data => setHolidays(data.holidays || []))
            .catch(err => {
                console.error('Failed to load holidays:', err);
            });
    }, [getYear, user?.country]);

    useEffect(() => {
        getTags()
            .then(data => {
                const list = Array.isArray(data) ? data : (data.tags || []);
                setTags(list);
            })
            .catch(err => {
                console.error('Failed to load tags:', err);
            });
    }, []);

    useEffect(() => {
        if (!searchedEvent?.data) return;
        const foundEvent = searchedEvent.data;
        const permissions = getEventPermissions(foundEvent, calendars, user);
        const prepared = prepareEvent(
            foundEvent,
            {
                id: String(foundEvent.calendarId?.id || foundEvent.calendarId),
                name: foundEvent.calendarName,
                color: foundEvent.calendarColor
            },
            permissions
        );
        Promise.resolve().then(() => {
            setCurrentDate(new Date(foundEvent.startDate));
            setSelectedDate(null);
            setEditingEvent(null);
            setViewingEvent(prepared);
        });
    }, [searchedEvent, calendars, user]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat || e.ctrlKey || e.metaKey || e.shiftKey) return;

            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
                return;
            }

            if (e.altKey && e.code === 'KeyC' && !selectedDate && !editingEvent) {
                e.preventDefault();
                setViewingEvent(null);
                setEditingEvent(null);
                setSelectedDate(new Date());
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDate, editingEvent]);

    const handlePrev = () => {
        if (viewMode === 'week') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
        } else if (viewMode === 'year') {
            setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
        } else {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        }
        setSelectedDate(null);
        setViewingEvent(null);
        setEditingEvent(null);
    };

    const handleNext = () => {
        if (viewMode === 'week') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
        } else if (viewMode === 'year') {
            setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
        } else {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        }
        setSelectedDate(null);
        setViewingEvent(null);
        setEditingEvent(null);
    };

    const handleDayClick = (dayObj) => {
        setSelectedDate(dayObj.fullDate);
        setViewingEvent(null);
        setEditingEvent(null);
    };

    const handleEventClick = (e, event) => {
        e.stopPropagation();
        setViewingEvent(event);
        setSelectedDate(null);
        setEditingEvent(null);
    };

    const handleMonthSelect = (monthIndex) => {
        setViewMode('month');
        setCurrentDate(new Date(getYear, monthIndex, 1));
    };

    const handleDeleteEvent = async (calendarId, eventId, deleteData) => {
        setError('');
        try {
            await deleteEvent(calendarId, eventId, deleteData);
            setViewingEvent(null);
            await fetchCalendarData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete event');
        }
    };

    const handleTagToggle = (tagId) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const weeks = generateMonthGrid(currentDate);
    const currentWeekDays = generateWeekGrid(currentDate);

    const ownedEvents = calendars.owned.flatMap(calendar => {
        if (calendar.isHidden) return [];
        return (calendar.events || []).map(event =>
            prepareEvent(event, calendar, getEventPermissions(event, calendars, user))
        );
    });

    const sharedEvents = calendars.shared.flatMap(calendar => {
        const myMemberData = calendar.sharedWith?.find(
            member => String(member.user?.id || member.user) === String(user?.id)
        );
        if (myMemberData?.isHidden) return [];
        return (calendar.events || []).map(event =>
            prepareEvent(event, calendar, getEventPermissions(event, calendars, user))
        );
    });

    const invitedEventsList = (calendars.invitedEvents || []).map(event =>
        prepareEvent(
            event,
            {
                id: event.calendarId?.id,
                name: event.calendarId?.name,
                color: CALENDAR_COLOR
            },
            getEventPermissions(event, calendars, user)
        )
    );

    const holidayEvents = holidays.map(holiday => {
        const d = new Date(holiday.startDate);
        return {
            ...holiday,
            startDate: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
            endDate: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
            calendarId: 'holidays',
            calendarName: 'Holidays',
            displayColor: holiday.color,
            isEditable: false,
            isDeletable: false,
            isShareable: false,
            isHoliday: true
        };
    });

    const userEvents = [...ownedEvents, ...sharedEvents, ...invitedEventsList];

    const sortedUserTags = [...tags].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return String(a.id).localeCompare(String(b.id));
    });

    const availableTagsMap = new Map();
    sortedUserTags.forEach(tag => {
        if (tag?.id && !availableTagsMap.has(tag.id)) {
            availableTagsMap.set(tag.id, {
                id: tag.id,
                name: tag.name,
                color: tag.color
            });
        }
    });
    userEvents.forEach(event => {
        (event.tags || []).forEach(tag => {
            if (tag?.id && !availableTagsMap.has(tag.id)) {
                availableTagsMap.set(tag.id, {
                    id: tag.id,
                    name: tag.name,
                    color: tag.color
                });
            }
        });
    });

    const availableTags = Array.from(availableTagsMap.values());

    const allEvents = [...userEvents, ...holidayEvents];

    const filteredEvents = selectedTagIds.length === 0
        ? allEvents
        : allEvents.filter(event => (event.tags || []).some(tag => selectedTagIds.includes(tag?.id)));

    const getEventsForDay = (fullDate) => {
        const targetTime = new Date(fullDate.getFullYear(), fullDate.getMonth(), fullDate.getDate()).getTime();
        return filteredEvents.filter(event => {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
            const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
            return targetTime >= startTime && targetTime <= endTime;
        });
    };

    return (
        <div>
            {error && <p>{error}</p>}

            <CalendarList
                calendars={calendars}
                user={user}
                onUpdate={fetchCalendarData}
            />

            {(availableTags.length > 0 || selectedTagIds.length > 0) && (
                <div>
                    <span>Filter by tags: </span>
                    {availableTags.map(tag => (
                        <label key={tag.id}>
                            <input type="checkbox" checked={selectedTagIds.includes(tag.id)} onChange={() => handleTagToggle(tag.id)}/>
                            <span style={{backgroundColor: tag.color }}>{tag.name}</span>
                        </label>
                    ))}
                </div>
            )}

            <div>
                <button onClick={() => { setViewMode('week'); setSelectedDate(null); setViewingEvent(null); setEditingEvent(null); }}>Week</button>
                <button onClick={() => { setViewMode('month'); setSelectedDate(null); setViewingEvent(null); setEditingEvent(null); }}>Month</button>
                <button onClick={() => { setViewMode('year'); setSelectedDate(null); setViewingEvent(null); setEditingEvent(null); }}>Year</button>
            </div>

            <div>
                <button onClick={handlePrev}>Previous</button>
                <h2>{viewMode === 'year' ? getYear : `${monthNames[getMonth]} ${getYear}`}</h2>
                <button onClick={handleNext}>Next</button>
            </div>

            <CalendarView
                viewMode={viewMode}
                weeks={weeks}
                dayNames={dayNames}
                monthNames={monthNames}
                getYear={getYear}
                getEventsForDay={getEventsForDay}
                currentWeekDays={currentWeekDays}
                getWeekNumber={getWeekNumber}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
                onMonthSelect={handleMonthSelect}
            />

            {(selectedDate || editingEvent) ? (
                <EventForm
                    selectedDate={selectedDate}
                    eventToEdit={editingEvent}
                    calendars={calendars}
                    user={user}
                    onSuccess={() => {
                        setSelectedDate(null);
                        setEditingEvent(null);
                        void fetchCalendarData();
                    }}
                    onCancel={() => {
                        setSelectedDate(null);
                        setEditingEvent(null);
                    }}
                />
            ) : (
                <button onClick={() => setSelectedDate(new Date())}>Create event</button>
            )}

            {viewingEvent && (
                <EventDetails
                    event={viewingEvent}
                    onClose={() => setViewingEvent(null)}
                    onEdit={(ev) => {
                        setEditingEvent(ev);
                        setViewingEvent(null);
                    }}
                    onDelete={handleDeleteEvent}
                    onUpdate={fetchCalendarData}
                />
            )}
        </div>
    );
}

export default CalendarGrid;