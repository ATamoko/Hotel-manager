import React, { useState, useEffect } from 'react';
import { getEmmaResponse } from '../services/geminiService';
import { fetchNewEmails } from '../services/mockEmailService';
import { ProcessedEmailResult, EmailEntry, IncomingEmail } from '../types';
import { Loader2, Send, CheckCircle, AlertTriangle, User, Calendar, Briefcase, DollarSign, RefreshCw, Mail, ArrowRight, Wand2 } from 'lucide-react';

interface EmailProcessorProps {
  onSave: (entry: EmailEntry) => void;
}

export const EmailProcessor: React.FC<EmailProcessorProps> = ({ onSave }) => {
  const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  
  // Analysis state per email ID
  const [analysisResults, setAnalysisResults] = useState<Record<string, ProcessedEmailResult>>({});
  const [processingStatus, setProcessingStatus] = useState<Record<string, 'idle' | 'processing' | 'error' | 'done'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFetchEmails = async () => {
    setIsFetching(true);
    try {
      const newEmails = await fetchNewEmails();
      // Avoid duplicates
      setEmails(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const uniqueNew = newEmails.filter(e => !existingIds.has(e.id));
        return [...uniqueNew, ...prev];
      });
    } catch (error) {
      console.error("Failed to fetch emails", error);
    } finally {
      setIsFetching(false);
    }
  };

  // Auto-analyze when an email is selected
  useEffect(() => {
    if (selectedEmailId) {
      const email = emails.find(e => e.id === selectedEmailId);
      const status = processingStatus[selectedEmailId];
      
      if (email && (!status || status === 'idle' || status === 'error')) {
        processEmail(email);
      }
    }
  }, [selectedEmailId]);

  const processEmail = async (email: IncomingEmail) => {
    setProcessingStatus(prev => ({ ...prev, [email.id]: 'processing' }));
    setErrors(prev => ({ ...prev, [email.id]: '' })); // Clear error

    try {
      const data = await getEmmaResponse(email.content, email.sender);
      setAnalysisResults(prev => ({ ...prev, [email.id]: data }));
      setProcessingStatus(prev => ({ ...prev, [email.id]: 'done' }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [email.id]: err instanceof Error ? err.message : "Erreur inconnue" }));
      setProcessingStatus(prev => ({ ...prev, [email.id]: 'error' }));
    }
  };

  const handleSendResponse = (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    const result = analysisResults[emailId];

    if (email && result) {
      const entry: EmailEntry = {
        id: crypto.randomUUID(),
        date_reception: email.receivedAt,
        expediteur: email.sender,
        subject: email.subject,
        ...result
      };
      onSave(entry);
      
      // Remove from inbox or mark as processed (Here we remove for simplicity)
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmailId === emailId) {
        setSelectedEmailId(null);
      }
    }
  };

  const handleDraftChange = (emailId: string, newDraft: string) => {
    setAnalysisResults(prev => {
      const current = prev[emailId];
      if (!current) return prev;
      return {
        ...prev,
        [emailId]: {
          ...current,
          draft_response: newDraft
        }
      };
    });
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId);
  const currentResult = selectedEmailId ? analysisResults[selectedEmailId] : null;
  const currentStatus = selectedEmailId ? processingStatus[selectedEmailId] : 'idle';

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* LEFT: Inbox List */}
      <div className="w-full lg:w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="font-semibold text-slate-800 flex items-center">
            <Mail className="mr-2 text-indigo-600" size={20} />
            Boîte de réception
          </h2>
          <button 
            onClick={handleFetchEmails}
            disabled={isFetching}
            className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isFetching ? 'animate-spin text-indigo-500' : 'text-slate-500'}`}
            title="Synchroniser (Gmail/Outlook)"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
              <Mail size={40} className="mb-4 opacity-20" />
              <p>Boîte de réception vide.</p>
              <button 
                onClick={handleFetchEmails} 
                className="mt-4 text-indigo-600 font-medium text-sm hover:underline"
              >
                Connecter les comptes
              </button>
            </div>
          ) : (
            emails.map(email => (
              <div 
                key={email.id}
                onClick={() => setSelectedEmailId(email.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-white ${
                  selectedEmailId === email.id ? 'bg-white border-l-4 border-l-indigo-500 shadow-sm z-10' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-semibold text-sm ${selectedEmailId === email.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {email.senderName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(email.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-slate-800 mb-1 truncate">{email.subject}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{email.content}</p>
                <div className="mt-2 flex gap-2">
                   {email.platform === 'gmail' && <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Gmail</span>}
                   {email.platform === 'outlook' && <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">Outlook</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Email Detail & Analysis */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            {/* Email Header */}
            <div className="p-6 border-b border-slate-100 flex-shrink-0">
              <div className="flex justify-between items-start">
                 <div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">{selectedEmail.subject}</h1>
                    <div className="flex items-center text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                        {selectedEmail.senderName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">{selectedEmail.senderName}</span>
                        <span className="text-slate-400 mx-2">&lt;{selectedEmail.sender}&gt;</span>
                      </div>
                    </div>
                 </div>
                 <div className="text-sm text-slate-400">
                    {new Date(selectedEmail.receivedAt).toLocaleString()}
                 </div>
              </div>
            </div>

            {/* Split Content: Original vs Emma */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Original Content */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100">
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-sans">
                  {selectedEmail.content}
                </div>
              </div>

              {/* Emma Analysis Panel */}
              <div className="flex-1 bg-slate-50 flex flex-col border-l border-slate-100 h-full overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm">
                  <span className="font-semibold text-indigo-900 flex items-center text-sm">
                    <Wand2 size={16} className="mr-2" />
                    Assistant Emma
                  </span>
                  {currentStatus === 'processing' && <span className="text-xs text-indigo-500 animate-pulse">Analyse en cours...</span>}
                  {currentStatus === 'done' && <span className="text-xs text-green-600 font-medium">Analyse terminée</span>}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentStatus === 'processing' && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                      <Loader2 size={32} className="animate-spin text-indigo-500" />
                      <p className="text-sm">Emma lit l'email et prépare une réponse...</p>
                    </div>
                  )}

                  {currentStatus === 'error' && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
                      <AlertTriangle className="mr-2 flex-shrink-0" size={16} />
                      {errors[selectedEmail.id]}
                      <button onClick={() => processEmail(selectedEmail)} className="ml-auto underline font-medium">Réessayer</button>
                    </div>
                  )}

                  {currentResult && currentStatus === 'done' && (
                    <>
                      {/* Classification Summary */}
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex gap-2 mb-3">
                           <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium border border-slate-200">
                             {currentResult.category} &gt; {currentResult.sub_category}
                           </span>
                           <span className={`px-2 py-1 text-xs rounded-md font-medium border ${currentResult.urgence ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                             {currentResult.urgence ? 'Urgent' : 'Priorité normale'}
                           </span>
                        </div>
                        <p className="text-xs text-slate-500 italic mb-3">
                          "{currentResult.summary}"
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center text-slate-600 bg-slate-50 p-2 rounded">
                            <User size={12} className="mr-2 opacity-50"/> {currentResult.extracted_info.nom_client || "N/A"}
                          </div>
                          <div className="flex items-center text-slate-600 bg-slate-50 p-2 rounded">
                            <Calendar size={12} className="mr-2 opacity-50"/> {currentResult.extracted_info.dates_sejour || "N/A"}
                          </div>
                          <div className="flex items-center text-slate-600 bg-slate-50 p-2 rounded">
                            <Briefcase size={12} className="mr-2 opacity-50"/> {currentResult.extracted_info.type_prestation || "N/A"}
                          </div>
                          <div className="flex items-center text-slate-600 bg-slate-50 p-2 rounded">
                            <DollarSign size={12} className="mr-2 opacity-50"/> {currentResult.extracted_info.budget_evoque || "N/A"}
                          </div>
                        </div>
                      </div>

                      {/* Draft Response */}
                      <div className="bg-white rounded-lg shadow-sm border border-indigo-100 overflow-hidden flex flex-col flex-1">
                        <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Brouillon suggéré</span>
                          <span className="text-[10px] text-slate-400 font-normal">Modifiable</span>
                        </div>
                        <textarea 
                          className="w-full h-64 p-4 text-sm font-mono text-slate-700 resize-none focus:outline-none focus:bg-indigo-50/10 transition-colors"
                          value={currentResult.draft_response}
                          onChange={(e) => handleDraftChange(selectedEmail.id, e.target.value)}
                          placeholder="Le brouillon apparaîtra ici..."
                        />
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                          <button 
                            onClick={() => handleSendResponse(selectedEmail.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all shadow-sm hover:shadow"
                          >
                            <Send size={16} className="mr-2" />
                            Valider et Envoyer
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <ArrowRight size={32} className="text-indigo-200" />
             </div>
             <p className="font-medium">Sélectionnez un email pour commencer</p>
             <p className="text-sm mt-2 max-w-md text-center">Emma analysera automatiquement le contenu et préparera une réponse.</p>
          </div>
        )}
      </div>
    </div>
  );
};