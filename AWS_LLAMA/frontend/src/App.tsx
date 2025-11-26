import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Loader2, AlertOctagon, Phone, Activity, AlertTriangle, CheckCircle2, Check, Search, LogOut, RotateCcw } from 'lucide-react';
// IMPORT THE AWS SERVICE
import { sendMessageToAWS } from './services/apiService';
import { Message } from './types';
import ChatMessage from './components/ChatMessage';
import TriageCard from './components/TriageCard';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';

// --- DATA CONSTANTS ---
// Phase 1: Global Emergency Rules (Part 1 of MASTER v2.0 Protocol)
const GLOBAL_EMERGENCY_CHECKS = [
  { id: 'URG-101', label: 'Trouble breathing or shortness of breath' },
  { id: 'URG-102', label: 'Chest pain' },
  { id: 'URG-103', label: 'Uncontrolled bleeding' }, 
  { id: 'URG-107', label: 'Fainting or Syncope' },
  { id: 'URG-108', label: 'Confusion or Altered Mental Status' }
];

// Phase 2: Symptom Categories mapped to Rule IDs (MASTER v2.0)
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
  // --- STATE ---
  const [view, setView] = useState<ViewState>('triage-wizard');
  const [selectedSymptoms, setSelectedSymptoms] = useState<{name: string, code: string}[]>([]);
  const [symptomSearch, setSymptomSearch] = useState<string>(''); 
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // --- HANDLERS ---
  const handleWizardSelection = (hasEmergency: boolean) => {
    if (hasEmergency) {
      setView('emergency-red');
    } else {
      setView('symptom-selection');
    }
  };

  const toggleSymptom = (name: string, code: string) => {
    setSelectedSymptoms(prev => {
      const exists = prev.find(s => s.code === code);
      if (exists) {
        return prev.filter(s => s.code !== code);
      } else {
        return [...prev, { name, code }];
      }
    });
  };

  const clearSymptoms = () => {
    setSelectedSymptoms([]);
  };

  const handleStartConsultation = async () => {
    if (selectedSymptoms.length === 0) return;

    setView('chat');
    setIsLoading(true);
    
    const symptomNames = selectedSymptoms.map(s => s.name).join(', ');
    const symptomCodes = selectedSymptoms.map(s => s.code).join(', ');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: `I am experiencing: ${symptomNames}`
    };
    
    // Create new history
    const newHistory = [userMsg];
    setMessages(newHistory);

    // Context Prompt for Llama
    const contextPrompt = `SYSTEM COMMAND: Global Emergency Checks CLEARED.
User reports symptoms: [${symptomNames}]. 
Associated Protocol Codes: [${symptomCodes}]. 
INSTRUCTION: 
1. Acknowledge the symptoms.
2. Identify the ONE most clinically urgent module.
3. START DIRECTLY with PHASE A (Question 1).
4. Do NOT skip any Phase A screening questions.`;

    // Send to AWS
    const apiHistory: Message[] = [{
      ...userMsg,
      text: contextPrompt
    }];
      
    const response = await sendMessageToAWS(apiHistory);
      
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      options: response.options,
      actionCard: response.actionCard
    };
    setMessages((prev) => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const currentInput = text;
    setInputText('');
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Send full history to AWS
    const response = await sendMessageToAWS(updatedMessages);
    
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      options: response.options,
      actionCard: response.actionCard
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleEndSession = () => {
    setShowEndSessionConfirm(false);
    setView('triage-wizard');
    setSelectedSymptoms([]);
    setMessages([]);
    setSymptomSearch('');
  };

  // --- FILTER LOGIC ---
  const filteredGroups = useMemo(() => {
    if (!symptomSearch.trim()) return Object.entries(SYMPTOM_GROUPS);
    const query = symptomSearch.toLowerCase();
    return Object.entries(SYMPTOM_GROUPS).map(([category, symptoms]) => {
      const filteredSymptoms = symptoms.filter(s => 
        s.name.toLowerCase().includes(query)
      );
      return [category, filteredSymptoms] as [string, typeof symptoms];
    }).filter(([_, symptoms]) => symptoms.length > 0);
  }, [symptomSearch]);

  // --- RENDER ---
  // (Rendering logic identical to previous version, omitted for brevity but included in file)
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <Header />
      {view === 'triage-wizard' && (
        <main className="flex-1 overflow-y-auto pb-8">
           <div className="max-w-2xl mx-auto mt-10 px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-red-50">
                 <div className="flex items-center gap-3 mb-2">
                   <AlertTriangle className="text-red-600" size={28} />
                   <h2 className="text-xl font-bold text-red-700">Life-Threatening Emergency Check</h2>
                 </div>
                 <p className="text-slate-700">Before we continue, are you experiencing any of these <span className="font-bold">IMMEDIATE</span> emergencies?</p>
              </div>
              <div className="p-6 space-y-3">
                {GLOBAL_EMERGENCY_CHECKS.map(item => (
                  <button key={item.id} onClick={() => handleWizardSelection(true)} className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all flex items-center gap-3 group">
                     <span className="font-medium text-slate-700 group-hover:text-red-900">{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                 <button onClick={() => handleWizardSelection(false)} className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                   <CheckCircle2 size={20} /> NO - I do not have these symptoms
                 </button>
              </div>
            </div>
          </div>
        </main>
      )}
      
      {view === 'symptom-selection' && (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
          <div className="max-w-4xl mx-auto">
             <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Consultation Mode</h2>
              <p className="text-slate-500 mt-1">Global emergencies cleared. Select symptoms.</p>
            </div>
            {/* Search and Grid Logic... */}
             <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input type="text" className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl" placeholder="Search symptoms..." value={symptomSearch} onChange={(e) => setSymptomSearch(e.target.value)} />
              </div>
              {selectedSymptoms.length > 0 && <button onClick={clearSymptoms} className="px-4 py-2 bg-white border border-slate-200 rounded-xl">Clear</button>}
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {filteredGroups.map(([category, symptoms]) => (
                <div key={category} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-lg text-teal-800 mb-4 flex gap-2"><Activity size={18} />{category}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {symptoms.map(sym => (
                      <button key={sym.code} onClick={() => toggleSymptom(sym.name, sym.code)} className={`p-3 text-sm font-medium rounded-xl border text-left flex justify-between ${selectedSymptoms.some(s => s.code === sym.code) ? 'bg-teal-600 text-white' : 'bg-slate-50'}`}>
                        {sym.name} {selectedSymptoms.some(s => s.code === sym.code) && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md shadow-lg border-t border-slate-200">
             <div className="max-w-2xl mx-auto">
                <button onClick={handleStartConsultation} disabled={selectedSymptoms.length === 0} className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:bg-slate-300">
                  {selectedSymptoms.length === 0 ? 'Select Symptoms' : `Start Assessment (${selectedSymptoms.length})`}
                </button>
             </div>
          </div>
        </main>
      )}

      {view === 'emergency-red' && (
         <div className="flex flex-col h-screen bg-red-600 text-white items-center justify-center p-6 text-center z-50 fixed inset-0">
          <AlertOctagon size={80} className="mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4">STOP. CALL 911.</h1>
          <a href="tel:911" className="bg-white text-red-600 py-5 px-8 rounded-2xl font-bold text-2xl shadow-xl">DIAL 911 NOW</a>
          <button onClick={() => setView('triage-wizard')} className="mt-12 text-red-200 underline">I made a mistake - Restart</button>
        </div>
      )}

      {view === 'chat' && (
        <>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide bg-slate-50">
            <div className="max-w-3xl mx-auto flex flex-col min-h-full pb-4">
               <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                  <span className="text-xs font-bold text-slate-400">CONSULTATION ACTIVE</span>
                  <button onClick={() => setShowEndSessionConfirm(true)} className="text-teal-600 text-xs font-bold flex gap-1"><LogOut size={14} /> END SESSION</button>
               </div>
               {messages.map((msg) => (
                  <div key={msg.id}>
                    <ChatMessage message={msg} onOptionSelect={(opt) => handleSendMessage(opt)} />
                    {msg.actionCard && <TriageCard card={msg.actionCard} />}
                  </div>
                ))}
                {isLoading && <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm w-fit"><Loader2 className="animate-spin text-teal-600" size={18} /> Checking protocol...</div>}
                <div ref={messagesEndRef} />
            </div>
          </main>
          <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-20">
            <div className="max-w-3xl mx-auto flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-2 py-2">
                <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type your answer..." className="w-full bg-transparent border-none focus:ring-0 text-slate-700 resize-none py-2 px-2" rows={1} />
                <Button onClick={() => handleSendMessage(inputText)} disabled={!inputText.trim() || isLoading} className="h-10 w-10 !p-0 flex items-center justify-center"><Send size={18} /></Button>
            </div>
          </div>
          {showEndSessionConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
                <AlertTriangle size={24} className="text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">End Consultation?</h3>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setShowEndSessionConfirm(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                  <button onClick={handleEndSession} className="flex-1 py-3 text-white bg-red-600 rounded-xl font-bold">End Session</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <Footer />
    </div>
  );
};

export default App;
