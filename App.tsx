import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Loader2, AlertOctagon, Phone, Activity, AlertTriangle, CheckCircle2, Check, Search, LogOut, RotateCcw } from 'lucide-react';
import { createChatSession, sendMessageToGemini } from './services/geminiService';
import { Message } from './types';
import ChatMessage from './components/ChatMessage';
import TriageCard from './components/TriageCard';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';
import { Chat } from "@google/genai";

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
  
  const [chatSession, setChatSession] = useState<Chat | null>(null);
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

    try {
      // Initialize Gemini Chat Session
      const session = createChatSession();
      setChatSession(session);
      setView('chat');
      setIsLoading(true);
      
      const symptomNames = selectedSymptoms.map(s => s.name).join(', ');
      const symptomCodes = selectedSymptoms.map(s => s.code).join(', ');

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: `I am experiencing: ${symptomNames}`
      };
      
      setMessages([userMsg]);

      // Context Prompt for Gemini (Hidden instructions)
      const contextPrompt = `SYSTEM COMMAND: Global Emergency Checks CLEARED.
User reports symptoms: [${symptomNames}]. 
Associated Protocol Codes: [${symptomCodes}]. 

INSTRUCTION: 
1. Acknowledge the symptoms.
2. Identify the ONE most clinically urgent module.
3. START DIRECTLY with PHASE A (Question 1).
4. Do NOT skip any Phase A screening questions.
5. DO NOT use the General Pain Router (PAI-213) if a specific pain code is present.`;
      
      const response = await sendMessageToGemini(session, contextPrompt);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        options: response.options,
        actionCard: response.actionCard
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Failed to start session:", error);
      // Handle error gracefully (maybe show a toast)
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !chatSession) return;

    const currentInput = text;
    setInputText('');
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput
    };
    
    setMessages((prev) => [...prev, userMsg]);

    const response = await sendMessageToGemini(chatSession, currentInput);
    
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
    setChatSession(null);
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

  // --- RENDER HELPERS ---

  const renderWizardStep = () => {
    return (
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
              <button
                key={item.id}
                onClick={() => handleWizardSelection(true)}
                className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all flex items-center gap-3 group"
              >
                 <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-red-400 flex items-center justify-center">
                   <div className="w-3 h-3 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 <span className="font-medium text-slate-700 group-hover:text-red-900">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100">
             <button
               onClick={() => handleWizardSelection(false)}
               className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
             >
               <CheckCircle2 size={20} />
               NO - I do not have these symptoms
             </button>
          </div>
        </div>
      </div>
    );
  };

  // --- MAIN RENDER ---

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <Header />

      {/* --- PHASE 1: EMERGENCY WIZARD --- */}
      {view === 'triage-wizard' && (
        <main className="flex-1 overflow-y-auto pb-8">
          {renderWizardStep()}
        </main>
      )}

      {/* --- PHASE 2: SYMPTOM SELECTION --- */}
      {view === 'symptom-selection' && (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Consultation Mode</h2>
              <p className="text-slate-500 mt-1">Global emergencies cleared. Please select ALL symptoms you are experiencing.</p>
            </div>

            {/* SEARCH BAR & TOOLS */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-slate-400" size={20} />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm shadow-sm transition-all"
                  placeholder="Search for a symptom..."
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                />
              </div>
              {selectedSymptoms.length > 0 && (
                <button 
                  onClick={clearSymptoms}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-2 justify-center shadow-sm"
                >
                  <RotateCcw size={18} />
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {filteredGroups.length > 0 ? (
                filteredGroups.map(([category, symptoms]) => (
                  <div key={category} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg text-teal-800 mb-4 flex items-center gap-2">
                      <Activity size={18} />
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {symptoms.map(sym => {
                        const isSelected = selectedSymptoms.some(s => s.code === sym.code);
                        return (
                          <button
                            key={sym.code + sym.name}
                            onClick={() => toggleSymptom(sym.name, sym.code)}
                            className={`p-3 text-sm font-medium rounded-xl border transition-all text-left flex items-start justify-between group ${
                              isSelected 
                                ? 'bg-teal-600 text-white border-teal-600 shadow-md transform scale-[1.02]' 
                                : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-teal-300 hover:bg-teal-50'
                            }`}
                          >
                            {sym.name}
                            {isSelected && <Check size={16} className="text-white ml-2 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 text-slate-400">
                   <p className="text-lg">No symptoms found matching "{symptomSearch}"</p>
                   <button 
                     onClick={() => setSymptomSearch('')}
                     className="mt-2 text-teal-600 font-medium hover:underline"
                   >
                     Clear search
                   </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Floating Action Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="max-w-2xl mx-auto">
                <button
                  onClick={handleStartConsultation}
                  disabled={selectedSymptoms.length === 0}
                  className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
                >
                  {selectedSymptoms.length === 0 ? 'Select Symptoms to Continue' : `Start Assessment (${selectedSymptoms.length})`}
                  {selectedSymptoms.length > 0 && <Send size={20} />}
                </button>
             </div>
          </div>
        </main>
      )}

      {/* --- RED ALERT SCREEN --- */}
      {view === 'emergency-red' && (
        <div className="flex flex-col h-screen bg-red-600 text-white items-center justify-center p-6 text-center z-50 fixed inset-0">
          <AlertOctagon size={80} className="mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4 tracking-tight">STOP. CALL 911.</h1>
          <p className="text-xl mb-8 max-w-lg font-medium leading-relaxed opacity-90">
            You selected a symptom that indicates a life-threatening emergency.
          </p>
          <a href="tel:911" className="flex items-center justify-center gap-3 w-full max-w-md bg-white text-red-600 py-5 rounded-2xl font-bold text-2xl shadow-xl hover:bg-red-50 transition-colors">
            <Phone size={28} />
            DIAL 911 NOW
          </a>
          <button onClick={() => setView('triage-wizard')} className="mt-12 text-red-200 underline text-sm">
            I made a mistake - Restart
          </button>
        </div>
      )}

      {/* --- PHASE 3: SMART CHAT --- */}
      {view === 'chat' && (
        <>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide bg-slate-50">
            <div className="max-w-3xl mx-auto flex flex-col min-h-full pb-4">
               <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Consultation Active
                  </div>
                  <button 
                    onClick={() => setShowEndSessionConfirm(true)}
                    className="text-teal-600 text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    <LogOut size={14} />
                    END SESSION
                  </button>
               </div>

               {messages.map((msg) => (
                  <div key={msg.id}>
                    <ChatMessage 
                      message={msg} 
                      onOptionSelect={(opt) => handleSendMessage(opt)}
                    />
                    {msg.actionCard && <TriageCard card={msg.actionCard} />}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start mb-6 animate-pulse">
                    <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                      <Loader2 className="animate-spin text-teal-600" size={18} />
                      <span className="text-sm text-slate-500 font-medium">Assessing protocol...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
            </div>
          </main>

          <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-20">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-2 py-2 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 focus-within:bg-white transition-all shadow-sm">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(inputText);
                    }
                  }}
                  placeholder="Type your answer..."
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 resize-none max-h-32 py-2 px-2 text-sm md:text-base scrollbar-hide"
                  rows={1}
                  style={{ minHeight: '44px' }}
                />
                <Button 
                  onClick={() => handleSendMessage(inputText)} 
                  disabled={!inputText.trim() || isLoading}
                  className="mb-0.5 rounded-xl h-10 w-10 !p-0 flex items-center justify-center shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </div>

          {/* END SESSION CONFIRMATION MODAL */}
          {showEndSessionConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">End Consultation?</h3>
                  <p className="text-slate-600 text-sm">
                    Are you sure you want to end the current session? All chat history and progress will be cleared.
                  </p>
                </div>
                <div className="flex border-t border-slate-100">
                  <button 
                    onClick={() => setShowEndSessionConfirm(false)}
                    className="flex-1 py-4 text-slate-600 font-medium hover:bg-slate-50 transition-colors focus:outline-none"
                  >
                    Cancel
                  </button>
                  <div className="w-px bg-slate-100"></div>
                  <button 
                    onClick={handleEndSession}
                    className="flex-1 py-4 text-red-600 font-bold hover:bg-red-50 transition-colors focus:outline-none"
                  >
                    End Session
                  </button>
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