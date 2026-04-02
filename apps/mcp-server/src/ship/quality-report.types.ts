export interface FileSpecialistMapping {
  pattern: RegExp;
  specialist: string;
  domain: string;
}

export interface QualityReportInput {
  changedFiles: string[];
  timeout?: number;
}

export interface DomainResult {
  domain: string;
  specialist: string;
  status: 'pass' | 'warning' | 'fail';
  findings: string[];
}

export interface QualityReportResult {
  domains: DomainResult[];
  markdown: string;
  duration: number;
}
