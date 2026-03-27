import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Codingbuddy Dashboard',
  description: 'Execution history, cost tracking, and agent activity dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
