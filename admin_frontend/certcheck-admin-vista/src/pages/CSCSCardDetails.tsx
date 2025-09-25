import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DownloadButton } from '@/components/DownloadButton';

interface CSCSCard {
  user_email: string;
  name: string;
  reg_no: string;
  card_type: string;
  date_of_expiration: string;
  scheme_name: string;
  qualifications: string;
}

const CSCSCardDetails = () => {
  const { token } = useAuth();
  const [cscsCards, setCSCSCards] = useState<CSCSCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCSCSCards = async () => {
    try {
      const response = await apiClient.get('/aws/fetch_all_cscs_card_details/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCSCSCards(response.data);
    } catch (error: any) {
      console.error('Error fetching CSCS cards:', error);
      if (error.response?.status === 404) {
        setCSCSCards([]);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch CSCS card details. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCSCSCards();
  }, []);

  const headers = [
    'User Email',
    'Name',
    'Registration Number',
    'Card Type',
    'Date of Expiration',
    'Scheme Name',
    'Qualifications'
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">All CSCS Card Details</h1>
        {cscsCards.length > 0 && (
          <DownloadButton
            data={cscsCards}
            filename="cscs_card_details"
            headers={headers}
            title="CSCS Card Details"
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All CSCS Cards ({cscsCards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cscsCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No CSCS cards found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Registration Number</TableHead>
                    <TableHead>Card Type</TableHead>
                    <TableHead>Date of Expiration</TableHead>
                    <TableHead>Scheme Name</TableHead>
                    <TableHead>Qualifications</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cscsCards.map((card, index) => (
                    <TableRow key={index}>
                      <TableCell>{card.user_email}</TableCell>
                      <TableCell>{card.name}</TableCell>
                      <TableCell>{card.reg_no}</TableCell>
                      <TableCell>{card.card_type}</TableCell>
                      <TableCell>{card.date_of_expiration}</TableCell>
                      <TableCell>{card.scheme_name}</TableCell>
                      <TableCell>{card.qualifications}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CSCSCardDetails;