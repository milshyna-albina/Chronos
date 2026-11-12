export const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export const getFetchDates = (viewMode, currentDate) => {
    const getYear = currentDate.getFullYear();
    const getMonth = currentDate.getMonth();
    let startDateStr, endDateStr;

    if (viewMode === 'year') {
        startDateStr = new Date(getYear, 0, 1).toISOString();
        endDateStr = new Date(getYear + 1, 0, 1).toISOString();
    } else if (viewMode === 'week') {
        const currentDay = currentDate.getDay();
        const startOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + startOffset);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        startDateStr = weekStart.toISOString();
        endDateStr = weekEnd.toISOString();
    } else {
        const firstDay = new Date(getYear, getMonth, 1);
        const lastDay = new Date(getYear, getMonth + 1, 0);
        startDateStr = new Date(getYear, getMonth, 1 - (firstDay.getDay() + 6) % 7).toISOString();
        endDateStr = new Date(getYear, getMonth + 1, lastDay.getDate() + (7 - (lastDay.getDay() + 6) % 7) % 7).toISOString();
    }
    return { startDateStr, endDateStr };
};

export const generateMonthGrid = (currentDate) => {
    const getYear = currentDate.getFullYear();
    const getMonth = currentDate.getMonth();
    const daysInMonth = new Date(getYear, getMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(getYear, getMonth, 1).getDay();
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const prevMonthDays = new Date(getYear, getMonth, 0).getDate();
    const days = [];

    for (let i = startDay - 1; i >= 0; i--) {
        days.push({
            dayNumber: prevMonthDays - i,
            fullDate: new Date(getYear, getMonth - 1, prevMonthDays - i)
        });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            dayNumber: i,
            fullDate: new Date(getYear, getMonth, i)
        });
    }

    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        days.push({
            dayNumber: i,
            fullDate: new Date(getYear, getMonth + 1, i)
        });
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }
    return weeks;
};

export const generateWeekGrid = (currentDate) => {
    const currentWeekDay = currentDate.getDay();
    const currentWeekStartOffset = currentWeekDay === 0 ? -6 : 1 - currentWeekDay;
    const currentWeekDays = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + currentWeekStartOffset + i);
        currentWeekDays.push({
            dayNumber: d.getDate(),
            fullDate: d
        });
    }
    return currentWeekDays;
};