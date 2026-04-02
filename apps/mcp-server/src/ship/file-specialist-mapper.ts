import type { FileSpecialistMapping } from './quality-report.types';

const MAPPINGS: FileSpecialistMapping[] = [
  {
    pattern: /\.(ts|tsx)$/,
    specialist: 'code-quality-specialist',
    domain: 'code-quality',
  },
  {
    pattern: /(auth|security|crypto|password|token|jwt)/i,
    specialist: 'security-specialist',
    domain: 'security',
  },
  {
    pattern: /\.tsx$/,
    specialist: 'accessibility-specialist',
    domain: 'accessibility',
  },
  {
    pattern: /(package\.json|webpack|vite|bundle)/i,
    specialist: 'performance-specialist',
    domain: 'performance',
  },
];

interface MappedSpecialist {
  specialist: string;
  domain: string;
}

export class FileSpecialistMapper {
  mapFile(filePath: string): MappedSpecialist[] {
    const matched: MappedSpecialist[] = [];
    const seen = new Set<string>();

    for (const mapping of MAPPINGS) {
      if (mapping.pattern.test(filePath) && !seen.has(mapping.domain)) {
        seen.add(mapping.domain);
        matched.push({
          specialist: mapping.specialist,
          domain: mapping.domain,
        });
      }
    }

    return matched;
  }

  mapFiles(filePaths: string[]): MappedSpecialist[] {
    const seen = new Set<string>();
    const result: MappedSpecialist[] = [];

    for (const filePath of filePaths) {
      for (const mapped of this.mapFile(filePath)) {
        if (!seen.has(mapped.domain)) {
          seen.add(mapped.domain);
          result.push(mapped);
        }
      }
    }

    return result;
  }
}
