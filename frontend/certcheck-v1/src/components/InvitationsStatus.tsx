import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from './AuthenticatedLayout';
import { apiClient } from '@/lib/api';

interface Invitation {
  ref_id: string;
  admin_email: string;
  position: string;
  created_at: string;
  status: string;
  title?: string;
}

const InvitationsStatus = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem('auth_token');

  const fetchInvitations = async () => {
    if (!token) {
      toast({
        title: 'Authentication Error',
        description: 'No authentication token found. Please log in again.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/backend/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Fetched invitations:', response.data);
      setInvitations(response.data);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      const errorMessage = 'Failed to fetch invitations.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // const handleViewDetails = async (invitationId: string) => {
  //   try {
  //     const response = await axios.get(`http://localhost:8006/invitations/${invitationId}`, {
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //       },
  //     });

  //     // Navigate to agreement with the fetched data
  //     navigate('/agreement', { state: { agreementData: response.data } });
  //   } catch (error: any) {
  //     console.error('Error fetching invitation details:', error);
  //     toast({
  //       title: 'Error',
  //       description: 'Failed to fetch invitation details.',
  //       variant: 'destructive',
  //     });
  //   }
  // };

  useEffect(() => {
    fetchInvitations();
  }, []);

  return (
    <AuthenticatedLayout>
      <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Status of Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span className="ml-2 text-white">Loading invitations...</span>
            </div>
          ) : error ? (
            <div className="text-center text-red-300 p-8">
              <p>{error}</p>
              <Button onClick={fetchInvitations} className="mt-4 bg-blue-600 hover:bg-blue-700">
                Try Again
              </Button>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center text-gray-300 p-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No invitations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left p-3 text-white font-semibold">Ref ID</th>
                    <th className="text-left p-3 text-white font-semibold">Title</th>
                    <th className="text-left p-3 text-white font-semibold">Status</th>
                    <th className="text-left p-3 text-white font-semibold">Date</th>
                    {/* <th className="text-left p-3 text-white font-semibold">Actions</th> */}
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-3 text-gray-300">{invitation.ref_id}</td>
                      <td className="p-3 text-white">{invitation.title || invitation.position}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invitation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          invitation.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {invitation.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      {/* <td className="p-3">
                        <Button
                          onClick={() => handleViewDetails(invitation.ref_id)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          View Details
                        </Button>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthenticatedLayout>
  );
};

export default InvitationsStatus;