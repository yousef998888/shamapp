import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 pt-6 pb-4 lg:px-6 lg:pt-8 lg:pb-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
