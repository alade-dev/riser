import React from 'react';

interface LayoutProps {
  navbar: React.ReactNode;
  children: React.ReactNode;
  footerContent: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ navbar, children, footerContent }) => {
  return (
    <div className="h-full min-h-0 bg-[var(--color-bg-primary)] flex flex-col overflow-hidden">
      {/* Navbar */}
      {navbar}

      {/* Main content area */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>

      {/* Footer / Logs */}
      <footer className="shrink-0 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-subtle)] px-4 py-2.5 sm:py-3">
        {footerContent}
      </footer>
    </div>
  );
};
