const loginRegex = /^[a-zA-Z0-9_]{3,30}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^[!-~]{8,50}$/;

const isLoginValid = (login) => {
  if (!login || typeof login !== 'string') {
    return false;
  }
  return loginRegex.test(login);
}

const isEmailValid = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  let trimmed = email.trim();

  return emailRegex.test(trimmed);
}

const isPasswordValid = (password) => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
    return false;
  }
  return passwordRegex.test(password);
}

module.exports = {
  isLoginValid,
  isEmailValid,
  isPasswordValid
};