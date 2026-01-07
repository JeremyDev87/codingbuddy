import { Injectable, Inject } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { KeywordService } from '../../keyword/keyword.service';
import { KEYWORD_SERVICE } from '../../keyword/keyword.module';
import { ConfigService } from '../../config/config.service';
import { LanguageService } from '../../shared/language.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { ModelResolverService } from '../../model';
import { extractRequiredString } from '../../shared/validation.constants';

/**
 * Handler for mode parsing tool
 * - parse_mode: Parse PLAN/ACT/EVAL workflow mode from user prompt
 */
@Injectable()
export class ModeHandler extends AbstractHandler {
  constructor(
    @Inject(KEYWORD_SERVICE) private readonly keywordService: KeywordService,
    private readonly configService: ConfigService,
    private readonly languageService: LanguageService,
    private readonly modelResolverService: ModelResolverService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['parse_mode'];
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'parse_mode',
        description:
          'MANDATORY: When user message starts with PLAN, ACT, or EVAL keyword (or localized equivalents: Korean 계획/실행/평가, Japanese 計画/実行/評価, Chinese 计划/执行/评估, Spanish PLANIFICAR/ACTUAR/EVALUAR), you MUST call this tool FIRST before any other action. This tool parses the workflow mode and returns critical rules that MUST be followed. Failure to call this tool when these keywords are present is a protocol violation.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'User prompt that may start with PLAN/ACT/EVAL keyword',
            },
            recommended_agent: {
              type: 'string',
              description:
                'ACT agent recommended from previous PLAN mode. Pass the agentName from recommended_act_agent field of PLAN mode response. Only applies to ACT mode.',
            },
          },
          required: ['prompt'],
        },
      },
    ];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const prompt = extractRequiredString(args, 'prompt');
    if (prompt === null) {
      return createErrorResponse('Missing required parameter: prompt');
    }

    // Extract optional recommended_agent (extractRequiredString returns null if empty/whitespace)
    const recommendedAgent =
      extractRequiredString(args, 'recommended_agent') ?? undefined;

    try {
      const options = recommendedAgent
        ? { recommendedActAgent: recommendedAgent }
        : undefined;
      const result = await this.keywordService.parseMode(prompt, options);
      const language = await this.configService.getLanguage();
      const languageInstructionResult =
        this.languageService.getLanguageInstruction(language || 'en');
      const resolvedModel = await this.modelResolverService.resolveForMode(
        result.agent,
      );

      return createJsonResponse({
        ...result,
        language,
        languageInstruction: languageInstructionResult.instruction,
        resolvedModel,
      });
    } catch (error) {
      return createErrorResponse(
        `Failed to parse mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
