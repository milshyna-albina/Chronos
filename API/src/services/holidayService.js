function parseDayRange(date) {
  const [year, month, day] = date.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return { startDate, endDate };
}

function mapHolidayToEvent(holiday) {
  const { startDate, endDate } = parseDayRange(holiday.date);
  const title = holiday.localName || holiday.name;
  const baseDescription = holiday.name || '';
  const observedSuffix = holiday.observed ? `. Observed date: ${holiday.observed}` : '.';
  const description = `${baseDescription}${observedSuffix}`;

  return {
    id: `holiday-${holiday.date}`,
    name: title,
    description: description,
    type: 'arrangement',
    startDate: startDate,
    endDate: endDate,
    isAllDay: true,
    color: '#B8E0D2',
    isHoliday: true,
    notificationChannel: 'none',
    recurrence: {
      frequency: 'none'
    }
  };
}

const fetchYearHolidays = async (year, country) => {
  const url = `${process.env.HOLIDAY_API_URL}?country=${country}&year=${year}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Holiday API Error: ${res.status}`);
  }
  const { data } = await res.json();

  return Array.isArray(data) && data.length > 0
    ? data.map(holiday => mapHolidayToEvent(holiday))
    : [];
};

module.exports = { fetchYearHolidays };