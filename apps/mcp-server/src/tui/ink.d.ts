/**
 * Type declarations for ESM-only packages used in TUI.
 *
 * ink v6+ and ink-testing-library use ESM package exports which are
 * not resolvable under "moduleResolution": "node" (CommonJS default).
 * These declarations re-export the actual types for TypeScript to resolve.
 */

declare module 'ink' {
  import type { ReactElement, ReactNode, Key } from 'react';

  export interface BoxProps {
    readonly flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    readonly flexGrow?: number;
    readonly flexShrink?: number;
    readonly flexBasis?: string | number;
    readonly flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
    readonly alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
    readonly alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch';
    readonly justifyContent?:
      | 'flex-start'
      | 'flex-end'
      | 'center'
      | 'space-between'
      | 'space-around'
      | 'space-evenly';
    readonly width?: number | string;
    readonly height?: number | string;
    readonly minWidth?: number | string;
    readonly minHeight?: number | string;
    readonly padding?: number;
    readonly paddingTop?: number;
    readonly paddingBottom?: number;
    readonly paddingLeft?: number;
    readonly paddingRight?: number;
    readonly paddingX?: number;
    readonly paddingY?: number;
    readonly margin?: number;
    readonly marginTop?: number;
    readonly marginBottom?: number;
    readonly marginLeft?: number;
    readonly marginRight?: number;
    readonly marginX?: number;
    readonly marginY?: number;
    readonly gap?: number;
    readonly columnGap?: number;
    readonly rowGap?: number;
    readonly borderStyle?:
      | 'single'
      | 'double'
      | 'round'
      | 'bold'
      | 'singleDouble'
      | 'doubleSingle'
      | 'classic'
      | 'arrow';
    readonly borderColor?: string;
    readonly borderTop?: boolean;
    readonly borderBottom?: boolean;
    readonly borderLeft?: boolean;
    readonly borderRight?: boolean;
    readonly display?: 'flex' | 'none';
    readonly overflow?: 'visible' | 'hidden';
    readonly overflowX?: 'visible' | 'hidden';
    readonly overflowY?: 'visible' | 'hidden';
    readonly key?: Key;
    readonly children?: ReactNode;
  }

  export interface TextProps {
    readonly bold?: boolean;
    readonly italic?: boolean;
    readonly underline?: boolean;
    readonly strikethrough?: boolean;
    readonly dimColor?: boolean;
    readonly color?: string;
    readonly backgroundColor?: string;
    readonly inverse?: boolean;
    readonly wrap?: 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end';
    readonly children?: ReactNode;
  }

  export interface StaticProps<T> {
    readonly items: readonly T[];
    readonly style?: BoxProps;
    readonly children: (item: T, index: number) => ReactNode;
  }

  export interface RenderOptions {
    readonly stdout?: NodeJS.WriteStream;
    readonly stdin?: NodeJS.ReadStream;
    readonly stderr?: NodeJS.WriteStream;
    readonly exitOnCtrlC?: boolean;
    readonly patchConsole?: boolean;
    readonly debug?: boolean;
  }

  export interface Instance {
    readonly waitUntilExit: () => Promise<void>;
    readonly unmount: () => void;
    readonly clear: () => void;
    readonly rerender: (tree: ReactElement) => void;
  }

  export function render(tree: ReactElement, options?: RenderOptions): Instance;
  export function Box(props: BoxProps): ReactElement;
  export function Text(props: TextProps): ReactElement;
  export function Static<T>(props: StaticProps<T>): ReactElement;
  export function Newline(): ReactElement;

  export function useInput(
    inputHandler: (input: string, key: KeyInput) => void,
    options?: { isActive?: boolean },
  ): void;

  export function useApp(): { exit: (error?: Error) => void };
  export function useStdin(): {
    stdin: NodeJS.ReadStream;
    isRawModeSupported: boolean;
    setRawMode: (mode: boolean) => void;
  };
  export function useStdout(): {
    stdout: NodeJS.WriteStream;
    write: (data: string) => void;
  };
  export function useStderr(): {
    stderr: NodeJS.WriteStream;
    write: (data: string) => void;
  };

  export interface KeyInput {
    readonly upArrow: boolean;
    readonly downArrow: boolean;
    readonly leftArrow: boolean;
    readonly rightArrow: boolean;
    readonly return: boolean;
    readonly escape: boolean;
    readonly ctrl: boolean;
    readonly shift: boolean;
    readonly tab: boolean;
    readonly backspace: boolean;
    readonly delete: boolean;
    readonly meta: boolean;
    readonly pageDown: boolean;
    readonly pageUp: boolean;
  }
}

declare module 'ink-testing-library' {
  import type { ReactElement } from 'react';

  export interface RenderResult {
    readonly lastFrame: () => string | null;
    readonly frames: readonly string[];
    readonly stdin: {
      write: (data: string) => void;
    };
    readonly unmount: () => void;
    readonly rerender: (tree: ReactElement) => void;
  }

  export function render(tree: ReactElement): RenderResult;
}

declare module 'ink-spinner' {
  import type { ReactElement } from 'react';

  export interface SpinnerProps {
    readonly type?: string;
  }

  export default function Spinner(props?: SpinnerProps): ReactElement;
}

declare module 'ink-gradient' {
  import type { ReactElement, ReactNode } from 'react';

  export interface GradientProps {
    readonly name?: string;
    readonly children?: ReactNode;
  }

  export default function Gradient(props: GradientProps): ReactElement;
}
