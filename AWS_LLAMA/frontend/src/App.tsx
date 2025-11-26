
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Loader2, AlertOctagon, Phone, Activity, AlertTriangle, CheckCircle2, Check, Search, LogOut, RotateCcw } from 'lucide-react';
import { sendMessageToAWS } from './services/apiService';
import { Message } from './types';
import ChatMessage from './components/ChatMessage';
import TriageCard from './components/TriageCard';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';

// NOTE: Symptom Codes must match keys in the Python Lambda 'PROTOCOLS' dictionary
const SYMPTOM_GROUPS = {
  "Pain & Nerve": [
    { name: "Headache", code: "URG-109" },
    { name: "Leg/Calf Pain", code: "URG-111" }
    // Add others matching backend keys
  ]
};

const GLOBAL_EMERGENCY_CHECKS = [
  { id: 'URG-101', label: 'Trouble breathing' },
  { id: 'URG-102', label: 'Chest pain' },
  { id: 'URG-103', label: 'Uncontrolled bleeding' }
];

type ViewState = 'triage-wizard' | 'symptom-selection' | 'chat' | 'emergency-red';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('triage-wizard');
  const [selectedSymptoms, setSelectedSymptoms] = useState<{name: string, code: string}[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Generate a random Session ID on mount or reset
  const generateSession = () => {
     setSessionId(`sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  };

  useEffect(() => {
    generateSession();
  }, []);

  const handleStartConsultation = async () => {
    if (selectedSymptoms.length === 0) return;
    setView('chat');
    setIsLoading(true);
    
    // We only send the PRIMARY symptom code to start the specific module on backend
    const primarySymptom = selectedSymptoms[0];
    
    // Initial UI Message
    setMessages([{ 
        id: "init", 
        role: "model", 
        text: `Starting assessment for ${primarySymptom.name}...` 
    }]);

    // Call Backend with startModule
    const response = await sendMessageToAWS(sessionId, "START", primarySymptom.code);
    
    if (response.text) {
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: "model", 
            text: response.text || "", 
            options: response.options 
        }]);
    }
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Optimistic UI Update
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Call Backend (State is managed there)
    const response = await sendMessageToAWS(sessionId, text);
    
    const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text || (response.actionCard ? "Assessment Complete." : "Error"), 
        options: response.options, 
        actionCard: response.actionCard 
    };
    
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const toggleSymptom = (name: string, code: string) => {
      setSelectedSymptoms([{ name, code }]); // Single selection for strict mode simplicity
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <Header />
      
      {view === 'triage-wizard' && (
        <main className="flex-1 p-4">
           <div className="max-w-2xl mx-auto mt-10 bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-bold text-red-700 mb-4">Emergency Check</h2>
              {GLOBAL_EMERGENCY_CHECKS.map(item => (
                  <button key={item.id} onClick={() => setView('emergency-red')} className="w-full text-left p-4 mb-2 rounded-xl border hover:bg-red-50">{item.label}</button>
              ))}
              <button onClick={() => setView('symptom-selection')} className="w-full py-4 mt-4 bg-teal-600 text-white font-bold rounded-xl">No, I am safe</button>
           </div>
        </main>
      )}

      {view === 'symptom-selection' && (
        <main className="flex-1 p-4">
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm">
             <h2 className="text-xl font-bold mb-4">Select Symptom</h2>
             <div className="grid gap-2">
                 {SYMPTOM_GROUPS["Pain & Nerve"].map(s => (
                     <button key={s.code} onClick={() => toggleSymptom(s.name, s.code)} className={`p-4 border rounded-xl text-left ${selectedSymptoms[0]?.code === s.code ? 'bg-teal-600 text-white' : ''}`}>
                         {s.name}
                     </button>
                 ))}
             </div>
             <button onClick={handleStartConsultation} disabled={!selectedSymptoms.length} className="w-full mt-6 py-3 bg-teal-600 text-white font-bold rounded-xl disabled:bg-slate-300">Start</button>
          </div>
        </main>
      )}

      {view === 'emergency-red' && (
         <div className="fixed inset-0 bg-red-600 text-white flex flex-col items-center justify-center p-6 text-center z-50">
          <AlertOctagon size={80} className="mb-6" />
          <h1 className="text-4xl font-bold mb-4">CALL 911</h1>
          <button onClick={() => setView('triage-wizard')} className="mt-8 underline">Restart</button>
        </div>
      )}

      {view === 'chat' && (
        <main className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col">
            <div className="max-w-3xl mx-auto w-full flex-1 pb-20">
               {messages.map(msg => (
                   <div key={msg.id}>
                       <ChatMessage message={msg} onOptionSelect={handleSendMessage} />
                       {msg.actionCard && <TriageCard card={msg.actionCard} />}
                   </div>
               ))}
               {isLoading && <div className="text-sm text-slate-500 p-4"><Loader2 className="animate-spin inline mr-2"/> Thinking...</div>}
               <div ref={messagesEndRef} />
            </div>
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t">
                <div className="max-w-3xl mx-auto flex gap-2">
                    <input value={inputText} onChange={e => setInputText(e.target.value)} className="flex-1 border rounded-xl px-4" placeholder="Type answer..." />
                    <button onClick={() => handleSendMessage(inputText)} disabled={isLoading} className="p-3 bg-teal-600 text-white rounded-xl"><Send size={20}/></button>
                </div>
            </div>
        </main>
      )}
      <Footer />
    </div>
  );
};
export default App;
