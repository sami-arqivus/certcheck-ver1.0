import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api';
import Cookies from 'js-cookie';
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

const ExpiredCards = () => {
  const { toast } = useToast();
  const [cards, setCards] = useState<CSCSCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiredCards();
  }, []);

  const fetchExpiredCards = async () => {
    try {
      const token = Cookies.get('certcheck_token');
      const response = await apiClient.get('/aws/fetch_expired_card_details/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setCards(response.data);
    } catch (error) {
      console.error('Failed to fetch expired cards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expired cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotify = async (card: CSCSCard) => {
    try {
      const token = Cookies.get('certcheck_token');
      await apiClient.post('/aws/send-notification-email/', card, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      toast({
        title: "Success",
        description: `Notification sent to ${card.user_email}`,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card shadow-admin-md border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold text-foreground">
          Expired Cards
        </CardTitle>
        {cards.length > 0 && (
          <DownloadButton
            data={cards.map(card => ({
              user_email: card.user_email,
              name: card.name,
              reg_no: card.reg_no,
              card_type: card.card_type,
              date_of_expiration: new Date(card.date_of_expiration).toLocaleDateString(),
              scheme_name: card.scheme_name,
              qualifications: card.qualifications,
            }))}
            filename="expired_cards"
            headers={['User Email', 'Name', 'Reg No', 'Card Type', 'Date of Expiration', 'Scheme Name', 'Qualifications']}
            title="Expired Cards"
          />
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : cards.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Reg No</TableHead>
                <TableHead>Card Type</TableHead>
                <TableHead>Date of Expiration</TableHead>
                <TableHead>Scheme Name</TableHead>
                <TableHead>Qualifications</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{card.user_email}</TableCell>
                  <TableCell>{card.name}</TableCell>
                  <TableCell className="font-mono text-sm">{card.reg_no}</TableCell>
                  <TableCell>{card.card_type}</TableCell>
                  <TableCell>{new Date(card.date_of_expiration).toLocaleDateString()}</TableCell>
                  <TableCell>{card.scheme_name}</TableCell>
                  <TableCell>{card.qualifications}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleNotify(card)}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Notify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No expired cards found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiredCards;