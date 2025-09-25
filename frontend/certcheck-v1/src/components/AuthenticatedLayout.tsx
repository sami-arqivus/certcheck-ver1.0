
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from './AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationProvider, useNotifications } from '@/hooks/useNotifications';
import NotificationsSidebar from './NotificationsSidebar';
import backgroundImage from '../assets/dashboard-bg.jpg';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  showDashboard?: boolean;
}

const AuthenticatedLayoutContent: React.FC<AuthenticatedLayoutProps> = ({ children, showDashboard = true }) => {
  const { user, logout } = useAuth();
  const { notificationCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <SidebarProvider>
      <div 
        className="min-h-screen w-full relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Background overlay */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
      
      {/* Content */}
      <div className="relative z-10 flex min-h-screen w-full">
        {/* Sidebar - only show when showDashboard is true */}
        {showDashboard && <AppSidebar />}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Safe Area Support */}
          <header className="bg-gradient-card backdrop-blur-md border-b border-border/30 shadow-elegant flex-shrink-0 safe-area-top">
            <div className="w-full px-3 sm:px-6 lg:px-8 safe-area-left safe-area-right">
              <div className="flex justify-between items-center py-2 sm:py-4">
                {/* Left Section */}
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  {/* Sidebar trigger - only show when showDashboard is true */}
                  {showDashboard && (
                    <SidebarTrigger className="text-foreground/80 hover:text-foreground flex-shrink-0">
                      <Menu className="h-5 w-5" />
                    </SidebarTrigger>
                  )}
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow flex-shrink-0">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
                      CertCheck
                    </h1>
                    {/* Mobile: Show welcome message below title */}
                    {user && (
                      <div className="sm:hidden">
                        <span className="text-xs text-foreground/60 truncate block">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Section */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Desktop: Show welcome message */}
                  {user && (
                    <span className="hidden sm:block text-sm text-foreground/80 text-right truncate max-w-[120px] lg:max-w-[200px] mr-2">
                      Welcome, {user.first_name}
                    </span>
                  )}
                  
                  {/* Notifications Button */}
                  <Button
                    onClick={() => setIsNotificationsOpen(true)}
                    variant="ghost"
                    size="sm"
                    className="text-foreground/80 hover:text-foreground hover:bg-accent/50 shadow-glow hover:shadow-glow h-8 w-8 sm:h-9 sm:w-9 p-0 relative flex-shrink-0"
                  >
                    <Bell className="h-4 w-4" />
                    {notificationCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0 min-w-[1rem]"
                      >
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </Badge>
                    )}
                  </Button>

                  {/* Logout Button */}
                  <Button
                    onClick={logout}
                    variant="ghost"
                    size="sm"
                    className="text-foreground/80 hover:text-foreground hover:bg-accent/50 shadow-glow hover:shadow-glow h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0"
                  >
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline text-sm">Logout</span>
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto safe-area-left safe-area-right safe-area-bottom">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Notifications Sidebar */}
      <NotificationsSidebar 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Backdrop */}
      {isNotificationsOpen && (
        <div 
          className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
          onClick={() => setIsNotificationsOpen(false)}
        />
      )}
    </div>
  </SidebarProvider>
  );
};

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children, showDashboard = true }) => {
  return (
    <NotificationProvider>
      <AuthenticatedLayoutContent children={children} showDashboard={showDashboard} />
    </NotificationProvider>
  );
};

export default AuthenticatedLayout;
