import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Calendar, User, Hash, Award, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface VerifiedCard {
  name: string;
  reg_no: string;
  card_type: string;
  date_of_expiration: string;
  scheme_name: string;
  qualifications: string;
}

const VerifiedActiveCards: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cards, setCards] = useState<VerifiedCard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVerifiedCards = async () => {
    if (!token) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in to view verified CSCS cards.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/backend/verified-active-cards/', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(response);
      console.log('Fetched verified cards:', response.data.cards_data);
      const cardList = Array.isArray(response.data.cards_data) ? response.data.cards_data : [];
      console.log('Card list:', cardList);
      setCards(cardList);
    } catch (error: any) {
      console.error('Error fetching verified cards:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to load verified cards. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifiedCards();
  }, [token]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const isExpiringSoon = (dateString: string) => {
    try {
      const expirationDate = new Date(dateString);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      return expirationDate <= thirtyDaysFromNow && expirationDate >= today;
    } catch {
      return false;
    }
  };

  const isExpired = (dateString: string) => {
    try {
      const expirationDate = new Date(dateString);
      const today = new Date();
      return expirationDate < today;
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url('/src/assets/dashboard-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="space-y-4 mb-8">
            {/* Back Button */}
            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => navigate('/home')}
                className="bg-gradient-card border-border/20 backdrop-blur-sm hover:shadow-glow"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            
            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Verified Active CSCS Cards
              </h1>
            </div>
            
            {/* Refresh Button */}
            <div className="flex justify-center">
              <Button 
                onClick={fetchVerifiedCards}
                disabled={loading}
                className="bg-primary hover:shadow-glow text-primary-foreground w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Refresh Cards
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-foreground">Loading verified cards...</p>
              </div>
            </div>
          )}

          {/* No Cards State */}
          {!loading && cards.length === 0 && (
            <Card className="bg-gradient-card border-border/20 backdrop-blur-md shadow-elegant">
              <CardContent className="py-16 text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Active Verified Cards
                </h3>
                <p className="text-muted-foreground">
                  There are currently no active verified cards in the system.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cards Grid */}
          {!loading && cards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {cards.map((card, index) => (
                <Card 
                  key={index} 
                  className="bg-gradient-card border-border/20 backdrop-blur-md shadow-elegant hover:shadow-glow transition-all duration-300"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-foreground flex items-center">
                        <User className="w-5 h-5 mr-2 text-primary" />
                        {card.name}
                      </CardTitle>
                      <Badge 
                        variant={
                          isExpired(card.date_of_expiration) 
                            ? "destructive" 
                            : isExpiringSoon(card.date_of_expiration) 
                            ? "secondary" 
                            : "default"
                        }
                        className={
                          isExpired(card.date_of_expiration)
                            ? "bg-destructive text-destructive-foreground"
                            : isExpiringSoon(card.date_of_expiration)
                            ? "bg-warning text-warning-foreground"
                            : "bg-primary text-primary-foreground"
                        }
                      >
                        {isExpired(card.date_of_expiration) 
                          ? "Expired" 
                          : isExpiringSoon(card.date_of_expiration) 
                          ? "Expiring Soon" 
                          : "Active"
                        }
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Reg No:</span>
                        <span className="text-sm font-medium text-foreground">{card.reg_no}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Card Type:</span>
                        <span className="text-sm font-medium text-foreground">{card.card_type}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Expires:</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatDate(card.date_of_expiration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Scheme:</span>
                        <span className="text-sm font-medium text-foreground">{card.scheme_name}</span>
                      </div>
                    </div>
                    
                    {card.qualifications && (
                      <div className="pt-3 border-t border-border/20">
                        <p className="text-sm text-muted-foreground mb-2">Qualifications:</p>
                        <p className="text-sm text-foreground bg-muted/20 rounded-md p-2">
                          {card.qualifications}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifiedActiveCards;