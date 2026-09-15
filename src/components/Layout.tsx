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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Zap size={24} className="fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">JanAwaaz</h1>
                <p className="hidden sm:block text-xs text-slate-500 font-medium">Digital Public Infrastructure Platform</p>
                <p className="sm:hidden text-xs text-slate-500 font-medium">DPI Platform</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              <Link
                to="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users size={18} />
                Citizen Portal
              </Link>
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={18} />
                Policymaker Dashboard
              </Link>
              
              {user ? (
                <div className="flex items-center ml-4 pl-4 border-l border-slate-200 gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {profile?.name || user.email || user.phoneNumber}
                    <span className="ml-2 text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">{profile?.role || 'user'}</span>
                  </span>
                  <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Log out">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center ml-4 pl-4 border-l border-slate-200 gap-2">
                  <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Log in</Link>
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
          >
            <div className="px-4 py-4 flex flex-col gap-2">
              <Link
                to="/"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users size={20} />
                Citizen Portal
              </Link>
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard size={20} />
                Policymaker Dashboard
              </Link>
              
              <div className="my-2 border-t border-slate-100"></div>

              {user ? (
                <>
                  <div className="px-4 py-2 flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {profile?.name || user.email || user.phoneNumber}
                    </span>
                    <span className="text-xs text-slate-500 uppercase mt-1">Role: {profile?.role || 'user'}</span>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                  >
                    <LogOut size={20} />
                    Log out
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="flex justify-center px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
