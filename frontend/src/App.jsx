import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import ConfirmEmailPage from './pages/auth/ConfirmEmailPage.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import CalendarPage from './pages/CalendarPage';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/confirm-email" element={<ConfirmEmailPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;