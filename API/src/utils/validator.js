const VALID_COUNTRY_CODES = new Set([
  'AM', 'AR', 'AT', 'AU', 'BE', 'BG', 'BO', 'BR', 'BY', 'CA', 'CH', 'CO', 'CY',
  'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'GT', 'HR', 'HU', 'IE',
  'IN', 'IS', 'IT', 'JP', 'KE', 'KR', 'KZ', 'LI', 'LT', 'LU', 'LV', 'MA', 'MT',
  'MX', 'NG', 'NL', 'NO', 'NZ', 'PA', 'PE', 'PH', 'PL', 'PT', 'RO', 'RS', 'SE',
  'SG', 'SI', 'SK', 'SM', 'TH', 'TR', 'UA', 'US', 'ZA'
]);

const isLoginValid = (login) => {
  if (!login || typeof login !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_]{3,30}$/.test(login);
};

const isEmailValid = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

const isPasswordValid = (password) => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
    return false;
  }
  return /^[!-~]{8,50}$/.test(password);
};

const isNameValid = (name) => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();

  return trimmed.length > 0 && trimmed.length <= 200;
};

const isDescriptionValid = (description) => {
  if (!description || typeof description !== 'string') {
    return false;
  }
  return description.trim().length > 0;
};

const isColorValid = (color) => {
  if (!color || typeof color !== 'string') {
    return false;
  }
  return /^#([a-fA-F0-9]{3}){1,2}$/.test(color);
};

const isTagValid = (tag) => {
  if (!tag || typeof tag !== 'string') {
    return false;
  }
  const trimmed = tag.trim();

  return trimmed.length > 0 && trimmed.length <= 50;
};

const allowedWrapper = (field, allowed) => {
  return typeof field === 'string' && allowed.includes(field);
};

const isRoleValid = (role) => {
  return allowedWrapper(role, ['editor', 'viewer']);
};

const isTypeValid = (type) => {
  return allowedWrapper(type, ['arrangement', 'reminder', 'task']);
};

const isActionValid = (action) => {
  return allowedWrapper(action, ['accept', 'decline']);
};

const isChannelValid = (channel) => {
  return allowedWrapper(channel, ['none', 'email', 'in-app', 'both']);
};

const isCountryCodeValid = (code) => {
  return typeof code === 'string'
    && VALID_COUNTRY_CODES.has(code.trim().toUpperCase());
};

const validateRecurrence = (recurrence, startDate) => {
  if (!recurrence || recurrence.frequency === 'none') {
    return { isValid: true };
  }
  const allowedFreq = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
  if (!allowedFreq.includes(recurrence.frequency)) {
    return {
      isValid: false,
      message: 'Invalid frequency value.'
    };
  }
  if (recurrence.interval !== undefined) {
    if (!Number.isInteger(recurrence.interval) || recurrence.interval < 1) {
      return {
        isValid: false,
        message: 'Interval must be an integer greater than or equal to 1.'
      };
    }
  }
  if (recurrence.daysOfWeek !== undefined) {
    if (!Array.isArray(recurrence.daysOfWeek)) {
      return {
        isValid: false,
        message: "'daysOfWeek' must be an array."
      };
    }
    const isValidDays = recurrence.daysOfWeek.every(
      day => Number.isInteger(day) && day >= 0 && day <= 6
    );
    if (!isValidDays) {
      return {
        isValid: false,
        message: "Days of week must be integers between 0 (Sunday) and 6 (Saturday)."
      };
    }
  }
  if (recurrence.until !== undefined) {
    const untilDate = new Date(recurrence.until);
    const start = new Date(startDate);

    if (isNaN(untilDate.getTime())) {
      return {
        isValid: false,
        message: "Invalid 'until' date format."
      };
    }
    if (untilDate <= start) {
      return {
        isValid: false,
        message: "'until' date must be after the 'startDate'."
      };
    }
  }

  return { isValid: true };
};

const isValidYear = (year) => {
  if (!year) {
    return false;
  }
  if (typeof year === 'string') {
    const trimmed = year.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      return false;
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0;
  }
  if (typeof year === 'number') {
    return Number.isInteger(year) && year > 0;
  }
  return false;
};

module.exports = {
  isLoginValid,
  isEmailValid,
  isPasswordValid,
  isNameValid,
  isDescriptionValid,
  isColorValid,
  isTagValid,
  isRoleValid,
  isTypeValid,
  isActionValid,
  isChannelValid,
  isCountryCodeValid,
  validateRecurrence,
  isValidYear
};