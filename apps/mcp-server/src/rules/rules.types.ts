type RuleSource = 'custom' | 'default';

interface AgentCommunication {
  language?: string;
  style?: string;
  approach?: string[];
  [key: string]: unknown; // Allow additional fields for extensibility
}

export interface AgentProfile {
  name: string;
  description: string;
  role: {
    title: string;
    expertise: string[];
    tech_stack_reference?: string;
    responsibilities?: string[];
  };
  communication?: AgentCommunication;
  source?: RuleSource;
  [key: string]: unknown; // Allow additional fields (passthrough)
}

export interface SearchResult {
  file: string;
  matches: string[];
  score: number;
  source?: RuleSource;
}
