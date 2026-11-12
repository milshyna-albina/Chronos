import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext.js';
import { getCalendarsWithEvents } from '../../services/calendarService.js';
import CalendarList from './CalendarList.jsx';
import EventForm from '../event/EventForm.jsx';
import EventDetails from '../event/EventDetails.jsx';
import CalendarView from './CalendarView.jsx';
import {monthNames, dayNames, getWeekNumber, getFetchDates, generateMonthGrid, generateWeekGrid} from '../../utils/calendar.js';

function CalendarGrid() {
    const { user } = useAuthContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendars, setCalendars] = useState({ owned: [], shared: [] });
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewingEvent, setViewingEvent] = useState(null);
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
    };

    const handleDayClick = (dayObj) => {
        setSelectedDate(dayObj.fullDate);
        setViewingEvent(null);
    };

    const handleEventClick = (e, event) => {
        e.stopPropagation();
        setViewingEvent(event);
        setSelectedDate(null);
    };

    const handleMonthSelect = (monthIndex) => {
        setViewMode('month');
        setCurrentDate(new Date(getYear, monthIndex, 1));
    };

    const handleEventCreated = () => {
        setSelectedDate(null);
        fetchCalendarData();
    };

    const weeks = generateMonthGrid(currentDate);
    const currentWeekDays = generateWeekGrid(currentDate);

    const ownedEvents = calendars.owned.flatMap(calendar => {
        if (calendar.isHidden) return [];
        return (calendar.events || []).map(event => {
            const creatorObj = event.createdBy;
            const creatorName = creatorObj?.login || creatorObj?.email || 'Me';
            return {
                ...event,
                displayColor: event.color || calendar.color,
                calendarName: calendar.name,
                eventCreator: creatorName
            };
        });
    });

    const sharedEvents = calendars.shared.flatMap(calendar => {
        const myMemberData = calendar.sharedWith?.find(m => {
            const memberId = m.userId?._id || m.userId;
            const currentUserId = user?._id || user?.id;
            return String(memberId) === String(currentUserId);
        });
        if (myMemberData?.isHidden) return [];
        return (calendar.events || []).map(event => {
            const creatorObj = event.createdBy;
            const creatorName = creatorObj?.login || creatorObj?.email || 'Unknown';
            return {
                ...event,
                displayColor: event.color || calendar.color,
                calendarName: calendar.name,
                eventCreator: creatorName
            };
        });
    });

    const allEvents = [...ownedEvents, ...sharedEvents];

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
                <button onClick={() => { setViewMode('week'); setSelectedDate(null); setViewingEvent(null); }}>Week</button>
                <button onClick={() => { setViewMode('month'); setSelectedDate(null); setViewingEvent(null); }}>Month</button>
                <button onClick={() => { setViewMode('year'); setSelectedDate(null); setViewingEvent(null); }}>Year</button>
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

            {selectedDate ? (
                <EventForm
                    selectedDate={selectedDate}
                    calendars={calendars}
                    user={user}
                    onSuccess={handleEventCreated}
                    onCancel={() => setSelectedDate(null)}
                />
            ) : (
                <button onClick={() => setSelectedDate(new Date())}>Create event</button>
            )}

            {viewingEvent && (
                <EventDetails
                    event={viewingEvent}
                    onClose={() => setViewingEvent(null)}
                />
            )}
        </div>
    );
}

export default CalendarGrid;