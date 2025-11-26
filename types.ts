
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isError?: boolean;
  options?: string[];
  actionCard?: ActionCard;
}

export interface ActionCard {
  title: string;
  action: string;
  timing: string;
  script: string;
  level: 'RED' | 'AMBER' | 'YELLOW' | 'GREEN';
}

// --- NEW TYPES FOR OPTION 2 (STRICT PROTOCOL) ---

export interface ProtocolLogic {
  condition: string; // e.g., "Yes", "Severe", ">= 3 days"
  actionType: 'NEXT_QUESTION' | 'JUMP_MODULE' | 'SHOW_CARD';
  targetId?: string; // ID of the next question or module
  cardData?: ActionCard; // If actionType is SHOW_CARD
}

export interface ProtocolQuestion {
  id: string;
  text: string;
  options: string[];
  logic: ProtocolLogic[]; // Rules to decide what happens next
}

export interface ProtocolModule {
  id: string;
  name: string;
  questions: ProtocolQuestion[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentModuleId: string | null;
  currentQuestionIndex: number;
}
