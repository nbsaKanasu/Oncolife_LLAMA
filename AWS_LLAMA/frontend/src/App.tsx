
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, AlertOctagon, Phone, Activity, AlertTriangle, CheckCircle2, Check, Search, LogOut, RotateCcw } from 'lucide-react';
import { sendMessageToAWS } from './services/apiService';
import { Message } from './types';
import ChatMessage from './components/ChatMessage';
import TriageCard from './components/TriageCard';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';

// NOTE: Codes match keys in the Python Lambda 'PROTOCOLS' dictionary
const SYMPTOM_GROUPS = {
  "Digestive Health": [
    { name: "Nausea/Vomiting", code: "GENERIC" }, // Mapped to Generic for now in Lambda
    { name: "Diarrhea", code: "GENERIC" },
    { name: "Abdominal Pain", code: "GENERIC" }
  ],
  "Pain & Nerve": [
    { name: "Headache", code: "URG-109" },
    { name: "Leg/Calf Pain", code: "URG-111" },
    { name: "Port Site Pain", code: "URG-114" },
    { name: "General Pain", code: "GENERIC" }
  ],
  "Systemic": [
    { name: "Fever", code: "GENERIC" },
    { name: "Bleeding/Bruising", code: "URG-103" },
    { name: "Fatigue", code: "GENERIC" }
  ]
};

const GLOBAL_EMERGENCY_CHECKS = [
  { id: 'URG-101', label: 'Trouble breathing' },
  { id: 'URG-102', label: 'Chest pain' },
  { id: 'URG-103', label: 'Uncontrolled bleeding' },
  { id: 'URG-108', label: 'Confusion / Altered Mental Status' }
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
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState<boolean>(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- SESSION MANAGEMENT WITH PERSISTENCE ---
  useEffect(() => {
    const savedSession = localStorage.getItem('oncolife_aws_session');
    if (savedSession) {
      setSessionId(savedSession);
      // Optional: You could fetch history here if backend supported it
    } else {
      const newSession = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSession);
      localStorage.setItem('oncolife_aws_session', newSession);
    }
  }, []);

  const handleStartConsultation = async () => {
    if (selectedSymptoms.length === 0) return;
    setView('chat');
    setIsLoading(true);
    
    const primarySymptom = selectedSymptoms[0];
    
    setMessages([{ 
        id: "init", 
        role: "model", 
        text: `Starting assessment for ${primarySymptom.name}...` 
    }]);

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
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

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
      setSelectedSymptoms([{ name, code }]);
  };

  const handleEndSession = () => {
      // Clear session from local storage to truly reset
      localStorage.removeItem('oncolife_aws_session');
      const newSession = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSession);
      localStorage.setItem('oncolife_aws_session', newSession);
      
      setView('triage-wizard');
      setMessages([]);
      setSelectedSymptoms([]);
      setShowEndSessionConfirm(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <Header />
      
      {view === 'triage-wizard' && (
        <main className="flex-1 p-4">
           <div className="max-w-2xl mx-auto mt-10 bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-bold text-red-700 mb-4">Emergency Check</h2>
              <p className="mb-4 text-slate-600">Are you experiencing any of these life-threatening symptoms?</p>
              {GLOBAL_EMERGENCY_CHECKS.map(item => (
                  <button key={item.id} onClick={() => setView('emergency-red')} className="w-full text-left p-4 mb-2 rounded-xl border hover:bg-red-50 font-medium text-slate-700 flex items-center gap-2">
                     <AlertTriangle size={18} className="text-red-500" />
                     {item.label}
                  </button>
              ))}
              <button onClick={() => setView('symptom-selection')} className="w-full py-4 mt-6 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition-colors">No, I am safe</button>
           </div>
        </main>
      )}

      {view === 'symptom-selection' && (
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h2 className="text-xl font-bold mb-6 text-slate-800">Select Primary Symptom</h2>
             
             <div className="space-y-6">
                 {Object.entries(SYMPTOM_GROUPS).map(([category, symptoms]) => (
                    <div key={category}>
                        <h3 className="font-bold text-teal-800 mb-3 flex items-center gap-2">
                            <Activity size={18}/> {category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {symptoms.map(s => (
                                <button 
                                    key={s.name} 
                                    onClick={() => toggleSymptom(s.name, s.code)} 
                                    className={`p-4 border rounded-xl text-left font-medium transition-all ${selectedSymptoms[0]?.code === s.code ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-50 hover:bg-teal-50 text-slate-700'}`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                 ))}
             </div>

             <div className="sticky bottom-0 bg-white pt-4 mt-4 border-t">
                 <button onClick={handleStartConsultation} disabled={!selectedSymptoms.length} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg">Start Assessment</button>
             </div>
          </div>
        </main>
      )}

      {view === 'emergency-red' && (
         <div className="fixed inset-0 bg-red-600 text-white flex flex-col items-center justify-center p-6 text-center z-50">
          <AlertOctagon size={80} className="mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4">CALL 911</h1>
          <p className="text-xl max-w-md">You indicated a potential life-threatening emergency.</p>
          <a href="tel:911" className="mt-8 bg-white text-red-600 px-8 py-4 rounded-full font-bold text-2xl shadow-xl hover:scale-105 transition-transform">DIAL 911 NOW</a>
          <button onClick={() => setView('triage-wizard')} className="mt-8 underline text-red-200 hover:text-white">Restart Triage</button>
        </div>
      )}

      {view === 'chat' && (
        <main className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col">
            <div className="max-w-3xl mx-auto w-full flex-1 pb-24">
                <div className="flex justify-end mb-4">
                    <button onClick={() => setShowEndSessionConfirm(true)} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                        <LogOut size={12} /> END SESSION
                    </button>
                </div>

               {messages.map(msg => (
                   <div key={msg.id}>
                       <ChatMessage message={msg} onOptionSelect={handleSendMessage} />
                       {msg.actionCard && <TriageCard card={msg.actionCard} />}
                   </div>
               ))}
               {isLoading && (
                   <div className="flex items-center gap-2 text-slate-500 p-4 bg-white rounded-xl border border-slate-100 shadow-sm w-fit animate-pulse">
                       <Loader2 className="animate-spin text-teal-600" size={18}/> 
                       <span className="text-sm font-medium">Analyzing protocol...</span>
                   </div>
               )}
               <div ref={messagesEndRef} />
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg z-20">
                <div className="max-w-3xl mx-auto flex gap-3">
                    <input 
                        value={inputText} 
                        onChange={e => setInputText(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText)}
                        disabled={isLoading}
                        className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" 
                        placeholder="Type your answer..." 
                    />
                    <button 
                        onClick={() => handleSendMessage(inputText)} 
                        disabled={isLoading || !inputText.trim()} 
                        className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={24}/>
                    </button>
                </div>
            </div>
        </main>
      )}

        {showEndSessionConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">End Consultation?</h3>
                  <p className="text-sm text-slate-600 mb-6">This will clear your chat history. Are you sure?</p>
                  <div className="flex gap-4">
                    <button onClick={() => setShowEndSessionConfirm(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200">Cancel</button>
                    <button onClick={handleEndSession} className="flex-1 py-3 text-white bg-red-600 rounded-xl font-bold hover:bg-red-700">End Session</button>
                  </div>
              </div>
            </div>
          )}

      <Footer />
    </div>
  );
};
export default App;
