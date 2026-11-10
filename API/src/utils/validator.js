const loginRegex = /^[a-zA-Z0-9_]{3,30}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^[!-~]{8,50}$/;
const colorRegex = /^#([a-fA-F0-9]{3}){1,2}$/;

const isLoginValid = (login) => {
  if (!login || typeof login !== 'string') {
    return false;
  }
  return loginRegex.test(login);
};

const isEmailValid = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return emailRegex.test(email);
};

const isPasswordValid = (password) => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
    return false;
  }
  return passwordRegex.test(password);
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
  return colorRegex.test(color);
};

const isRoleValid = (role) => {
  return typeof role === 'string' && ['editor', 'viewer'].includes(role);
};

const isTypeValid = (type) => {
  return typeof type === 'string'
         && ['arrangement', 'reminder', 'task'].includes(type);
};

module.exports = {
  isLoginValid,
  isEmailValid,
  isPasswordValid,
  isNameValid,
  isDescriptionValid,
  isColorValid,
  isRoleValid,
  isTypeValid
};