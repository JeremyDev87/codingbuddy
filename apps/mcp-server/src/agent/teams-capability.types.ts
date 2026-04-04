/**
 * Teams coordination capability status.
 * Single source of truth for whether Teams strategy is available at runtime.
 */
export interface TeamsCapabilityStatus {
  /** Whether Teams coordination is enabled and available */
  readonly available: boolean;
  /** Human-readable reason for the current state */
  readonly reason: string;
  /** Source of the capability decision */
  readonly source: TeamsCapabilitySource;
}

/**
 * How the capability decision was determined.
 */
export type TeamsCapabilitySource =
  | 'config' // experimental.teamsCoordination in codingbuddy.config.json
  | 'environment' // CODINGBUDDY_TEAMS_ENABLED env var
  | 'default'; // no explicit signal, default to disabled
