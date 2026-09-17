import React, { useEffect, useState } from 'react';
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


const PageSkeleton = () => (
  <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-pulse">
    <div className="h-40 bg-slate-100 rounded-3xl border border-slate-200/50"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-2 h-96 bg-slate-100 rounded-3xl border border-slate-200/50"></div>
      <div className="h-96 bg-slate-100 rounded-3xl border border-slate-200/50"></div>
    </div>
  </div>
);


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

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" />;
  
  if (showError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh] animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 google-shadow-sm border border-red-100">
          <AlertCircle size={36} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Access Denied</h2>
        <p className="text-slate-600 mb-6 text-lg max-w-md">You are not authorized to access the JanAwaaz Policymaker Dashboard.</p>
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Redirecting you to Portal...</p>
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
  if (loading) return <PageSkeleton />;
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

