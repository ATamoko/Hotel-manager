import React from 'react';
import { EmailEntry, EmailCategory } from '../types';
import { StatCard } from './StatCard';
import { Mail, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardStatsProps {
  data: EmailEntry[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data }) => {
  const totalEmails = data.length;
  const urgentEmails = data.filter(e => e.extracted_info.urgence).length;
  const confirmed = data.filter(e => e.status === 'Confirmé').length;
  const pending = data.filter(e => e.status.includes('attente')).length;

  // Prepare Pie Chart Data (Category Distribution)
  const categoryCount = data.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(categoryCount).map(key => ({
    name: key,
    value: categoryCount[key]
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Emails Traités" 
          value={totalEmails} 
          icon={Mail} 
          color="bg-indigo-500 text-indigo-500" 
        />
        <StatCard 
          title="Dossiers Urgents" 
          value={urgentEmails} 
          icon={AlertCircle} 
          color="bg-red-500 text-red-500" 
        />
        <StatCard 
          title="Confirmés" 
          value={confirmed} 
          icon={CheckCircle2} 
          color="bg-green-500 text-green-500" 
        />
        <StatCard 
          title="En Attente" 
          value={pending} 
          icon={Briefcase} 
          color="bg-yellow-500 text-yellow-500" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Répartition par Catégorie</h3>
          <div className="flex-1 w-full min-h-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400">
                 Pas assez de données
               </div>
            )}
          </div>
        </div>

        {/* Recent Activity Mock */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Activité Récente</h3>
          <div className="flex-1 overflow-auto space-y-4 pr-2">
            {data.slice().reverse().slice(0, 5).map((entry) => (
               <div key={entry.id} className="flex items-start p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                  <div className={`w-2 h-2 mt-2 rounded-full mr-3 ${entry.extracted_info.urgence ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{entry.expediteur}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{entry.summary}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(entry.date_reception).toLocaleTimeString()} - {entry.category}</p>
                  </div>
               </div>
            ))}
            {data.length === 0 && (
               <div className="h-full flex items-center justify-center text-slate-400">
                 Aucune activité récente
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};