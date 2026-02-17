'use client';

import { useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';

interface CodeBlockProps {
  /** 코드 문자열 */
  code: string;
  /** 프로그래밍 언어 */
  language: string;
  /** 복사 버튼 라벨 */
  copyLabel: string;
  /** 복사 완료 라벨 */
  copiedLabel: string;
  /** 복사 실패 라벨 */
  failedLabel?: string;
  className?: string;
}

export const CodeBlock = ({
  code,
  language,
  copyLabel,
  copiedLabel,
  failedLabel,
  className,
}: CodeBlockProps) => {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? themes.vsDark : themes.vsLight;
  const trimmedCode = useMemo(() => code.trim(), [code]);

  return (
    <div className={cn('relative rounded-lg border', className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Badge variant="secondary" className="text-xs font-mono">
          {language}
        </Badge>
        <CopyButton
          code={code}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          failedLabel={failedLabel}
        />
      </div>
      <Highlight theme={theme} code={trimmedCode} language={language}>
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(hlClassName, 'overflow-x-auto p-4 text-sm leading-relaxed font-mono')}
            style={style}
            aria-label={`${language} code`}
          >
            <code>
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line });
                return (
                  <div key={i} {...lineProps} className={cn(lineProps.className, 'table-row')}>
                    <span
                      className="text-muted-foreground table-cell select-none pr-4 text-right text-xs"
                      aria-hidden="true"
                      data-testid="line-number"
                    >
                      {i + 1}
                    </span>
                    <span className="table-cell">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
};
