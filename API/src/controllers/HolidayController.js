const { fetchYearHolidays } = require('../services/holidayService');
const { isCountryCodeValid, isValidYear } = require('../utils/validator');

class HolidayController {
  async getHolidays(req, res) {
    try {
      const { year, country } = req.query;

      if (year === undefined || year === null || year === '') {
        return res.status(400).json({
          message: 'Year is required.'
        });
      }
      if (!isValidYear(year)) {
        return res.status(400).json({
          message: 'Invalid year.'
        });
      }
      const normalizedYear = typeof year === 'string' ? Number(year.trim()) : year;
      const targetCountry = country ? String(country).trim().toUpperCase() : (req.user?.country || 'UA');

      if (!isCountryCodeValid(targetCountry)) {
        return res.status(400).json({
          message: 'Invalid country code.'
        });
      }

      const holidays = await fetchYearHolidays(normalizedYear, targetCountry);

      res.status(200).json({
        holidays: holidays
      });
    } catch (error) {
      console.error('[HolidayController.getHolidays]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new HolidayController();