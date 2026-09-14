import { ReactNode } from 'react';
import { LayoutDashboard, Users, Zap, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const handleLogout = async () => {
    await auth.signOut();
  };

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
                <p className="text-xs text-slate-500 font-medium">Digital Public Infrastructure Platform</p>
              </div>
            </div>
            
            <nav className="flex items-center space-x-2">
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
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
