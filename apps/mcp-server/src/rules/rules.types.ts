export interface AgentProfile {
  name: string;
  description: string;
  role: {
    title: string;
    expertise: string[];
    tech_stack_reference?: string;
    responsibilities?: string[];
  };
  [key: string]: unknown; // Allow additional fields (passthrough)
}

export interface SearchResult {
  file: string;
  matches: string[];
  score: number;
}
