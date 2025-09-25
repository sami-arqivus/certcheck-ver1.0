import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Mail, Calendar, Loader2, Lock } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  profilePhoto?: string;
}

export function SidebarProfileView() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchProfile = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get('/user/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProfile(response.data);
      console.log(response.data)
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (!token) return;

    try {
      setPasswordLoading(true);
      await axios.post('/api/reset-password/', {
        token: token,
        new_password: newPassword
      });
      
      toast({
        title: 'Success',
        description: 'Password updated successfully.',
      });
      
      setDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'Failed to update password.',
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="ml-2 text-sm text-foreground">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <User className="w-6 h-6 mx-auto mb-2" />
        <p className="text-xs">Profile not available</p>
        <Button 
          onClick={fetchProfile} 
          variant="outline" 
          size="sm" 
          className="mt-2 text-xs h-7"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pl-4">
      <Card className="bg-gradient-card border-border/20 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <User className="w-3 h-3 mr-2 text-primary" />
            Profile Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Profile Photo & Name */}
          <div className="flex items-center space-x-3">
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-sm truncate">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="text-xs text-muted-foreground">Member</p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="space-y-2">
            <div className="flex items-center text-xs">
              <Mail className="w-3 h-3 mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground truncate">{profile.email}</span>
            </div>
            <div className="flex items-center text-xs">
              <Calendar className="w-3 h-3 mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                {new Date(profile.dateOfBirth).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7"
                >
                  <Lock className="w-3 h-3 mr-1" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                      disabled={passwordLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePasswordChange}
                      className="flex-1"
                      disabled={passwordLoading}
                    >
                      {passwordLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Update
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}