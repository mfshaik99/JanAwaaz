import React, { ReactNode, useState, useEffect } from 'react';
import { LayoutDashboard, Users, Zap, LogOut, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    await auth.signOut();
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 google-shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center google-shadow-sm rounded-xl overflow-hidden bg-blue-600">
                <img src="/favicon.svg" alt="JanAwaaz Logo" className="w-10 h-10 object-cover" />
              </div>
              <div className="ml-1">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">JanAwaaz</h1>
                <p className="hidden sm:block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Digital Public Infrastructure Platform</p>
                <p className="sm:hidden text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">DPI Platform</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium google-transition ${
                  location.pathname === '/'
                    ? 'bg-blue-50 text-blue-700 google-shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Users size={18} />
                Citizen Portal
              </Link>
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium google-transition ${
                  location.pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-700 google-shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={18} />
                Policymaker Dashboard
              </Link>
              
              {user ? (
                <div className="flex items-center ml-6 pl-6 border-l border-slate-200 gap-4">
                  <span className="text-sm font-medium text-slate-700">
                    {profile?.name || user.email || user.phoneNumber}
                    <span className="ml-2 text-[10px] uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-bold">{profile?.role || 'user'}</span>
                  </span>
                  <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full p-2 google-transition-fast" title="Log out">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center ml-6 pl-6 border-l border-slate-200 gap-2">
                  <Link to="/login" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-full text-sm font-medium google-transition-fast google-shadow-sm">Log in</Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
           transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
            <div className="px-4 py-4 flex flex-col gap-2">
              <Link
                to="/"
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-medium google-transition ${
                  location.pathname === '/'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50 active:scale-[0.98]'
                }`}
              >
                <Users size={20} />
                Citizen Portal
              </Link>
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-medium google-transition ${
                  location.pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50 active:scale-[0.98]'
                }`}
              >
                <LayoutDashboard size={20} />
                Policymaker Dashboard
              </Link>
              
              <div className="my-2 border-t border-slate-100"></div>

              {user ? (
                <>
                  <div className="px-5 py-2 flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {profile?.name || user.email || user.phoneNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 tracking-wider font-bold uppercase mt-1">Role: {profile?.role || 'user'}</span>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left google-transition-fast"
                  >
                    <LogOut size={20} />
                    Log out
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="flex justify-center px-5 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700 active:scale-[0.98] google-transition-fast google-shadow-sm"
                >
                  Log in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}
