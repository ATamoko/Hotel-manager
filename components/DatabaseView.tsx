import React, { useState } from 'react';
import { EmailEntry, DossierStatus } from '../types';
import { Download, History, Users, KanbanSquare, Search, Filter, Mail, Building, Calendar } from 'lucide-react';

interface DatabaseViewProps {
  data: EmailEntry[];
}

type Tab = 'history' | 'clients' | 'dossiers';

export const DatabaseView: React.FC<DatabaseViewProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter(entry => 
    entry.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.expediteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.extracted_info.nom_client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- VIEW 1: HISTORIQUE (Table) ---
  const renderHistory = () => (
    <div className="overflow-auto flex-1 bg-white">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-6 py-3 border-b border-slate-200">Reçu le</th>
            <th className="px-6 py-3 border-b border-slate-200">Expéditeur</th>
            <th className="px-6 py-3 border-b border-slate-200">Catégorie</th>
            <th className="px-6 py-3 border-b border-slate-200">Statut</th>
            <th className="px-6 py-3 border-b border-slate-200">Client</th>
            <th className="px-6 py-3 border-b border-slate-200">Dates</th>
            <th className="px-6 py-3 border-b border-slate-200">Urgence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                {data.length === 0 ? "Aucune donnée disponible." : "Aucun résultat trouvé pour votre recherche."}
              </td>
            </tr>
          ) : (
            filteredData.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(entry.date_reception).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{entry.expediteur}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    {entry.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={entry.status} />
                </td>
                <td className="px-6 py-4">{entry.extracted_info.nom_client || "-"}</td>
                <td className="px-6 py-4">{entry.extracted_info.dates_sejour || "-"}</td>
                <td className="px-6 py-4">
                    {entry.extracted_info.urgence ? (
                      <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">Oui</span>
                    ) : (
                      <span className="text-slate-400">Non</span>
                    )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // --- VIEW 2: FICHES CLIENTS (Cards) ---
  const renderClients = () => {
    // Group entries by email to identify unique clients
    const clientsMap = new Map();
    filteredData.forEach(entry => {
      // Use sender email as unique key
      const key = entry.expediteur;
      if (!clientsMap.has(key)) {
        clientsMap.set(key, {
          email: key,
          name: entry.extracted_info.nom_client || entry.senderName || key.split('@')[0],
          company: entry.extracted_info.societe || 'Particulier',
          interactions: 0,
          lastContact: entry.date_reception,
          category: entry.category,
          isCorporate: !!entry.extracted_info.societe
        });
      }
      const client = clientsMap.get(key);
      client.interactions += 1;
      // Update last contact if this email is more recent
      if (new Date(entry.date_reception) > new Date(client.lastContact)) {
        client.lastContact = entry.date_reception;
      }
    });

    const clients = Array.from(clientsMap.values());

    return (
      <div className="p-6 overflow-auto bg-slate-50 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clients.map((client, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${client.isCorporate ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                  {client.interactions} dossier{client.interactions > 1 ? 's' : ''}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 truncate mb-1" title={client.name}>{client.name}</h3>
              <p className="text-sm text-slate-500 mb-4 flex items-center h-5">
                {client.company !== 'Particulier' && <Building size={14} className="mr-1.5 flex-shrink-0"/>}
                <span className="truncate">{client.company}</span>
              </p>
              
              <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center text-sm text-slate-600 group cursor-pointer" title={client.email}>
                  <Mail size={14} className="mr-2 text-slate-400 group-hover:text-indigo-500 transition-colors"/>
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center text-xs text-slate-400">
                  <History size={14} className="mr-2"/>
                  Dernier contact: {new Date(client.lastContact).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
               <Users size={48} className="mb-4 opacity-20"/>
               <p className="font-medium">Aucun client trouvé.</p>
               <p className="text-sm">Traitez des emails pour constituer votre base client.</p>
             </div>
          )}
        </div>
      </div>
    );
  };

  // --- VIEW 3: SUIVI DOSSIERS (Kanban) ---
  const renderDossiers = () => {
    // Define the columns for the Kanban board
    const columns = [
      { id: DossierStatus.NOUVEAU, label: 'Nouveau', color: 'bg-blue-500', bg: 'bg-blue-50' },
      { id: DossierStatus.ATTENTE_CLIENT, label: 'Attente Client', color: 'bg-yellow-500', bg: 'bg-yellow-50' },
      { id: DossierStatus.ATTENTE_HOTEL, label: 'Attente Hôtel', color: 'bg-orange-500', bg: 'bg-orange-50' },
      { id: DossierStatus.OPTION, label: 'Option Posée', color: 'bg-purple-500', bg: 'bg-purple-50' },
      { id: DossierStatus.CONFIRME, label: 'Confirmé', color: 'bg-green-500', bg: 'bg-green-50' }
    ];

    return (
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-100 p-6">
        <div className="flex h-full gap-6 min-w-max">
          {columns.map(col => {
            // Filter items for this column
            const items = filteredData.filter(d => d.status === col.id);
            
            return (
              <div key={col.id} className="flex flex-col w-80 max-h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                   <div className="flex items-center gap-2">
                     <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                     <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col.label}</span>
                   </div>
                   <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded shadow-sm border border-slate-200">
                     {items.length}
                   </span>
                </div>
                
                {/* Column Content */}
                <div className={`flex-1 overflow-y-auto rounded-xl p-2 space-y-3 ${col.bg} border border-slate-200 shadow-inner`}>
                   {items.map(entry => (
                     <div key={entry.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative">
                        {/* Tags */}
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-sm ${entry.sub_category === 'Séminaires' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                             {entry.sub_category}
                          </span>
                          {entry.extracted_info.urgence && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                        </div>
                        
                        {/* Title */}
                        <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 leading-snug">
                          {entry.subject}
                        </h4>
                        
                        {/* Client Info */}
                        <p className="text-xs text-slate-500 mb-3 truncate font-medium">
                          {entry.extracted_info.nom_client || entry.expediteur}
                        </p>
                        
                        {/* Footer Info */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-1">
                           <div className="flex items-center text-xs text-slate-400">
                              <Calendar size={12} className="mr-1.5"/> 
                              <span className="truncate max-w-[120px]">
                                {entry.extracted_info.dates_sejour || "N/A"}
                              </span>
                           </div>
                           <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                             {(entry.extracted_info.nom_client || entry.senderName || "?").charAt(0)}
                           </div>
                        </div>
                     </div>
                   ))}
                   {items.length === 0 && (
                     <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg opacity-50">
                       <span className="text-xs text-slate-500 font-medium">Aucun dossier</span>
                     </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 pt-6 pb-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Base de Données</h2>
              <p className="text-sm text-slate-500">
                {activeTab === 'history' && 'Historique complet des communications'}
                {activeTab === 'clients' && 'Répertoire des clients et prospects'}
                {activeTab === 'dossiers' && 'Suivi visuel de l\'avancement des dossiers'}
              </p>
            </div>
            
            {/* Search & Export Actions */}
            <div className="flex space-x-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="w-full md:w-64 pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                <Download className="mr-2" size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex space-x-8">
            <TabButton 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')} 
              icon={History} 
              label="Historique Email" 
            />
            <TabButton 
              active={activeTab === 'clients'} 
              onClick={() => setActiveTab('clients')} 
              icon={Users} 
              label="Fiches Client" 
            />
            <TabButton 
              active={activeTab === 'dossiers'} 
              onClick={() => setActiveTab('dossiers')} 
              icon={KanbanSquare} 
              label="Suivi des Dossiers" 
            />
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
         {activeTab === 'history' && renderHistory()}
         {activeTab === 'clients' && renderClients()}
         {activeTab === 'dossiers' && renderDossiers()}
      </div>
    </div>
  );
};

// --- Helper Components ---

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`group flex items-center pb-4 px-1 border-b-2 transition-all duration-200 ${
      active 
        ? 'border-indigo-600 text-indigo-600 font-bold' 
        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium'
    }`}
  >
    <Icon size={18} className={`mr-2 transition-transform group-hover:scale-110 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
    {label}
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = 'bg-slate-100 text-slate-800 border-slate-200';
  if (status === DossierStatus.CONFIRME) colorClass = 'bg-green-100 text-green-800 border-green-200';
  else if (status === DossierStatus.NOUVEAU) colorClass = 'bg-blue-100 text-blue-800 border-blue-200';
  else if (status === DossierStatus.OPTION) colorClass = 'bg-purple-100 text-purple-800 border-purple-200';
  else if (status.includes('attente')) colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  else if (status === DossierStatus.CLOS) colorClass = 'bg-gray-100 text-gray-500 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status}
    </span>
  );
};