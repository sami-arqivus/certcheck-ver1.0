import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Mail, MapPin, Calendar, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import Cookies from 'js-cookie';

interface UserDetails {
  ref_id: string;
  user_email: string;
  position: string;
  work_location: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  rejected_at?: string;
  status: string;
  name?: string;
  phone?: string;
  department?: string;
  profile_photo?: string;
  joined_date?: string;
}

const UserProfile = () => {
  const { refId } = useParams<{ refId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (refId) {
      fetchUserProfile(refId);
    }
  }, [refId]);

  const fetchUserProfile = async (refId: string) => {
    try {
      const token = Cookies.get('certcheck_token');
      console.log('Fetching user profile for refId:', refId, 'with token:', token);
      const response = await axios.get<UserDetails>(`/aws/fetch_user_profile/${refId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('User profile response:', response.data);
      setUserDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-bg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          <Card className="bg-gradient-card shadow-admin-md border-0">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-32 w-32 rounded-full mx-auto" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="min-h-screen bg-admin-bg p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={handleClose}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="bg-gradient-card shadow-admin-md border-0">
            <CardContent className="text-center py-12">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">User profile not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-admin-bg p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={handleClose}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="bg-gradient-card shadow-admin-md border-0">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-foreground">
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6">
              {/* Profile Photo */}
              <Avatar className="w-32 h-32">
                <AvatarImage 
                  src={userDetails.profile_photo} 
                  alt={userDetails.name || userDetails.user_email}
                />
                <AvatarFallback className="text-2xl">
                  {userDetails.name ? userDetails.name.split(' ').map(n => n[0]).join('').toUpperCase() : userDetails.user_email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Basic Info */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">{userDetails.name || 'N/A'}</h2>
                <Badge 
                  variant={userDetails.status === 'active' ? 'default' : userDetails.status === 'accepted' ? 'secondary' : 'destructive'}
                  className={
                    userDetails.status === 'active' 
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
                      : userDetails.status === 'accepted'
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : ''
                  }
                >
                  {userDetails.status}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{userDetails.user_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Position</p>
                      <p className="font-medium">{userDetails.position}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Work Location</p>
                      <p className="font-medium">{userDetails.work_location}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p className="font-medium">{new Date(userDetails.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Expires At</p>
                      <p className="font-medium">{new Date(userDetails.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Reference ID</p>
                      <p className="font-medium font-mono text-sm">{userDetails.ref_id}</p>
                    </div>
                  </div>

                  {userDetails.accepted_at || userDetails.rejected_at ? (
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {userDetails.accepted_at ? 'Accepted At' : 'Rejected At'}
                        </p>
                        <p className="font-medium">
                          {userDetails.accepted_at
                            ? new Date(userDetails.accepted_at).toLocaleDateString()
                            : new Date(userDetails.rejected_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Additional Info */}
              {(userDetails.phone || userDetails.department || userDetails.joined_date) && (
                <div className="w-full border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userDetails.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{userDetails.phone}</p>
                      </div>
                    )}
                    {userDetails.department && (
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{userDetails.department}</p>
                      </div>
                    )}
                    {userDetails.joined_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Joined Date</p>
                        <p className="font-medium">{new Date(userDetails.joined_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;