/**
 * Parallel Route Setup Example
 *
 * Demonstrates how to set up a complete Next.js App Router page
 * with multiple Parallel Route slots following the Widget-Slot Architecture.
 *
 * File structure this example represents:
 *
 * app/dashboard/
 * ├── layout.tsx              ← Root layout defining slot positions
 * ├── page.tsx                ← Main content (children)
 * ├── @sidebar/
 * │   ├── page.tsx            ← Sidebar slot (imports SidebarWidget)
 * │   ├── loading.tsx         ← Sidebar loading state
 * │   ├── error.tsx           ← Sidebar error boundary
 * │   └── default.tsx         ← Sidebar fallback
 * └── @activity/
 *     ├── page.tsx            ← Activity slot (imports ActivityWidget)
 *     ├── loading.tsx         ← Activity loading state
 *     ├── error.tsx           ← Activity error boundary
 *     └── default.tsx         ← Activity fallback
 */

// ═══════════════════════════════════════════════════════════
// 1. Dashboard Layout — defines slot positions (static shell)
// File: app/dashboard/layout.tsx
// ═══════════════════════════════════════════════════════════

import { type ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;    // Main content (app/dashboard/page.tsx)
  sidebar: ReactNode;     // Parallel route: @sidebar
  activity: ReactNode;    // Parallel route: @activity
}

export default function DashboardLayout({
  children,
  sidebar,
  activity,
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      {/* Static shell — no business logic, only structure */}
      <aside className="dashboard-layout__sidebar">
        {sidebar}
      </aside>
      <main className="dashboard-layout__content">
        {children}
      </main>
      <section className="dashboard-layout__activity">
        {activity}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. Slot Page — connects one Widget to one Slot
// File: app/dashboard/@sidebar/page.tsx
// ═══════════════════════════════════════════════════════════

// import NavigationWidget from '@/Widgets/Navigation';
//
// export default function SidebarSlotPage() {
//   return <NavigationWidget section="dashboard" />;
// }

// ═══════════════════════════════════════════════════════════
// 3. Slot Loading — independent loading state per slot
// File: app/dashboard/@sidebar/loading.tsx
// ═══════════════════════════════════════════════════════════

export function SidebarLoading() {
  return (
    <div className="slot-loading" aria-label="Loading sidebar">
      <div className="slot-loading__skeleton" style={{ height: '2rem', width: '60%' }} />
      <div className="slot-loading__skeleton" style={{ height: '1rem', width: '80%' }} />
      <div className="slot-loading__skeleton" style={{ height: '1rem', width: '70%' }} />
      <div className="slot-loading__skeleton" style={{ height: '1rem', width: '75%' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 4. Slot Error — fault isolation per slot
// File: app/dashboard/@sidebar/error.tsx
// ═══════════════════════════════════════════════════════════

// 'use client';  ← error.tsx must be a Client Component
//
// interface SlotErrorProps {
//   error: Error & { digest?: string };
//   reset: () => void;
// }
//
// export default function SidebarError({ error, reset }: SlotErrorProps) {
//   return (
//     <div className="slot-error" role="alert">
//       <p className="slot-error__message">
//         This section encountered an issue.
//       </p>
//       <button
//         className="slot-error__retry"
//         onClick={reset}
//         type="button"
//       >
//         Try again
//       </button>
//     </div>
//   );
// }

// ═══════════════════════════════════════════════════════════
// 5. Slot Default — fallback when no matching route
// File: app/dashboard/@sidebar/default.tsx
// ═══════════════════════════════════════════════════════════

export function SidebarDefault() {
  return (
    <div className="slot-default">
      <p>Select a section to view navigation.</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 6. CSS — Dashboard layout styles
// File: app/dashboard/dashboard.module.css
// ═══════════════════════════════════════════════════════════

/*
.dashboard-layout {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-template-rows: 1fr;
  min-height: 100dvh;
  gap: 0;
}

.dashboard-layout__sidebar {
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.dashboard-layout__content {
  padding: clamp(1rem, 3vw, 2rem);
  overflow-y: auto;
}

.dashboard-layout__activity {
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
}

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  .dashboard-layout__sidebar {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
  .dashboard-layout__activity {
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}

/* Slot loading skeleton */
.slot-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem;
}

.slot-loading__skeleton {
  background: linear-gradient(90deg, var(--color-surface-raised) 25%, var(--color-border) 50%, var(--color-surface-raised) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 0.25rem;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Slot error */
.slot-error {
  padding: 1.5rem;
  text-align: center;
}

.slot-error__retry {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: var(--color-surface);
  cursor: pointer;
}
*/
