import React, { useState, useEffect} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Calendar, User, Hash, Award, Mail, Cake } from 'lucide-react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  profilePhoto?: string;
}

interface VerifiedCard {
  name: string;
  reg_no: string;
  card_type: string;
  date_of_expiration: string;
  scheme_name: string;
  qualifications: string;
}

const PublicProfileView: React.FC = () => {
  const { userid } = useParams<{ userid: string }>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [cards, setCards] = useState<VerifiedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    console.log(userid)
    if (!userid) {
      setError('Invalid user ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile
      const profileResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'https://localhost'}/api/public/profile/${userid}`);
      setUserProfile(profileResponse.data);
      console.log(profileResponse.data)
      // Fetch verified cards
      const cardsResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'https://localhost'}/api/public/verified-cards/${userid}`);
      console.log(cardsResponse)
      const cardList = Array.isArray(cardsResponse.data.cards_data) ? cardsResponse.data.cards_data : [];
      setCards(cardList);

    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setError('User not found or data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userid]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="bg-gradient-card border-border/20 backdrop-blur-md shadow-elegant max-w-md mx-4">
          <CardContent className="py-16 text-center">
            <User className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Profile Not Found
            </h3>
            <p className="text-muted-foreground">
              {error || 'The requested user profile could not be found.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Public Profile
            </h1>
            <p className="text-muted-foreground">Verified CSCS Card Information</p>
          </div>

          {/* User Profile Card */}
          <Card className="bg-gradient-card border-border/20 backdrop-blur-md shadow-elegant">
            <CardHeader className="text-center pb-6">
              <div className="flex flex-col items-center space-y-4">
                {userProfile.profilePhoto ? (
                  <img
                    src={userProfile.profilePhoto}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-2xl text-foreground">
                    {userProfile.firstName} {userProfile.lastName}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{userProfile.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Cake className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium text-foreground">{formatDate(userProfile.dateOfBirth)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verified Cards Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Verified CSCS Cards
              </h2>
              <p className="text-muted-foreground">Active and verified certifications</p>
            </div>

            {cards.length === 0 ? (
              <Card className="bg-gradient-card border-border/20 backdrop-blur-md shadow-elegant">
                <CardContent className="py-12 text-center">
                  <CreditCard className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Verified Cards
                  </h3>
                  <p className="text-muted-foreground">
                    This user has no verified CSCS cards on record.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  );
};

export default PublicProfileView;