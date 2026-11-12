function YearView({ monthNames, dayNames, getYear, onMonthSelect }) {
    const renderMiniMonth = (monthIndex) => {
        const daysInMonth = new Date(getYear, monthIndex + 1, 0).getDate();
        const firstDay = new Date(getYear, monthIndex, 1).getDay();
        const startDay = firstDay === 0 ? 6 : firstDay - 1;
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        const monthWeeks = [];
        for (let i = 0; i < days.length; i += 7) {
            const week = days.slice(i, i + 7);
            while (week.length < 7) {
                week.push(null);
            }
            monthWeeks.push(week);
        }

        return (
            <table>
                <tbody>
                <tr>
                    <th colSpan="7" onClick={() => onMonthSelect(monthIndex)}>
                        {monthNames[monthIndex]}
                    </th>
                </tr>
                <tr>
                    {dayNames.map(day => (
                        <th key={day}>{day.substring(0, 2)}</th>
                    ))}
                </tr>
                {monthWeeks.map((week, weekIndex) => (
                    <tr key={weekIndex}>
                        {week.map((day, dayIndex) => (
                            <td key={dayIndex}>{day || ''}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        );
    };

    return (
        <table>
            <tbody>
            <tr>
                {monthNames.slice(0, 4).map((month, index) => (
                    <td key={month}>{renderMiniMonth(index)}</td>
                ))}
            </tr>
            <tr>
                {monthNames.slice(4, 8).map((month, index) => (
                    <td key={month}>{renderMiniMonth(index + 4)}</td>
                ))}
            </tr>
            <tr>
                {monthNames.slice(8, 12).map((month, index) => (
                    <td key={month}>{renderMiniMonth(index + 8)}</td>
                ))}
            </tr>
            </tbody>
        </table>
    );
}

export default YearView;