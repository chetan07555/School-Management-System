import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import API from './services/api';
import { initSocket } from './services/socket';
import { clearAuth, getStoredToken, saveAuth } from './utils/auth';
import ProtectedRoute from './components/ProtectedRoute';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ClassesPage from './pages/ClassesPage';
import AttendancePage from './pages/AttendancePage';
import AttendanceListPage from './pages/AttendanceListPage';
import MarksPage from './pages/MarksPage';
import MarksListPage from './pages/MarksListPage';
import UpdateMarksPage from './pages/UpdateMarksPage';
import NotesPage from './pages/NotesPage';
import TimetablePage from './pages/TimetablePage';
import NotificationsPage from './pages/NotificationsPage';
import ReportPage from './pages/ReportPage';

function App() {
  useEffect(() => {
    const token = getStoredToken();
    const user = localStorage.getItem('user');

    if (token && !user) {
      API.get('/auth/me')
        .then((response) => saveAuth({ token, user: response.data.user }))
        .catch(() => clearAuth());
    }

    // Initialize socket connection when app loads and user is authenticated
    if (token) {
      initSocket();
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classes"
        element={
          <ProtectedRoute>
            <ClassesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance-list"
        element={
          <ProtectedRoute>
            <AttendanceListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marks"
        element={
          <ProtectedRoute>
            <MarksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marks-list"
        element={
          <ProtectedRoute>
            <MarksListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marks/:id/edit"
        element={
          <ProtectedRoute>
            <UpdateMarksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <NotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <TimetablePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <ReportPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
