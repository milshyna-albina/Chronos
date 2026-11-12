function WeekView({ currentWeekDays, dayNames, getEventsForDay, onDayClick, onEventClick }) {
    const formatEventTime = (startDateStr, endDateStr) => {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const formatTime = (date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        };
        return `${formatTime(start)} - ${formatTime(end)}`;
    };

    return (
        <div className="week-calendar">
            <div className="week-header">

                {currentWeekDays.map((dayObj, index) => (
                    <div key={index}>
                        <div>{dayNames[index]}</div>
                        <div>{dayObj.dayNumber}</div>
                    </div>
                ))}
            </div>

            <div className="week-body">
                <div className="time-column">
                    {Array.from({ length: 24 }, (_, hour) => (
                        <div className="time-slot" key={hour}>
                            {String(hour).padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                {currentWeekDays.map((dayObj, index) => {
                    const dayStart = new Date(dayObj.fullDate);
                    dayStart.setHours(0, 0, 0, 0);

                    const dayEnd = new Date(dayStart);
                    dayEnd.setDate(dayEnd.getDate() + 1);

                    const dayEvents = [...getEventsForDay(dayObj.fullDate)];

                    const positionedEvents = [];

                    dayEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).forEach(event => {
                            const eventStart = new Date(event.startDate);
                            const eventEnd = new Date(event.endDate);
                            const actualStart = eventStart < dayStart ? dayStart : eventStart;
                            const actualEnd = eventEnd > dayEnd ? dayEnd : eventEnd;
                            const startMinutes = actualStart.getHours() * 60 + actualStart.getMinutes();
                            const durationMinutes = (actualEnd - actualStart) / 60000;

                            if (durationMinutes <= 0) return;

                            const overlapping = positionedEvents.filter(p =>
                                startMinutes < p.startMinutes + p.durationMinutes &&
                                startMinutes + durationMinutes > p.startMinutes
                            );

                            let col = 0;
                            while (overlapping.some(p => p.col === col)) {
                                col++;
                            }

                            positionedEvents.push({
                                ...event,
                                startMinutes,
                                durationMinutes,
                                col,
                                groupSize: 1
                            });
                        });

                    positionedEvents.forEach(event => {
                        const overlapping = positionedEvents.filter(other =>
                            event.startMinutes < other.startMinutes + other.durationMinutes &&
                            event.startMinutes + event.durationMinutes > other.startMinutes
                        );
                        event.groupSize = Math.max(1, overlapping.length);
                    });

                    return (
                        <div className="week-day-column" key={index} onClick={() => onDayClick(dayObj)}>
                            {Array.from({ length: 24 }, (_, hour) => (
                                <div className="hour-slot" key={hour}></div>
                            ))}

                            {positionedEvents.map(event => {
                                const width = 100 / event.groupSize;
                                const left = event.col * width;

                                return (
                                    <div className="week-event" key={event.id}
                                        style={{
                                            top: `${event.startMinutes}px`,
                                            height: `${Math.max(event.durationMinutes, 20)}px`,
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            backgroundColor: event.displayColor
                                        }}
                                        onClick={(e) => {e.stopPropagation();onEventClick(e, event);}}>
                                        {event.name}
                                        <div>
                                            {formatEventTime(event.startDate, event.endDate)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default WeekView;