import { useState } from 'react';
import { Layout } from './components/Layout';
import { CitizenPortal } from './components/CitizenPortal';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'citizen' | 'dashboard'>('citizen');

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'citizen' ? <CitizenPortal /> : <Dashboard />}
    </Layout>
  );
}
