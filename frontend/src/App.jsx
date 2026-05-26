import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConnectionHubPage from './pages/ConnectionHubPage';
import ExplorerPage from './pages/ExplorerPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import ErrorPage from './pages/ErrorPage';
import SharedSnapshotPage from './pages/SharedSnapshotPage';
import ProtectedRoute from './components/common/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><ConnectionHubPage /></ProtectedRoute>} />
      <Route path="/explorer" element={<ProtectedRoute><ExplorerPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
      <Route path="/shared/:token" element={<SharedSnapshotPage />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
