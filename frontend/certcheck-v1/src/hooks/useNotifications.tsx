import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

interface NotificationContextType {
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  addNotification: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { expiringCards } = useAuth();

  useEffect(() => {
    // Update notification count based on expiring cards
    setNotificationCount(expiringCards?.length || 0);
  }, [expiringCards]);

  const addNotification = () => {
    setNotificationCount(prev => prev + 1);
  };

  const clearNotifications = () => {
    setNotificationCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notificationCount,
      setNotificationCount,
      addNotification,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};