import { ReactNode } from 'react';
import { LayoutDashboard, Users, Zap } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'citizen' | 'dashboard';
  setActiveTab: (tab: 'citizen' | 'dashboard') => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
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
            
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('citizen')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'citizen'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users size={18} />
                Citizen Portal
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={18} />
                Policymaker Dashboard
              </button>
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
