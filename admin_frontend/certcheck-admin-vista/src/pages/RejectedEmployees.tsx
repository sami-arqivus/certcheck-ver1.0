import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import Cookies from 'js-cookie';
import { DownloadButton } from '@/components/DownloadButton';

interface Employee {
  ref_id: string;
  user_email: string;
  invite_link: string;
  position: string;
  work_location: string;
  created_at: string;
  expires_at: string;
  status: string;
}

const RejectedEmployees = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRejectedEmployees();
  }, []);

  const fetchRejectedEmployees = async () => {
    try {
      const token = Cookies.get('certcheck_token');
      const response = await axios.get('/aws/fetch-invitations-details?status=Rejected', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setEmployees(response.data.invitations.filter((emp: Employee) => emp.status === 'Rejected'));
    } catch (error) {
      console.error('Failed to fetch rejected employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rejected employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card shadow-admin-md border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold text-foreground">
          Rejected Employees
        </CardTitle>
        {employees.length > 0 && (
          <DownloadButton
            data={employees.map(emp => ({
              ref_id: emp.ref_id,
              email: emp.user_email,
              position: emp.position,
              work_location: emp.work_location,
              created_at: new Date(emp.created_at).toLocaleDateString(),
              expires_at: new Date(emp.expires_at).toLocaleDateString(),
              status: emp.status,
            }))}
            filename="rejected_employees"
            headers={['Ref ID', 'Email', 'Position', 'Work Location', 'Created At', 'Expires At', 'Status']}
            title="Rejected Employees"
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
        ) : employees.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Work Location</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.ref_id}>
                  <TableCell className="font-medium font-mono text-sm">{employee.ref_id}</TableCell>
                  <TableCell>{employee.user_email}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.work_location}</TableCell>
                  <TableCell>{new Date(employee.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(employee.expires_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {employee.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No rejected employees found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RejectedEmployees;