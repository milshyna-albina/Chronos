import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/auth/MainPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import ConfirmEmailPage from './pages/auth/ConfirmEmailPage.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import CalendarPage from './pages/calendar/CalendarPage.jsx';
import ProfilePage from './pages/users/ProfilePage.jsx';
import UserProfilePage from './pages/users/UserProfilePage.jsx';
import InvitePage from './pages/calendar/InvitePage.jsx';
import JoinLinkPage from './pages/calendar/JoinLinkPage.jsx';
import { NotificationProvider } from './context/NotificationProvider.jsx';
import NotificationContainer from './components/notification/NotificationContainer.jsx';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <NotificationProvider>
                    <NotificationContainer />
                    <Routes>
                        <Route path="/" element={<MainPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/users/:id" element={<UserProfilePage />} />
                        <Route path="/calendar/invites" element={<InvitePage type="calendar" />} />
                        <Route path="/event/invites" element={<InvitePage type="event" />} />
                        <Route path="/calendar/share" element={<JoinLinkPage type="calendar" />} />
                        <Route path="/event/share" element={<JoinLinkPage type="event" />} />
                    </Routes>
                </NotificationProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;