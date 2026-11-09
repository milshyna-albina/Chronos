export const validatePassword = (password, passwordConfirmation) => {
    if (password.length < 8 || password.length > 50) {
        return 'Password must be between 8 and 50 characters';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/\d/.test(password)) {
        return 'Password must contain at least one number';
    }
    if (password !== passwordConfirmation) {
        return 'Passwords do not match';
    }

    return null;
};

export const validateRegistrationForm = (login, email, password, passwordConfirmation) => {
    if (login.length < 3 || login.length > 30) {
        return 'Login must be between 3 and 30 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(login)) {
        return 'Login must contain only English letters, numbers and underscores';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Invalid email format';
    }

    return validatePassword(password, passwordConfirmation);
};