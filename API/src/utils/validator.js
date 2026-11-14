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

const isRoleValid = (role) => {
  return typeof role === 'string' && ['editor', 'viewer'].includes(role);
};

const isTypeValid = (type) => {
  return typeof type === 'string'
         && ['arrangement', 'reminder', 'task'].includes(type);
};

const isTagValid = (tag) => {
  if (!tag || typeof tag !== 'string') {
    return false;
  }
  const trimmed = tag.trim();

  return trimmed.length > 0 && trimmed.length <= 50;
};

const isActionValid = (action) => {
  return typeof action === 'string' && ['accept', 'decline'].includes(action);
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

module.exports = {
  isLoginValid,
  isEmailValid,
  isPasswordValid,
  isNameValid,
  isDescriptionValid,
  isColorValid,
  isRoleValid,
  isTypeValid,
  isTagValid,
  isActionValid,
  validateRecurrence
};