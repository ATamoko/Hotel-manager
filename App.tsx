import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { EmailProcessor } from './components/EmailProcessor';
import { DatabaseView } from './components/DatabaseView';
import { DashboardStats } from './components/DashboardStats';
import { EmailEntry } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [emailData, setEmailData] = useState<EmailEntry[]>([]);

  const handleSaveEmail = (entry: EmailEntry) => {
    setEmailData(prev => [...prev, entry]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats data={emailData} />;
      case 'inbox':
        return <EmailProcessor onSave={handleSaveEmail} />;
      case 'database':
        return <DatabaseView data={emailData} />;
      default:
        return <DashboardStats data={emailData} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Tableau de bord'}
              {activeTab === 'inbox' && 'Traitement Intelligent des Emails'}
              {activeTab === 'database' && 'Base de Données'}
            </h1>
            <p className="text-slate-500 mt-1">
              Bienvenue, Gestionnaire. Emma est prête à vous aider.
            </p>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-slate-900">Hotel Admin</p>
                <p className="text-xs text-slate-500">admin@hotel-prestige.com</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                <img src="https://picsum.photos/200/200" alt="Avatar" className="w-full h-full object-cover" />
             </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}

export default App;