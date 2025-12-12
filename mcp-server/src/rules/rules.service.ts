import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentProfile, SearchResult } from './rules.types';

@Injectable()
export class RulesService {
    private readonly logger = new Logger(RulesService.name);
    private readonly rulesDir: string;

    constructor() {
        // 경로 탐색 전략:
        // 1. 환경변수로 직접 지정된 경우 우선 사용
        // 2. NPM 패키지로 설치된 경우: node_modules/@wishket/codebuddy/.ai-rules
        // 3. 개발 환경: mcp-server/../.ai-rules
        //
        // 빌드 후 구조: dist/rules/rules.service.js
        // __dirname = dist/rules, 패키지 루트 = dist/rules/../.. = 패키지 루트

        if (process.env.CODEBUDDY_RULES_DIR) {
            this.rulesDir = process.env.CODEBUDDY_RULES_DIR;
            this.logger.log(`Rules directory set from env: ${this.rulesDir}`);
            return;
        }

        // 패키지 루트 (dist/rules -> 2단계 상위)
        const packageRoot = path.resolve(__dirname, '../..');

        // 1. 패키지 루트의 .ai-rules (NPM 설치 시)
        let candidate = path.join(packageRoot, '.ai-rules');

        if (!this.checkExists(candidate)) {
            // 2. 개발 환경 (mcp-server/../.ai-rules)
            candidate = path.resolve(packageRoot, '../.ai-rules');
        }

        this.rulesDir = candidate;
        this.logger.log(`Rules directory set to: ${this.rulesDir}`);
    }

    private checkExists(pathStr: string): boolean {
        try {
            // We need synchronous check here or use async init. Constructor is sync.
            // fs.promises doesn't have existsSync. Use require('fs').
            return require('fs').existsSync(pathStr);
        } catch (e) {
            return false;
        }
    }
    async getRuleContent(relativePath: string): Promise<string> {
        const fullPath = path.join(this.rulesDir, relativePath);
        try {
            return await fs.readFile(fullPath, 'utf-8');
        } catch (error) {
            this.logger.error(`Failed to read rule file: ${relativePath}`, error);
            throw new Error(`Failed to read rule file: ${relativePath}`);
        }
    }

    async listAgents(): Promise<string[]> {
        const agentsDir = path.join(this.rulesDir, 'agents');
        try {
            const files = await fs.readdir(agentsDir);
            return files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''));
        } catch (error) {
            this.logger.error('Failed to list agents', error);
            return [];
        }
    }

    async getAgent(name: string): Promise<AgentProfile> {
        const content = await this.getRuleContent(`agents/${name}.json`);
        return JSON.parse(content) as AgentProfile;
    }

    async searchRules(query: string): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const queryLower = query.toLowerCase();

        const agents = await this.listAgents();
        const filesToSearch = [
            'rules/core.md',
            'rules/project.md',
            'rules/augmented-coding.md',
            ...agents.map(a => `agents/${a}.json`)
        ];

        for (const file of filesToSearch) {
            try {
                const content = await this.getRuleContent(file);
                const lines = content.split('\n');
                const matches: string[] = [];
                let score = 0;

                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(queryLower)) {
                        matches.push(`Line ${index + 1}: ${line.trim()}`);
                        score++;
                    }
                });

                if (score > 0) {
                    results.push({ file, matches, score });
                }
            } catch (e) {
                // Ignore errors
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }
}
