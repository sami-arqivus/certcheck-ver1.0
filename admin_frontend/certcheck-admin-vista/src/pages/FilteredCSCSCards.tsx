import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DownloadButton } from '@/components/DownloadButton';
import { useToast } from '@/hooks/use-toast';
import { Filter, Search } from 'lucide-react';
import axios from 'axios';

interface CSCSCard {
  user_email: string;
  name: string;
  reg_no: string;
  card_type: string;
  date_of_expiration: string;
  scheme_name: string;
  qualifications: string;
}

interface FilterCriteria {
  expiry_in_days: string;
  qualification: string;
  scheme_name: string;
  card_type: string;
}

const FilteredCSCSCards = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<CSCSCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>({
    expiry_in_days: '',
    qualification: '',
    scheme_name: '',
    card_type: ''
  });

  const fetchFilteredCards = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      console.log('Applying filters:', filters);
      if (filters.expiry_in_days) params.append('expiry_in_days', filters.expiry_in_days);
      if (filters.qualification) params.append('qualification', filters.qualification);
      if (filters.scheme_name) params.append('scheme_name', filters.scheme_name);
      if (filters.card_type) params.append('card_type', filters.card_type);

      const response = await axios.get(
        `/aws/filter_active_cards/?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.filtered_cards) {
        setCards(response.data.filtered_cards);
      } else {
        setCards([]);
      }
    } catch (error: any) {
      console.error('Error fetching filtered CSCS cards:', error);
      if (error.response?.status === 404) {
        setCards([]);
        toast({
          title: "No Results",
          description: "No CSCS cards found matching the selected filters.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch filtered CSCS cards. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterCriteria, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      expiry_in_days: '',
      qualification: '',
      scheme_name: '',
      card_type: ''
    });
    setCards([]);
  };

  const downloadHeaders = [
    'User Email',
    'Name',
    'Registration Number',
    'Card Type',
    'Expiration Date',
    'Scheme Name',
    'Qualifications'
  ];

  const downloadData = cards.map(card => ({
    user_email: card.user_email,
    name: card.name,
    registration_number: card.reg_no,
    card_type: card.card_type,
    expiration_date: card.date_of_expiration,
    scheme_name: card.scheme_name,
    qualifications: card.qualifications
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Filtered CSCS Cards</h1>
        {cards.length > 0 && (
          <DownloadButton
            data={downloadData}
            filename="filtered-cscs-cards"
            headers={downloadHeaders}
            title="Filtered CSCS Cards Report"
          />
        )}
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="expiry_days">Expires Within (Days)</Label>
              <Input
                id="expiry_days"
                type="number"
                placeholder="e.g., 30"
                value={filters.expiry_in_days}
                onChange={(e) => handleFilterChange('expiry_in_days', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                placeholder="Enter qualification"
                value={filters.qualification}
                onChange={(e) => handleFilterChange('qualification', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheme_name">Scheme Name</Label>
              <Input
                id="scheme_name"
                placeholder="Enter scheme name"
                value={filters.scheme_name}
                onChange={(e) => handleFilterChange('scheme_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card_type">Card Type</Label>
              <Input
                id="card_type"
                placeholder="Enter card type"
                value={filters.card_type}
                onChange={(e) => handleFilterChange('card_type', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={fetchFilteredCards}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {loading ? 'Searching...' : 'Apply Filters'}
            </Button>
            <Button 
              variant="outline" 
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Search Results ({cards.length} cards found)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cards.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Registration No</TableHead>
                    <TableHead>Card Type</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead>Scheme Name</TableHead>
                    <TableHead>Qualifications</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{card.user_email}</TableCell>
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Apply filters above to search for CSCS cards</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FilteredCSCSCards;