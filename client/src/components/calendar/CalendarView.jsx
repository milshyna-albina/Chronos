import MonthView from './views/MonthView.jsx';
import WeekView from './views/WeekView.jsx';
import YearView from './views/YearView.jsx';
import '../../styles/index.css';

function CalendarView({viewMode, weeks, dayNames, monthNames, getYear, getEventsForDay,
                          currentWeekDays, onDayClick, onEventClick, onMonthSelect}) {
    return (
        <div>
            {viewMode === 'month' && (
                <MonthView
                    weeks={weeks}
                    dayNames={dayNames}
                    getEventsForDay={getEventsForDay}
                    onDayClick={onDayClick}
                    onEventClick={onEventClick}
                />
            )}

            {viewMode === 'week' && (
                <WeekView
                    currentWeekDays={currentWeekDays}
                    dayNames={dayNames}
                    getEventsForDay={getEventsForDay}
                    onDayClick={onDayClick}
                    onEventClick={onEventClick}
                />
            )}

            {viewMode === 'year' && (
                <YearView
                    monthNames={monthNames}
                    dayNames={dayNames}
                    getYear={getYear}
                    onMonthSelect={onMonthSelect}
                />
            )}
        </div>
    );
}

export default CalendarView;