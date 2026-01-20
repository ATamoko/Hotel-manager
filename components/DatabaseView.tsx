import React from 'react';
import { EmailEntry } from '../types';
import { Download } from 'lucide-react';

interface DatabaseViewProps {
  data: EmailEntry[];
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
           <h2 className="text-lg font-semibold text-slate-800">Base de données Emails</h2>
           <p className="text-sm text-slate-500">Synchronisation Google Sheets simulée</p>
        </div>
        <button className="flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="mr-2" size={16} />
          Exporter CSV
        </button>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs sticky top-0">
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
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  Aucune donnée disponible. Traitez des emails pour remplir le tableau.
                </td>
              </tr>
            ) : (
              data.map((entry) => (
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'Confirmé' ? 'bg-green-100 text-green-800' : 
                      entry.status === 'Nouveau' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{entry.extracted_info.nom_client || "-"}</td>
                  <td className="px-6 py-4">{entry.extracted_info.dates_sejour || "-"}</td>
                  <td className="px-6 py-4">
                     {entry.extracted_info.urgence ? (
                        <span className="text-red-600 font-bold">Oui</span>
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
    </div>
  );
};