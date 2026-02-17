import { Injectable } from '@nestjs/common';
import type { LanguageInfo, LanguageInstructionResult } from './language.types';

@Injectable()
export class LanguageService {
  private static readonly LANGUAGE_MAP: Record<string, LanguageInfo> = {
    ko: {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      instruction: 'Always respond in Korean (한국어).',
    },
    en: {
      code: 'en',
      name: 'English',
      instruction: 'Always respond in English.',
    },
    ja: {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      instruction: 'Always respond in Japanese (日本語).',
    },
    zh: {
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      instruction: 'Always respond in Chinese (中文).',
    },
    es: {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      instruction: 'Always respond in Spanish (Español).',
    },
    de: {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      instruction: 'Always respond in German (Deutsch).',
    },
    fr: {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      instruction: 'Always respond in French (Français).',
    },
    pt: {
      code: 'pt',
      name: 'Portuguese',
      nativeName: 'Português',
      instruction: 'Always respond in Portuguese (Português).',
    },
    ru: {
      code: 'ru',
      name: 'Russian',
      nativeName: 'Русский',
      instruction: 'Always respond in Russian (Русский).',
    },
    hi: {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      instruction: 'Always respond in Hindi (हिन्दी).',
    },
  };

  private static readonly DEFAULT_LANGUAGE_INFO: LanguageInfo = LanguageService.LANGUAGE_MAP.en;

  getLanguageInstruction(languageCode?: string): LanguageInstructionResult {
    const code = String(languageCode ?? '');
    const languageInfo = LanguageService.LANGUAGE_MAP[code];

    if (languageInfo) {
      return {
        language: code,
        instruction: languageInfo.instruction,
        fallback: false,
      };
    }

    return {
      language: code,
      instruction: LanguageService.DEFAULT_LANGUAGE_INFO.instruction,
      fallback: true,
    };
  }

  getSupportedLanguages(): LanguageInfo[] {
    return Object.values(LanguageService.LANGUAGE_MAP);
  }

  isLanguageSupported(languageCode?: string): boolean {
    if (!languageCode || languageCode.trim() === '') {
      return false;
    }
    return languageCode in LanguageService.LANGUAGE_MAP;
  }

  getLanguageInfo(languageCode: string): LanguageInfo | null {
    return LanguageService.LANGUAGE_MAP[languageCode] ?? null;
  }
}
