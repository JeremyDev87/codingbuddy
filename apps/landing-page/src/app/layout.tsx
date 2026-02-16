import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Codingbuddy - Multi-AI Rules for Consistent Coding',
  description:
    'Consistent coding practices across AI assistants. One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro.',
  icons: {
    icon: '/favicon.svg',
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  return children;
};

export default RootLayout;
