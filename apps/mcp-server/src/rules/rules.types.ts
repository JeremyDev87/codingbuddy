export interface AgentProfile {
  name: string;
  role: string;
  expertise: string[];
  goals: string[];
  workflow: string[];
  output_format: string;
}

export interface SearchResult {
  file: string;
  matches: string[];
  score: number;
}
