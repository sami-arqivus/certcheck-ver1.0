import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Bell, Eye, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from './AuthenticatedLayout';
import { apiClient } from '@/lib/api';

interface Update {
  ref_id: string;
  admin_email: string;
  position: string;
  created_at: string;
  expires_at: string;
  status: string;
  title?: string;
  type?: string;
}

const Updates = () => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem('auth_token');

  const fetchUpdates = async () => {
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
      const response = await apiClient.get('/backend/updates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setUpdates(response.data);
    } catch (error: any) {
      console.error('Error fetching updates:', error);
      const errorMessage = 'Failed to fetch updates.';
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

  const handleViewDetails = async (updateId: string) => {
    try {
      console.log('Fetching details for update ID:', updateId);
      const response = await apiClient.get(`/backend/updates/${updateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Navigate to agreement with the fetched data
      navigate('/agreement', { state: { agreementData: response.data } });
    } catch (error: any) {
      console.error('Error fetching update details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch update details.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  return (
    <AuthenticatedLayout>
      {/* Back to Dashboard Button */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/home')}
          className="bg-gradient-card border-border/20 backdrop-blur-sm hover:shadow-glow"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl w-full max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span className="ml-2 text-white">Loading updates...</span>
            </div>
          ) : error ? (
            <div className="text-center text-red-300 p-8">
              <p>{error}</p>
              <Button onClick={fetchUpdates} className="mt-4 bg-blue-600 hover:bg-blue-700">
                Try Again
              </Button>
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center text-gray-300 p-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No updates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="hidden sm:block">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left p-3 text-white font-semibold">Ref ID</th>
                        <th className="text-left p-3 text-white font-semibold">Title</th>
                        <th className="text-left p-3 text-white font-semibold">Type</th>
                        <th className="text-left p-3 text-white font-semibold">Date</th>
                        <th className="text-left p-3 text-white font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updates.map((update, index) => (
                        <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-3 text-gray-300">{update.ref_id}</td>
                          <td className="p-3 text-white">{update.title || update.position}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">
                              {update.status || 'Unclear'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300">
                            {new Date(update.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <Button
                              onClick={() => handleViewDetails(update.ref_id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile view */}
                <div className="sm:hidden space-y-4">
                  {updates.map((update, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-semibold text-sm truncate">
                              {update.title || update.position}
                            </p>
                            <p className="text-gray-300 text-xs">ID: {update.ref_id}</p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">
                            {update.status || 'Unclear'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-gray-300 text-xs">
                            {new Date(update.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            onClick={() => handleViewDetails(update.ref_id)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthenticatedLayout>
  );
};

export default Updates;