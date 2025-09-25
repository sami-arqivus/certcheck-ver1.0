import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Calendar, Mail, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  profilePhoto?: string;
}

export function ProfileView() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, [token]);

  const fetchUserProfile = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/user/profile/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setProfile(response.data);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/reset-password/`, {
        token: token,
        new_password: newPassword
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        // toast({
        //   title: "Password Change Successful!",
        //   description: "Your password has been updated successfully.",
        // });
        
      // await axios.post('/auth/change-password/', {
      //   currentPassword,
      //   newPassword,
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //   },
      // });

      toast({
        title: 'Success',
        description: 'Password changed successfully.',
      });

      setChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to change password. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-foreground">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p>Failed to load profile information.</p>
        <Button onClick={fetchUserProfile} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Your Profile</h2>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      <Card className="bg-gradient-card border-border/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Profile Photo */}
            {profile.profilePhoto && (
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20">
                  <img 
                    src={profile.profilePhoto} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Personal Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center">
                  <User className="w-4 h-4 mr-2 text-primary" />
                  First Name
                </Label>
                <div className="p-3 bg-muted/50 rounded-md border">
                  <p className="text-foreground">{profile.firstName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center">
                  <User className="w-4 h-4 mr-2 text-primary" />
                  Last Name
                </Label>
                <div className="p-3 bg-muted/50 rounded-md border">
                  <p className="text-foreground">{profile.lastName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-primary" />
                  Email
                </Label>
                <div className="p-3 bg-muted/50 rounded-md border">
                  <p className="text-foreground">{profile.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  Date of Birth
                </Label>
                <div className="p-3 bg-muted/50 rounded-md border">
                  <p className="text-foreground">{formatDate(profile.dateOfBirth)}</p>
                </div>
              </div>
            </div>

            {/* Change Password Button */}
            <div className="pt-4 border-t border-border/20">
              <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <KeyRound className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setChangePasswordOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleChangePassword}
                        disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                        className="flex-1"
                      >
                        {passwordLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Change Password'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}