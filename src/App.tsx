import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignupPage from './components/auth/SignupPage';
import LoginPage from './components/auth/LoginPage';
import MemberLoginPage from './components/auth/MemberLoginPage';
import VerifyOTPPage from './components/auth/VerifyOTPPage';

import Dashboard from './pages/dashboard/Dashboard';
import LandingPage from './pages/Landing-page';
// ============================================================
//  App — Router setup
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root is Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Pages */}
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/member-login" element={<MemberLoginPage />} />
        <Route path="/verify" element={<VerifyOTPPage />} />

        {/* Main Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workspace/channel/:channelId" element={<Dashboard />} />

        {/* Catch-all: redirect to Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
