import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import OnboardingTour from './components/common/OnboardingTour';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useAuth } from './context/AuthContext';

const LandingPage         = lazy(() => import('./pages/LandingPage'));
const ConnectionHubPage   = lazy(() => import('./pages/ConnectionHubPage'));
const ExplorerPage        = lazy(() => import('./pages/ExplorerPage'));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'));
const SharedSnapshotPage  = lazy(() => import('./pages/SharedSnapshotPage'));
const ErrorPage           = lazy(() => import('./pages/ErrorPage'));

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--color-text-muted)', fontFamily: 'var(--font)' }}>
      Loading…
    </div>
  );
}

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  // Redirect logged-in users from landing to hub
  if (user) return <Navigate to="/hub" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <OnboardingTour />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/hub" element={<ProtectedRoute><ConnectionHubPage /></ProtectedRoute>} />
          <Route path="/explorer" element={<ProtectedRoute><ExplorerPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
          <Route path="/shared/:token" element={<SharedSnapshotPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
