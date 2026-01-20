import React, { useState, useEffect } from 'react';
import { getEmmaResponse } from '../services/geminiService';
import { fetchNewEmails } from '../services/mockEmailService';
import { ProcessedEmailResult, EmailEntry, IncomingEmail } from '../types';
import { 
  Loader2, Send, CheckCircle, AlertTriangle, User, Calendar, 
  Briefcase, DollarSign, RefreshCw, Mail, ArrowRight, Wand2, 
  CheckSquare, Square, X, Check, Phone, AtSign, Euro
} from 'lucide-react';

interface EmailProcessorProps {
  onSave: (entry: EmailEntry) => void;
}

// --- HIGHLIGHTER UTILITY ---

interface HighlightPattern {
  type: 'date' | 'email' | 'phone' | 'price' | 'name';
  regex: RegExp;
  className: string;
  icon: React.ElementType;
}

const EmailContentHighlighter: React.FC<{ content: string; senderName: string }> = ({ content, senderName }) => {
  // Prepare regex patterns
  // Note: These are heuristic patterns. In a real app, NLP or the API response would map these indices.
  const safeName = senderName.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Match first name at least
  
  const patterns: HighlightPattern[] = [
    { 
      type: 'email', 
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 
      className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
      icon: AtSign
    },
    { 
      type: 'phone', 
      regex: /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g, 
      className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
      icon: Phone
    },
    { 
      type: 'date', 
      regex: /\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\s?\d{1,2}\s(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s\d{4})?\b|\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b/gi, 
      className: 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
      icon: Calendar
    },
    { 
      type: 'price', 
      regex: /\d+(?:[.,]\d+)?\s?(?:€|eur|euros?)/gi, 
      className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
      icon: Euro
    },
    {
      type: 'name',
      regex: new RegExp(`\\b${safeName}\\b`, 'gi'),
      className: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
      icon: User
    }
  ];

  // Tokenize and highlight
  // Simple strategy: Split string by all regexes combined, then identify what matched.
  // Ideally we use a library, but here is a custom implementation for React.
  
  const segments: { text: string; pattern?: HighlightPattern }[] = [{ text: content }];

  patterns.forEach(pattern => {
    let i = 0;
    while (i < segments.length) {
      const segment = segments[i];
      if (segment.pattern) {
        i++;
        continue;
      }

      const matches = [...segment.text.matchAll(pattern.regex)];
      if (matches.length === 0) {
        i++;
        continue;
      }

      const newSegments: { text: string; pattern?: HighlightPattern }[] = [];
      let lastIndex = 0;

      matches.forEach(match => {
        if (match.index === undefined) return;
        
        // Text before match
        if (match.index > lastIndex) {
          newSegments.push({ text: segment.text.slice(lastIndex, match.index) });
        }
        
        // The match itself
        newSegments.push({ text: match[0], pattern: pattern });
        
        lastIndex = match.index + match[0].length;
      });

      // Remaining text
      if (lastIndex < segment.text.length) {
        newSegments.push({ text: segment.text.slice(lastIndex) });
      }

      segments.splice(i, 1, ...newSegments);
      i += newSegments.length;
    }
  });

  return (
    <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
      {segments.map((seg, idx) => {
        if (seg.pattern) {
          const Icon = seg.pattern.icon;
          return (
            <span 
              key={idx} 
              className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded cursor-pointer border transition-colors group relative ${seg.pattern.className}`}
              title={`Donnée détectée: ${seg.pattern.type}`}
              onClick={(e) => {
                e.stopPropagation();
                alert(`Info extraite: ${seg.text}`);
              }}
            >
              <Icon size={10} className="mr-1 opacity-50 group-hover:opacity-100" />
              <span className="font-medium">{seg.text}</span>
            </span>
          );
        }
        return <span key={idx}>{seg.text}</span>;
      })}
    </div>
  );
};

export const EmailProcessor: React.FC<EmailProcessorProps> = ({ onSave }) => {
  const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null); // For viewing
  const [checkedEmailIds, setCheckedEmailIds] = useState<Set<string>>(new Set()); // For bulk actions
  const [isFetching, setIsFetching] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Analysis state per email ID
  const [analysisResults, setAnalysisResults] = useState<Record<string, ProcessedEmailResult>>({});
  const [processingStatus, setProcessingStatus] = useState<Record<string, 'idle' | 'processing' | 'error' | 'done'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFetchEmails = async () => {
    setIsFetching(true);
    try {
      const newEmails = await fetchNewEmails();
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

  // Auto-analyze when an email is viewed
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
    setErrors(prev => ({ ...prev, [email.id]: '' }));

    try {
      const data = await getEmmaResponse(email.content, email.sender);
      setAnalysisResults(prev => ({ ...prev, [email.id]: data }));
      setProcessingStatus(prev => ({ ...prev, [email.id]: 'done' }));
      return data;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erreur inconnue";
      setErrors(prev => ({ ...prev, [email.id]: errMsg }));
      setProcessingStatus(prev => ({ ...prev, [email.id]: 'error' }));
      throw err;
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
        senderName: email.senderName,
        subject: email.subject,
        ...result
      };
      onSave(entry);
      
      // Cleanup
      setEmails(prev => prev.filter(e => e.id !== emailId));
      setCheckedEmailIds(prev => {
        const next = new Set(prev);
        next.delete(emailId);
        return next;
      });
      if (selectedEmailId === emailId) {
        setSelectedEmailId(null);
      }
    }
  };

  // --- Bulk Actions ---

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (checkedEmailIds.size === emails.length && emails.length > 0) {
      setCheckedEmailIds(new Set());
    } else {
      setCheckedEmailIds(new Set(emails.map(e => e.id)));
    }
  };

  const handleBulkSend = async () => {
    setIsBulkProcessing(true);
    const idsToProcess = Array.from(checkedEmailIds);
    
    for (const id of idsToProcess) {
      const email = emails.find(e => e.id === id);
      if (!email) continue;

      try {
        // If not analyzed yet, analyze it now
        let result = analysisResults[id];
        if (!result) {
           result = await processEmail(email);
        }
        
        // Save (Send)
        const entry: EmailEntry = {
          id: crypto.randomUUID(),
          date_reception: email.receivedAt,
          expediteur: email.sender,
          senderName: email.senderName,
          subject: email.subject,
          ...result
        };
        onSave(entry);

      } catch (error) {
        console.error(`Failed to process email ${id}`, error);
      }
    }

    // Remove processed emails from inbox
    setEmails(prev => prev.filter(e => !checkedEmailIds.has(e.id)));
    setCheckedEmailIds(new Set());
    if (selectedEmailId && checkedEmailIds.has(selectedEmailId)) {
      setSelectedEmailId(null);
    }
    setIsBulkProcessing(false);
  };

  const handleDraftChange = (emailId: string, newDraft: string) => {
    setAnalysisResults(prev => {
      const current = prev[emailId];
      if (!current) return prev;
      return { ...prev, [emailId]: { ...current, draft_response: newDraft } };
    });
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId);
  const currentResult = selectedEmailId ? analysisResults[selectedEmailId] : null;
  const currentStatus = selectedEmailId ? processingStatus[selectedEmailId] : 'idle';

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      
      {/* BULK ACTION BAR (Floating overlay on bottom of list if items selected) */}
      {checkedEmailIds.size > 0 && !isBulkProcessing && (
         <div className="absolute bottom-6 left-6 z-30 bg-indigo-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
            <span className="font-medium">{checkedEmailIds.size} sélectionné(s)</span>
            <div className="h-4 w-px bg-indigo-700"></div>
            <button 
              onClick={handleBulkSend}
              className="flex items-center font-bold hover:text-indigo-200 transition-colors"
            >
              <Send size={18} className="mr-2" />
              Valider et Envoyer ({checkedEmailIds.size})
            </button>
            <button 
              onClick={() => setCheckedEmailIds(new Set())}
              className="ml-2 p-1 hover:bg-indigo-800 rounded"
            >
              <X size={16} />
            </button>
         </div>
      )}

      {/* LEFT: Inbox List */}
      <div className={`${selectedEmailId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[400px] border-r border-slate-200 flex-col bg-slate-50 flex-shrink-0`}>
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <button 
               onClick={toggleSelectAll}
               className="text-slate-400 hover:text-indigo-600 transition-colors"
               title="Tout sélectionner"
            >
               {emails.length > 0 && checkedEmailIds.size === emails.length ? (
                 <CheckSquare size={20} className="text-indigo-600" />
               ) : (
                 <Square size={20} />
               )}
            </button>
            <h2 className="font-semibold text-slate-800 flex items-center">
              Boîte de réception
              <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{emails.length}</span>
            </h2>
          </div>
          <button 
            onClick={handleFetchEmails}
            disabled={isFetching}
            className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isFetching ? 'animate-spin text-indigo-500' : 'text-slate-500'}`}
            title="Synchroniser"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
              <Mail size={40} className="mb-4 opacity-20" />
              <p>Boîte de réception vide.</p>
              <button onClick={handleFetchEmails} className="mt-4 text-indigo-600 font-medium text-sm hover:underline">Connecter les comptes</button>
            </div>
          ) : (
            emails.map(email => {
              const isChecked = checkedEmailIds.has(email.id);
              const isSelected = selectedEmailId === email.id;
              return (
                <div 
                  key={email.id}
                  onClick={() => setSelectedEmailId(email.id)}
                  className={`relative p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-white group ${
                    isSelected ? 'bg-white border-l-4 border-l-indigo-500 shadow-sm z-10' : 'border-l-4 border-l-transparent'
                  } ${isChecked ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    <div 
                      className="mt-1"
                      onClick={(e) => toggleCheck(email.id, e)}
                    >
                      {isChecked ? (
                        <CheckSquare size={18} className="text-indigo-600" />
                      ) : (
                        <Square size={18} className="text-slate-300 hover:text-indigo-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {email.senderName}
                        </span>
                        <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                          {new Date(email.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-800 mb-1 truncate">{email.subject}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{email.content}</p>
                      <div className="mt-2 flex gap-2">
                        {email.platform === 'gmail' ? (
                          <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Gmail</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">Outlook</span>
                        )}
                        {processingStatus[email.id] === 'done' && (
                          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-600 rounded-full font-medium flex items-center">
                            <Wand2 size={8} className="mr-1" /> Prêt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Email Detail & Analysis */}
      <div className={`${!selectedEmailId ? 'hidden lg:flex' : 'flex'} flex-1 flex-col h-full bg-slate-50 relative w-full`}>
        {isBulkProcessing && (
           <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center flex-col">
              <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800">Envoi groupé en cours...</h3>
              <p className="text-slate-500">Emma valide et envoie les emails sélectionnés.</p>
           </div>
        )}

        {selectedEmail ? (
          <div className="flex flex-col h-full w-full">
            {/* Toolbar / Header */}
            <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
               <button 
                 onClick={() => setSelectedEmailId(null)}
                 className="lg:hidden text-slate-500 hover:text-slate-800 mr-4"
               >
                 <ArrowRight className="rotate-180" size={24} />
               </button>
               <div className="flex items-center overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 flex-shrink-0">
                    {selectedEmail.senderName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold text-slate-900 truncate">{selectedEmail.subject}</h1>
                    <p className="text-xs text-slate-500 truncate">{selectedEmail.sender}</p>
                  </div>
               </div>
               <div className="text-sm text-slate-400 whitespace-nowrap hidden sm:block">
                  {new Date(selectedEmail.receivedAt).toLocaleString()}
               </div>
            </div>

            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* 1. ORIGINAL EMAIL CONTENT (With Highlights) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="mb-4 flex items-center justify-between">
                     <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <Mail size={14} className="mr-2" /> Message Original
                     </div>
                     <div className="text-[10px] text-slate-400 flex gap-2">
                       <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-indigo-400 mr-1"></span>Dates</span>
                       <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>Contacts</span>
                       <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-1"></span>Prix</span>
                     </div>
                   </div>
                   
                   {/* HIGHLIGHTER COMPONENT */}
                   <EmailContentHighlighter 
                      content={selectedEmail.content} 
                      senderName={selectedEmail.senderName} 
                   />
                </div>

                {/* ARROW INDICATOR */}
                <div className="flex justify-center text-indigo-200">
                   <ArrowRight className="rotate-90" size={24} />
                </div>

                {/* 2. EMMA ANALYSIS & DRAFT */}
                <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden ring-1 ring-indigo-50">
                  {/* Status Header */}
                  <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
                    <span className="font-semibold text-indigo-900 flex items-center text-sm">
                      <Wand2 size={16} className="mr-2 text-indigo-600" />
                      Analyse & Brouillon d'Emma
                    </span>
                    {currentStatus === 'processing' && <span className="text-xs text-indigo-600 animate-pulse font-medium flex items-center"><Loader2 size={12} className="animate-spin mr-1"/> Rédaction...</span>}
                    {currentStatus === 'done' && <span className="text-xs text-green-600 font-bold flex items-center"><CheckCircle size={12} className="mr-1"/> Prêt à envoyer</span>}
                  </div>

                  {currentStatus === 'processing' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                       <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
                       <p className="text-slate-600 font-medium">Emma analyse le contenu...</p>
                       <p className="text-slate-400 text-sm mt-1">Extraction des données et rédaction de la réponse.</p>
                    </div>
                  )}

                  {currentStatus === 'error' && (
                    <div className="p-6">
                      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center">
                        <AlertTriangle className="mr-3" size={20} />
                        <div>
                          <p className="font-bold">Erreur d'analyse</p>
                          <p className="text-sm">{errors[selectedEmail.id]}</p>
                        </div>
                        <button onClick={() => processEmail(selectedEmail)} className="ml-auto px-4 py-2 bg-white rounded shadow-sm text-sm font-medium hover:bg-red-50">Réessayer</button>
                      </div>
                    </div>
                  )}

                  {currentResult && currentStatus === 'done' && (
                    <div>
                      {/* Key Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 border-b border-slate-200">
                        <div className="bg-white p-3">
                           <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Catégorie</span>
                           <span className="text-sm font-medium text-slate-800">{currentResult.category}</span>
                        </div>
                        <div className="bg-white p-3">
                           <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Urgence</span>
                           <span className={`text-sm font-bold ${currentResult.extracted_info.urgence ? 'text-red-600' : 'text-green-600'}`}>
                              {currentResult.extracted_info.urgence ? 'URGENT' : 'Normale'}
                           </span>
                        </div>
                        <div className="bg-white p-3">
                           <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Client</span>
                           <span className="text-sm font-medium text-slate-800 truncate">{currentResult.extracted_info.nom_client || "-"}</span>
                        </div>
                        <div className="bg-white p-3">
                           <span className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Dates</span>
                           <span className="text-sm font-medium text-slate-800 truncate">{currentResult.extracted_info.dates_sejour || "-"}</span>
                        </div>
                      </div>

                      {/* Draft Editor */}
                      <div className="p-0">
                         <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Éditeur de réponse</span>
                         </div>
                         <textarea 
                           className="w-full h-72 p-6 text-sm font-mono text-slate-800 resize-y focus:outline-none focus:bg-yellow-50/20 transition-colors leading-relaxed"
                           value={currentResult.draft_response}
                           onChange={(e) => handleDraftChange(selectedEmail.id, e.target.value)}
                         />
                      </div>

                      {/* Action Footer */}
                      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                         <div className="text-xs text-slate-500">
                           <span className="font-medium">Statut du dossier:</span> {currentResult.status}
                         </div>
                         <button 
                           onClick={() => handleSendResponse(selectedEmail.id)}
                           className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                         >
                           <Send size={18} className="mr-2" />
                           Valider le brouillon et Envoyer
                         </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Bottom Spacer */}
                <div className="h-12"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                <ArrowRight size={40} className="text-indigo-200" />
             </div>
             <h3 className="text-xl font-semibold text-slate-700 mb-2">Aucun email sélectionné</h3>
             <p className="text-slate-500 max-w-md text-center">
               Cliquez sur un email dans la liste pour voir les détails et le brouillon généré par Emma.
             </p>
             <p className="text-slate-400 text-sm mt-8">
               Astuce: Utilisez les cases à cocher pour traiter plusieurs emails à la fois.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}