import React from 'react';
import { Box, Text } from 'ink';
import { formatContextDecisions, formatContextNotes } from './context-section.pure';

export interface ContextSectionProps {
  decisions: string[];
  notes: string[];
  width?: number;
}

export function ContextSection({
  decisions,
  notes,
}: ContextSectionProps): React.ReactElement | null {
  const hasDecisions = decisions.length > 0;
  const hasNotes = notes.length > 0;

  if (!hasDecisions && !hasNotes) return null;

  return (
    <Box flexDirection="column">
      {hasDecisions && (
        <Box flexDirection="column">
          <Text dimColor bold>
            Decisions
          </Text>
          {formatContextDecisions(decisions)
            ?.split('\n')
            .map((line, i) => (
              <Text key={i} color="cyan">
                {line}
              </Text>
            ))}
        </Box>
      )}
      {hasNotes && (
        <Box flexDirection="column">
          <Text dimColor bold>
            Notes
          </Text>
          {formatContextNotes(notes)
            ?.split('\n')
            .map((line, i) => (
              <Text key={i} dimColor>
                {line}
              </Text>
            ))}
        </Box>
      )}
    </Box>
  );
}
