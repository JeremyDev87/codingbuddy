import { Module } from '@nestjs/common';
import { RulesModule } from '../rules/rules.module';
import { RulesService } from '../rules/rules.service';
import { KeywordService } from './keyword.service';
import type { KeywordModesConfig } from './keyword.types';

export const KEYWORD_SERVICE = 'KEYWORD_SERVICE';

@Module({
  imports: [RulesModule],
  providers: [
    {
      provide: KEYWORD_SERVICE,
      useFactory: (rulesService: RulesService) => {
        const loadConfig = async (): Promise<KeywordModesConfig> => {
          const content =
            await rulesService.getRuleContent('keyword-modes.json');
          return JSON.parse(content) as KeywordModesConfig;
        };

        const loadRule = async (path: string): Promise<string> => {
          return rulesService.getRuleContent(path);
        };

        return new KeywordService(loadConfig, loadRule);
      },
      inject: [RulesService],
    },
  ],
  exports: [KEYWORD_SERVICE],
})
export class KeywordModule {}
