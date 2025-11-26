
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Loader2, AlertOctagon, Phone, Activity, AlertTriangle, CheckCircle2, Check, Search, LogOut, RotateCcw } from 'lucide-react';
import { interpretUserResponse } from './services/geminiService';
import { Message } from './types';
import { CLINICAL_PROTOCOLS } from './constants';
import ChatMessage from './components/ChatMessage';
import TriageCard from './components/TriageCard';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';

// --- DATA CONSTANTS ---
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
  // --- STATE ---
  const [view, setView] = useState<ViewState>('triage-wizard');
  const [selectedSymptoms, setSelectedSymptoms] = useState<{name: string, code: string}[]>([]);
  const [symptomSearch, setSymptomSearch] = useState<string>(''); 
  
  // Chat UI State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState<boolean>(false);

  // OPTION 2: ENGINE STATE
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isConsultationComplete, setIsConsultationComplete] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- ENGINE LOGIC (THE "SYMBOLIC" PART) ---

  const loadModule = (moduleId: string) => {
    // Check if we have a defined protocol, otherwise use Generic
    const protocol = CLINICAL_PROTOCOLS[moduleId] || CLINICAL_PROTOCOLS["GENERIC"];
    setCurrentModuleId(moduleId);
    setCurrentQuestionIndex(0);
    setIsConsultationComplete(false);

    // Ask first question immediately
    const firstQ = protocol.questions[0];
    addBotMessage(firstQ.text, firstQ.options);
  };

  const addBotMessage = (text: string, options?: string[], actionCard?: any) => {
    const msg: Message = {
      id: Date.now().toString(),
      role: 'model',
      text,
      options,
      actionCard
    };
    setMessages(prev => [...prev, msg]);
  };

  const processAnswer = async (userText: string) => {
    if (!currentModuleId || isConsultationComplete) return;

    // 1. Get Current Question Data
    const protocol = CLINICAL_PROTOCOLS[currentModuleId] || CLINICAL_PROTOCOLS["GENERIC"];
    const question = protocol.questions[currentQuestionIndex];

    // 2. Call Gemini (Neuro) to Translate "Text" -> "Option"
    setIsLoading(true);
    const interpretedAnswer = await interpretUserResponse(userText, question.text, question.options);
    setIsLoading(false);

    // 3. Find Matching Rule (Symbolic Logic)
    const rule = question.logic.find(r => r.condition === interpretedAnswer);
    
    // Default fallback if no rule matches (shouldn't happen with strict options)
    if (!rule) {
       addBotMessage("I didn't quite catch that. Could you please select one of the options?", question.options);
       return;
    }

    // 4. Execute Rule Action
    if (rule.actionType === 'SHOW_CARD') {
      addBotMessage("Assessment Complete.", undefined, rule.cardData);
      setIsConsultationComplete(true);
    } else if (rule.actionType === 'NEXT_QUESTION') {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < protocol.questions.length) {
        setCurrentQuestionIndex(nextIndex);
        const nextQ = protocol.questions[nextIndex];
        addBotMessage(nextQ.text, nextQ.options);
      } else {
        // End of questions, no alerts triggered
        addBotMessage("Based on your answers, your symptoms appear stable. Please monitor carefully.", undefined, {
            title: "MONITOR SYMPTOMS",
            action: "Home Care / Monitor",
            timing: "As needed",
            script: "Keep an eye on symptoms.",
            level: "GREEN"
        });
        setIsConsultationComplete(true);
      }
    }
  };


  // --- HANDLERS ---

  const handleStartConsultation = () => {
    if (selectedSymptoms.length === 0) return;
    
    // Pick the most urgent symptom (simple heuristic: order in array or predefined priority)
    // For Option 2 Demo, we just pick the first one.
    const primarySymptom = selectedSymptoms[0];
    
    setView('chat');
    setMessages([{
      id: "init",
      role: "model",
      text: `I understand you are experiencing ${primarySymptom.name}. Let me ask you a few safety questions.`
    }]);

    // Start the Engine
    loadModule(primarySymptom.code);
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Process in Engine
    processAnswer(text);
  };

  const handleEndSession = () => {
    setShowEndSessionConfirm(false);
    setView('triage-wizard');
    setSelectedSymptoms([]);
    setMessages([]);
    setSymptomSearch('');
    setCurrentModuleId(null);
    setIsConsultationComplete(false);
  };

  // --- FILTER LOGIC ---
  const filteredGroups = useMemo(() => {
    if (!symptomSearch.trim()) return Object.entries(SYMPTOM_GROUPS);
    const query = symptomSearch.toLowerCase();
    return Object.entries(SYMPTOM_GROUPS).map(([category, symptoms]) => {
      const filteredSymptoms = symptoms.filter(s => s.name.toLowerCase().includes(query));
      return [category, filteredSymptoms] as [string, typeof symptoms];
    }).filter(([_, symptoms]) => symptoms.length > 0);
  }, [symptomSearch]);

  const toggleSymptom = (name: string, code: string) => {
    setSelectedSymptoms(prev => {
      const exists = prev.find(s => s.code === code);
      return exists ? prev.filter(s => s.code !== code) : [...prev, { name, code }];
    });
  };

  // --- RENDER HELPERS ---
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <Header />

      {/* --- PHASE 1: EMERGENCY WIZARD --- */}
      {view === 'triage-wizard' && (
        <main className="flex-1 overflow-y-auto pb-8 p-4">
           <div className="max-w-2xl mx-auto mt-10 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-red-50">
                 <div className="flex items-center gap-3 mb-2">
                   <AlertTriangle className="text-red-600" size={28} />
                   <h2 className="text-xl font-bold text-red-700">Life-Threatening Emergency Check</h2>
                 </div>
                 <p className="text-slate-700">Before we continue, are you experiencing any of these <span className="font-bold">IMMEDIATE</span> emergencies?</p>
              </div>
              
              <div className="p-6 space-y-3">
                {GLOBAL_EMERGENCY_CHECKS.map(item => (
                  <button key={item.id} onClick={() => setView('emergency-red')} className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all flex items-center gap-3 group">
                     <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-red-400 flex items-center justify-center">
                       <div className="w-3 h-3 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                     <span className="font-medium text-slate-700 group-hover:text-red-900">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                 <button onClick={() => setView('symptom-selection')} className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                   <CheckCircle2 size={20} />
                   NO - I do not have these symptoms
                 </button>
              </div>
           </div>
        </main>
      )}

      {/* --- PHASE 2: SYMPTOM SELECTION --- */}
      {view === 'symptom-selection' && (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Consultation Mode</h2>
              <p className="text-slate-500 mt-1">Please select the primary symptom you are experiencing.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input type="text" className="w-full pl-10 pr-3 py-3 border rounded-xl" placeholder="Search..." value={symptomSearch} onChange={(e) => setSymptomSearch(e.target.value)} />
              </div>
              {selectedSymptoms.length > 0 && <button onClick={() => setSelectedSymptoms([])} className="px-4 border rounded-xl hover:bg-red-50 text-slate-600"><RotateCcw size={18} /> Clear</button>}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {filteredGroups.map(([category, symptoms]) => (
                <div key={category} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-lg text-teal-800 mb-4 flex items-center gap-2"><Activity size={18} />{category}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {symptoms.map(sym => (
                      <button key={sym.code} onClick={() => toggleSymptom(sym.name, sym.code)} className={`p-3 text-sm font-medium rounded-xl border text-left ${selectedSymptoms.some(s => s.code === sym.code) ? 'bg-teal-600 text-white' : 'bg-slate-50 hover:bg-teal-50'}`}>
                        {sym.name} {selectedSymptoms.some(s => s.code === sym.code) && <Check size={16} className="inline ml-1"/>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
             <div className="max-w-2xl mx-auto">
                <button onClick={handleStartConsultation} disabled={selectedSymptoms.length === 0} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl disabled:bg-slate-300">
                  {selectedSymptoms.length === 0 ? 'Select a Symptom' : 'Start Assessment'}
                </button>
             </div>
          </div>
        </main>
      )}

      {/* --- RED ALERT SCREEN --- */}
      {view === 'emergency-red' && (
        <div className="flex flex-col h-screen bg-red-600 text-white items-center justify-center p-6 text-center z-50 fixed inset-0">
          <AlertOctagon size={80} className="mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4">STOP. CALL 911.</h1>
          <a href="tel:911" className="bg-white text-red-600 py-5 px-10 rounded-2xl font-bold text-2xl shadow-xl">DIAL 911 NOW</a>
          <button onClick={() => setView('triage-wizard')} className="mt-12 text-red-200 underline">Restart</button>
        </div>
      )}

      {/* --- PHASE 3: CHAT --- */}
      {view === 'chat' && (
        <>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide bg-slate-50">
            <div className="max-w-3xl mx-auto flex flex-col min-h-full pb-4">
               <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                  <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>Consultation Active</div>
                  <button onClick={() => setShowEndSessionConfirm(true)} className="text-teal-600 text-xs font-bold flex items-center gap-1"><LogOut size={14} /> END SESSION</button>
               </div>

               {messages.map((msg) => (
                  <div key={msg.id}>
                    <ChatMessage message={msg} onOptionSelect={(opt) => handleSendMessage(opt)} />
                    {msg.actionCard && <TriageCard card={msg.actionCard} />}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start mb-6 animate-pulse">
                    <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100">
                      <Loader2 className="animate-spin text-teal-600" size={18} />
                      <span className="text-sm text-slate-500">Processing answer...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
            </div>
          </main>

          <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-20">
            <div className="max-w-3xl mx-auto flex gap-2">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                  disabled={isLoading || isConsultationComplete}
                  placeholder={isConsultationComplete ? "Consultation ended." : "Type your answer..."}
                  className="flex-1 bg-slate-50 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <Button onClick={() => handleSendMessage(inputText)} disabled={!inputText.trim() || isLoading || isConsultationComplete} className="rounded-xl w-12 flex items-center justify-center p-0">
                  <Send size={18} />
                </Button>
            </div>
          </div>

          {showEndSessionConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">End Consultation?</h3>
                  <div className="flex gap-4 mt-6">
                    <button onClick={() => setShowEndSessionConfirm(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-xl font-medium">Cancel</button>
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
