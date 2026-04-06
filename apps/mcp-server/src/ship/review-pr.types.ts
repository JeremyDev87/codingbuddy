export interface ReviewPrInput {
  prNumber: number;
  issueNumber?: number;
  timeout?: number;
}

export interface PrMeta {
  title: string;
  branch: string;
  changedFiles: string[];
  additions: number;
  deletions: number;
}

export interface ReviewPrResult {
  prMeta: PrMeta;
  diff: string;
  checklists: unknown[];
  recommendedSpecialists: string[];
  acceptanceCriteria: string | null;
  reviewProtocol: string;
  duration: number;
}
