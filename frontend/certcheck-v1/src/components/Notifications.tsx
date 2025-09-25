import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import AuthenticatedLayout from './AuthenticatedLayout';
import { format } from 'date-fns';

const Notifications = () => {
  const { expiringCards } = useAuth();
  const { clearNotifications } = useNotifications();

  React.useEffect(() => {
    // Clear notifications when user views the notifications page
    return () => {
      if (expiringCards.length > 0) {
        clearNotifications();
      }
    };
  }, [clearNotifications, expiringCards.length]);

  return (
    <AuthenticatedLayout showDashboard>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-gradient-card backdrop-blur-md border border-border/20 shadow-elegant">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Notifications</CardTitle>
                <p className="text-muted-foreground">Stay updated with your card status</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
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
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-destructive/10">
                            <CreditCard className="h-5 w-5 text-destructive" />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-foreground">{card.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Registration: {card.reg_no}
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="border-primary/20">
                                {card.card_type}
                              </Badge>
                              <Badge variant="outline" className="border-primary/20">
                                {card.scheme_name}
                              </Badge>
                            </div>
                            
                            {card.qualifications && (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Qualifications:</span> {card.qualifications}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-destructive">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Expires: {format(new Date(card.date_of_expiration), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <Badge variant="destructive" className="mt-2">
                            Expiring Soon
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <div className="bg-muted/20 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-foreground">Action Required</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Please renew your card{expiringCards.length > 1 ? 's' : ''} before the expiration date to avoid any service interruptions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Bell className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
                <p className="text-muted-foreground">
                  You have no notifications at the moment. We'll let you know when there's something important.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default Notifications;