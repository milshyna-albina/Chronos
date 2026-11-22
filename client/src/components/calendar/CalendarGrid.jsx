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

const prepareEvent = (event, calendar, permissions) => ({
    ...event,
    calendarId: calendar.id,
    displayColor: event.color || calendar.color || CALENDAR_COLOR,
    calendarName: calendar.name,
    eventCreator: event.createdBy?.login || event.createdBy?.email,
    ...permissions
});

function CalendarGrid() {
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
        fetchCalendarData();
    }, [fetchCalendarData]);

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
            fetchCalendarData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete event');
        }
    };

    const weeks = generateMonthGrid(currentDate);
    const currentWeekDays = generateWeekGrid(currentDate);

    const ownedEvents = calendars.owned.flatMap(calendar => {
        if (calendar.isHidden) return [];
        return (calendar.events || []).map(event =>
            prepareEvent(event, calendar, {
                isEditable: true,
                isDeletable: true,
                isShareable: true
            })
        );
    });

    const sharedEvents = calendars.shared.flatMap(calendar => {
        const myMemberData = calendar.sharedWith?.find(
            member => String(member.user?.id || member.user) === String(user?.id)
        );
        if (myMemberData?.isHidden) return [];
        return (calendar.events || []).map(event => {
            const isCreator = String(event.createdBy?.id || event.createdBy) === String(user?.id);
            const isCalendarEditor = myMemberData?.role === 'editor';
            const isEventEditor = event.participants?.some(
                p => String(p.user?.id || p.user) === String(user?.id) && p.role === 'editor'
            );

            return prepareEvent(event, calendar, {
                isEditable: isCalendarEditor || isCreator || isEventEditor,
                isDeletable: isCalendarEditor || isCreator,
                isShareable: isCalendarEditor || isCreator || isEventEditor
            });
        });
    });

    const invitedEventsList = (calendars.invitedEvents || []).map(event => {
        const myData = event.participants?.find(
            participant => String(participant.user?.id || participant.user) === String(user?.id)
        );
        const isCreator = String(event.createdBy?.id || event.createdBy) === String(user?.id);
        const isEventEditor = myData?.role === 'editor';

        return prepareEvent(event, {
            id: event.calendarId?.id,
            name: event.calendarId?.name,
            color: CALENDAR_COLOR
        }, {
            isEditable: isEventEditor || isCreator,
            isDeletable: isCreator,
            isShareable: isEventEditor || isCreator
        });
    });

    const allEvents = [...ownedEvents, ...sharedEvents, ...invitedEventsList];

    const getEventsForDay = (fullDate) => {
        const targetTime = new Date(fullDate.getFullYear(), fullDate.getMonth(), fullDate.getDate()).getTime();
        return allEvents.filter(event => {
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
                        fetchCalendarData();
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