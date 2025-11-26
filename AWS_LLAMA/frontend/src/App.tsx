import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Loader2, AlertOctagon, Phone, Activity, AlertTriangle, CheckCircle2, Check, Search, LogOut, RotateCcw } from 'lucide-react';
import { sendMessageToAWS } from './services/apiService';
import { Message } from './types';
import ChatMessage from './components/ChatMessage';
import TriageCard from './components/TriageCard';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';

// CONSTANTS
const GLOBAL_EMERGENCY_CHECKS = [
  { id: 'URG-101', label: 'Trouble breathing or shortness of breath' },
  { id: 'URG-102', label: 'Chest pain' },
  { id: 'URG-103', label: 'Uncontrolled bleeding' }, 
  { id: 'URG-107', label: 'Fainting or Syncope' },
  { id: 'URG-108', label: 'Confusion or Altered Mental Status' }
];

const SYMPTOM_GROUPS = {
  "Digestive Health": [
    { name: "Nausea", code: "NAU-203" },
    { name: "Vomiting", code: "VOM-204" },
    { name: "Diarrhea", code: "DIA-205" },
    { name: "Constipation", code: "CON-210" },
    { name: "No Appetite", code: "APP-209" },
    { name: "Mouth Sores", code: "MSO-208" },
    { name: "Abdominal Pain", code: "URG-110" }
  ],
  "Pain & Nerve": [
    { name: "General Pain", code: "PAI-213" },
    { name: "Headache", code: "URG-109" },
    { name: "Leg/Calf Pain", code: "URG-111" },
    { name: "Neuropathy", code: "NEU-216" },
    { name: "Port Site Pain", code: "URG-114" }
  ],
  "Systemic & Infection": [
    { name: "Fever", code: "FEV-202" },
    { name: "Bleeding or Bruising", code: "URG-103" },
    { name: "Fatigue", code: "FAT-206" },
    { name: "Dehydration", code: "DEH-201" },
    { name: "Cough", code: "COU-215" },
    { name: "Urinary Problems", code: "URI-211" }
  ],
  "Skin & External": [
    { name: "Skin Rash", code: "SKI-212" },
    { name: "Swelling", code: "SWE-214" },
    { name: "Eye Complaints", code: "EYE-207" }
  ]
};

type ViewState = 'triage-wizard' | 'symptom-selection' | 'chat' | 'emergency-red';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('triage-wizard');
  const [selectedSymptoms, setSelectedSymptoms] = useState<{name: string, code: string}[]>([]);
  const [symptomSearch, setSymptomSearch] = useState<string>(''); 
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleStartConsultation = async () => {
    if (selectedSymptoms.length === 0) return;
    setView('chat');
    setIsLoading(true);
    
    const symptomNames = selectedSymptoms.map(s => s.name).join(', ');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: `I am experiencing: ${symptomNames}` };
    const newHistory = [userMsg];
    setMessages(newHistory);

    const contextPrompt = `SYSTEM COMMAND: User reports: [${symptomNames}]. START TRIAGE.`;
    const apiHistory = [{ ...userMsg, text: contextPrompt }];
      
    const response = await sendMessageToAWS(apiHistory);
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response.text, options: response.options, actionCard: response.actionCard };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInputText('');
    setIsLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const response = await sendMessageToAWS(updatedMessages);
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response.text, options: response.options, actionCard: response.actionCard };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const filteredGroups = useMemo(() => {
    if (!symptomSearch.trim()) return Object.entries(SYMPTOM_GROUPS);
    const query = symptomSearch.toLowerCase();
    return Object.entries(SYMPTOM_GROUPS).map(([category, symptoms]) => {
      const filtered = symptoms.filter(s => s.name.toLowerCase().includes(query));
      return [category, filtered] as [string, typeof symptoms];
    }).filter(([_, symptoms]) => symptoms.length > 0);
  }, [symptomSearch]);

  const toggleSymptom = (name: string, code: string) => {
      setSelectedSymptoms(prev => {
        const exists = prev.find(s => s.code === code);
        return exists ? prev.filter(s => s.code !== code) : [...prev, { name, code }];
      });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <Header />
      {view === 'triage-wizard' && (
        <main className="flex-1 overflow-y-auto pb-8 p-4">
           <div className="max-w-2xl mx-auto mt-10 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-red-50">
                 <h2 className="text-xl font-bold text-red-700 flex items-center gap-2"><AlertTriangle /> Emergency Check</h2>
              </div>
              <div className="p-6 space-y-3">
                {GLOBAL_EMERGENCY_CHECKS.map(item => (
                  <button key={item.id} onClick={() => setView('emergency-red')} className="w-full text-left p-4 rounded-xl border hover:bg-red-50 font-medium text-slate-700">{item.label}</button>
                ))}
              </div>
              <div className="p-6 border-t"><button onClick={() => setView('symptom-selection')} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"><CheckCircle2 /> NO - I do not have these</button></div>
           </div>
        </main>
      )}
      
      {view === 'symptom-selection' && (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
          <div className="max-w-4xl mx-auto">
             <div className="flex gap-4 mb-6"><input type="text" className="flex-1 p-3 border rounded-xl" placeholder="Search..." value={symptomSearch} onChange={e => setSymptomSearch(e.target.value)} /></div>
             <div className="grid md:grid-cols-2 gap-6">
               {filteredGroups.map(([cat, syms]) => (
                 <div key={cat} className="bg-white p-5 rounded-2xl shadow-sm"><h3 className="font-bold text-teal-800 mb-3">{cat}</h3><div className="grid grid-cols-2 gap-3">{syms.map(s => <button key={s.code} onClick={() => toggleSymptom(s.name, s.code)} className={`p-2 rounded-lg border text-sm text-left ${selectedSymptoms.some(sel => sel.code === s.code) ? 'bg-teal-600 text-white' : ''}`}>{s.name}</button>)}</div></div>
               ))}
             </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t"><button onClick={handleStartConsultation} disabled={!selectedSymptoms.length} className="w-full max-w-2xl mx-auto py-3 bg-teal-600 text-white font-bold rounded-xl disabled:bg-slate-300">Start Assessment</button></div>
        </main>
      )}

      {view === 'emergency-red' && (
         <div className="fixed inset-0 bg-red-600 text-white flex flex-col items-center justify-center p-6 text-center z-50">
          <AlertOctagon size={80} className="mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4">STOP. CALL 911.</h1>
          <a href="tel:911" className="bg-white text-red-600 py-4 px-8 rounded-xl font-bold text-2xl">DIAL 911</a>
          <button onClick={() => setView('triage-wizard')} className="mt-8 underline">Restart</button>
        </div>
      )}

      {view === 'chat' && (
        <main className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col">
            <div className="max-w-3xl mx-auto w-full flex-1">
               <div className="flex justify-end mb-4"><button onClick={() => setShowEndSessionConfirm(true)} className="text-xs text-teal-600 font-bold flex gap-1"><LogOut size={12}/> END</button></div>
               {messages.map(msg => <div key={msg.id}><ChatMessage message={msg} onOptionSelect={handleSendMessage} />{msg.actionCard && <TriageCard card={msg.actionCard} />}</div>)}
               {isLoading && <div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Assessing...</div>}
               <div ref={messagesEndRef} />
            </div>
            <div className="max-w-3xl mx-auto w-full sticky bottom-0 p-4 bg-white border-t rounded-t-xl flex gap-2">
                <input value={inputText} onChange={e => setInputText(e.target.value)} className="flex-1 border-none outline-none" placeholder="Type answer..." />
                <button onClick={() => handleSendMessage(inputText)} disabled={isLoading}><Send className="text-teal-600" /></button>
            </div>
            {showEndSessionConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl text-center">
                        <h3 className="font-bold mb-4">End Session?</h3>
                        <div className="flex gap-4"><button onClick={() => setShowEndSessionConfirm(false)} className="flex-1 p-2 bg-slate-100 rounded">Cancel</button><button onClick={() => { setView('triage-wizard'); setMessages([]); setInputText(''); setShowEndSessionConfirm(false); setSelectedSymptoms([]); }} className="flex-1 p-2 bg-red-600 text-white rounded">End</button></div>
                    </div>
                </div>
            )}
        </main>
      )}
      <Footer />
    </div>
  );
};
export default App;