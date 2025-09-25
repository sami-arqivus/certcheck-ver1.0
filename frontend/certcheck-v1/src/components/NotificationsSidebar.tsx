import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Calendar, CreditCard, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { format, isAfter, addDays, parse, parseISO, startOfDay, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalizeDateFormat = (dateStr: string): string => {
  try {
    // Try parsing as ISO format first
    const isoParsed = parseISO(dateStr);
    if (isValid(isoParsed)) {
      return format(isoParsed, 'MMM dd, yyyy'); // Convert to "MMM dd, yyyy"
    }

    // Try parsing as "MMM dd, yyyy"
    const cleaned = dateStr.trim().replace(/\s+/g, ' ');
    const parsed = parse(cleaned, 'MMM dd, yyyy', new Date());
    if (isValid(parsed)) {
      return format(parsed, 'MMM dd, yyyy');
    }

    console.error(`Invalid date format: ${dateStr}`);
    return dateStr; // Fallback
  } catch (error) {
    console.error(`Error normalizing date ${dateStr}:`, error);
    return dateStr;
  }
};

const isExpired = (expirationDate: string): boolean => {
  try {
    const normalizedDate = normalizeDateFormat(expirationDate);
    const expDate = parse(normalizedDate, 'MMM dd, yyyy', new Date());
    if (!isValid(expDate)) {
      console.error(`Invalid date parsed: ${expirationDate} (normalized: ${normalizedDate})`);
      return false;
    }
    const today = startOfDay(new Date());
    const isExpired = isAfter(today, startOfDay(expDate));
    console.log(`isExpired(${expirationDate}):`, { expDate, today, isExpired });
    return isExpired;
  } catch (error) {
    console.error(`Error parsing date ${expirationDate}:`, error);
    return false;
  }
};

const isExpiringSoon = (expirationDate: string): boolean => {
  try {
    const normalizedDate = normalizeDateFormat(expirationDate);
    const expDate = parse(normalizedDate, 'MMM dd, yyyy', new Date());
    if (!isValid(expDate)) {
      console.error(`Invalid date parsed: ${expirationDate} (normalized: ${normalizedDate})`);
      return false;
    }
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 60); // Use 60 for a 60-day window if desired
    const isExpiring = isAfter(startOfDay(expDate), today) && !isAfter(startOfDay(expDate), thirtyDaysFromNow);
    console.log(`isExpiringSoon(${expirationDate}):`, {
      expDate,
      today,
      thirtyDaysFromNow,
      isAfterToday: isAfter(startOfDay(expDate), today),
      notAfterThirtyDays: !isAfter(startOfDay(expDate), thirtyDaysFromNow),
      isExpiring
    });
    return isExpiring;
  } catch (error) {
    console.error(`Error parsing date ${expirationDate}:`, error);
    return false;
  }
};

const getExpirationBadge = (expirationDate: string) => {
  if (isExpired(expirationDate)) {
    return {
      variant: "destructive" as const,
      text: "Expired",
      className: "text-xs w-fit"
    };
  } else if (isExpiringSoon(expirationDate)) {
    return {
      variant: "secondary" as const,
      text: "Going to Expire",
      className: "text-xs w-fit border-yellow-500 text-yellow-600 bg-yellow-50"
    };
  }
  return null;
};

const NotificationsSidebar: React.FC<NotificationsSidebarProps> = ({ isOpen, onClose }) => {
  const { expiringCards } = useAuth();
  const { clearNotifications } = useNotifications();

  React.useEffect(() => {
    if (isOpen) {
      console.log('Expiring Cards:', expiringCards);
      expiringCards.forEach((card, index) => {
        console.log(`Card ${index}:`, {
          name: card.name,
          date_of_expiration: card.date_of_expiration,
          badge: getExpirationBadge(card.date_of_expiration)
        });
      });
      if (expiringCards.length > 0) {
        clearNotifications();
      }
    }
  }, [isOpen, clearNotifications, expiringCards]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-gradient-card backdrop-blur-md border-l border-border/20 shadow-elegant transform transition-transform duration-300 ease-in-out">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Stay updated with your cards</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {expiringCards.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {expiringCards.length} card{expiringCards.length > 1 ? 's' : ''} expiring soon
                </span>
              </div>
              
              {expiringCards.map((card, index) => (
                <Card key={index} className="bg-gradient-card border border-destructive/20">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-destructive/10 flex-shrink-0">
                          <CreditCard className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground text-sm">{card.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">
                            Reg: {card.reg_no}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="border-primary/20 text-xs">
                          {card.card_type}
                        </Badge>
                        <Badge variant="outline" className="border-primary/20 text-xs">
                          {card.scheme_name}
                        </Badge>
                      </div>
                      
                      {card.qualifications && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Qualifications:</span> {card.qualifications}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 text-destructive">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          Expires: {format(parseISO(card.date_of_expiration), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      
                      {(() => {
                        const badge = getExpirationBadge(card.date_of_expiration);
                        return badge ? (
                          <Badge variant={badge.variant} className={badge.className}>
                            {badge.text}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="bg-muted/20 rounded-lg p-3 mt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Action Required</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please renew your card{expiringCards.length > 1 ? 's' : ''} before the expiration date.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
              <p className="text-sm text-muted-foreground">
                No notifications at the moment. We'll notify you of important updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsSidebar;