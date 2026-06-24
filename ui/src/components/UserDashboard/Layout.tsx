import { SidebarNav } from './SidebarNav';
import { EmptyState } from './EmptyState';

interface UserDashboardLayoutProps {
  children?: React.ReactNode;
}

export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar - Fixed overlay */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarNav type="horizontal" />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="flex flex-col lg:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 xl:gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-14 lg:z-30 lg:h-[calc(100vh-3.5rem)] lg:w-full lg:shrink-0 lg:overflow-y-auto lg:border-r">
          <div className="py-4 px-4 lg:py-6 lg:px-6">
            <SidebarNav type="vertical" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <div className="space-y-4 md:space-y-6 lg:space-y-8">
            {/* Content Container */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 md:p-6 lg:p-8">
              {children || <EmptyState />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}