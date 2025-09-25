import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, Shield, Users, UserCheck } from 'lucide-react';
import apiClient from '@/lib/api';
import Cookies from 'js-cookie';

interface AdminProfile {
  name: string;
  email: string;
  role: string;
  department: string;
  joinDate: string;
  lastLogin: string;
  totalEmployees: number;
  activeEmployees: number;
}

interface EmployeeCounts {
  inprocessCount: number;
  activeCount: number;
}

export const ProfileCard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [employeeCounts, setEmployeeCounts] = useState<EmployeeCounts>({ inprocessCount: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchEmployeeCounts();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = Cookies.get('certcheck_token');
      const response = await apiClient.get('/admin/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeCounts = async () => {
    try {
      const token = Cookies.get('certcheck_token');
      
      // Fetch counts from pending_data table for inprocess count
      const pendingResponse = await apiClient.get(`/aws/fetch_pending_users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch counts from accepted_data table for active count
      const acceptedResponse = await apiClient.get(`/aws/fetch_active_users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Pending Response:', JSON.stringify(pendingResponse.data));
      console.log('Accepted Response:', JSON.stringify(acceptedResponse.data));
      setEmployeeCounts({
        inprocessCount: pendingResponse.data.pending_users || 0,
        activeCount: acceptedResponse.data.active_users || 0,
      });
    } catch (error) {
      console.error('Error fetching employee counts:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-admin-accent text-white font-medium text-lg">
            {user.firstName[0]}{user.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg">{user.firstName} {user.lastName}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Badge className="mt-1 bg-admin-accent text-white">
            <Shield className="w-3 h-3 mr-1" />
            Administrator
          </Badge>
        </div>
      </div>

      {/* Profile Details */}
      <div className="space-y-3 border-t pt-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : profile ? (
          <>
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="w-4 h-4 mr-2" />
              <span>{user.email}</span>
            </div>
            
            {/* <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Joined {new Date(profile.joinDate).toLocaleDateString()}</span>
            </div> */}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="w-4 h-4 text-admin-accent" />
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {employeeCounts.inprocessCount}
                </div>
                <div className="text-xs text-muted-foreground">Inprocess</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <UserCheck className="w-4 h-4 text-admin-success" />
                </div>
                <div className="text-lg font-semibold text-admin-success">
                  {employeeCounts.activeCount}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>

            {/* <div className="text-xs text-muted-foreground pt-2 border-t">
              Last login: {new Date(profile.lastLogin).toLocaleString()}
            </div> */}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            Failed to load profile details
          </div>
        )}
      </div>
    </div>
  );
};