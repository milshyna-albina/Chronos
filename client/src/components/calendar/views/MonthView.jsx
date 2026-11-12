import React from 'react';

function MonthView({ weeks, dayNames, getEventsForDay, onDayClick, onEventClick }) {
    const isMultiDayEvent = (event) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);

        return start.toDateString() !== end.toDateString();
    };

    const renderEvents = (dayObj) => {
        return getEventsForDay(dayObj.fullDate).filter(event => !isMultiDayEvent(event)).map(event => (
                <div key={event.id} onClick={(e) => onEventClick(e, event)} style={{ backgroundColor: event.displayColor }}>
                    {event.type} {event.name}
                </div>
            ));
    };

    const renderMonthWeek = (week, weekIndex) => {
        const weekEvents = new Map();

        week.forEach((dayObj) => {
            if (!dayObj) return;

            const events = getEventsForDay(dayObj.fullDate).filter(isMultiDayEvent);

            events.forEach(event => {
                const eventId = event.id;

                if (weekEvents.has(eventId)) return;

                const eventStart = new Date(event.startDate);
                const eventEnd = new Date(event.endDate);

                const columns = [];

                week.forEach((day, index) => {
                    if (!day) return;

                    const dayStart = new Date(day.fullDate);
                    dayStart.setHours(0, 0, 0, 0);

                    const dayEnd = new Date(dayStart);
                    dayEnd.setDate(dayEnd.getDate() + 1);

                    if (eventStart < dayEnd && eventEnd >= dayStart) {
                        columns.push(index);
                    }
                });

                if (columns.length === 0) return;

                weekEvents.set(eventId, {
                    ...event,
                    startColumn: columns[0],
                    endColumn: columns[columns.length - 1] + 1
                });
            });
        });

        const lanes = [];

        Array.from(weekEvents.values()).sort((a, b) => a.startColumn - b.startColumn).forEach(event => {
                let lane = 0;

                while (lanes[lane]?.some(item => event.startColumn < item.endColumn && event.endColumn > item.startColumn)) {
                    lane++;
                }

                if (!lanes[lane]) {
                    lanes[lane] = [];
                }

                lanes[lane].push(event);
            });

        return (
            <React.Fragment key={weekIndex}>
                <tr>
                    {week.map((dayObj, dayIndex) => (
                        <td key={dayIndex} onClick={() => dayObj && onDayClick(dayObj)}>
                            <div>{dayObj?.dayNumber || ''}</div>
                            {dayObj && renderEvents(dayObj)}
                        </td>
                    ))}
                </tr>

                {lanes.map((lane, laneIndex) => {
                    const cells = [];
                    let column = 0;

                    while (column < 7) {
                        const event = lane.find(
                            item => item.startColumn === column
                        );

                        if (event) {
                            const span = event.endColumn - event.startColumn;

                            cells.push(
                                <td key={`event-${event.id}`} colSpan={span}
                                    style={{ backgroundColor: event.displayColor }}
                                    onClick={(e) => onEventClick(e, event)}>
                                    {event.type} {event.name}
                                </td>
                            );

                            column += span;
                        } else {
                            cells.push(
                                <td key={`empty-${column}`}></td>
                            );

                            column++;
                        }
                    }

                    return (
                        <tr key={`lane-${weekIndex}-${laneIndex}`}>
                            {cells}
                        </tr>
                    );
                })}
            </React.Fragment>
        );
    };

    return (
        <table>
            <thead>
            <tr>
                {dayNames.map(day => (
                    <th key={day}>{day}</th>
                ))}
            </tr>
            </thead>

            <tbody>
                {weeks.map((week, weekIndex) => renderMonthWeek(week, weekIndex))}
            </tbody>
        </table>
    );
}

export default MonthView;