
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

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}