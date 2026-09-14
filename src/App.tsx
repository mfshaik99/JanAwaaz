import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { CitizenPortal } from './components/CitizenPortal';
import { SubmitRequest } from './components/SubmitRequest';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Loader2, AlertCircle } from 'lucide-react';

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);
  
  useEffect(() => {
    if (!loading && user && profile?.role !== 'admin') {
      setShowError(true);
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile, navigate]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!user) return <Navigate to="/login" />;
  
  if (showError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh] animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-6 text-lg">You are not authorized to access the JanAwaaz Policymaker Dashboard.</p>
        <p className="text-sm text-slate-400">Redirecting you back to the Citizen Portal...</p>
      </div>
    );
  }
  
  if (profile?.role === 'admin') {
    return <>{children}</>;
  }
  
  return null;
}

function ProtectedCitizenRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<CitizenPortal />} />
            <Route 
              path="/submit" 
              element={
                <ProtectedCitizenRoute>
                  <SubmitRequest />
                </ProtectedCitizenRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedAdminRoute>
                  <Dashboard />
                </ProtectedAdminRoute>
              } 
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

