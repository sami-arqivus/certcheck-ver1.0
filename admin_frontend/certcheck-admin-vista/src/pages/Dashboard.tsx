import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Users } from 'lucide-react';
import { HeaderNav } from '@/components/HeaderNav';
import { AddEmployeeDialog } from '@/components/AddEmployeeDialog';
import { DownloadButton } from '@/components/DownloadButton';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api';
import Cookies from 'js-cookie';

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

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = Cookies.get('certcheck_token');
      const response = await apiClient.get('/aws/fetch-invitations-details', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setEmployees(response.data.invitations);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (employeeData: {
    name: string;
    email: string;
    position: string;
    workLocation: string;
    startDate: Date;
  }) => {
    try {
      const token = Cookies.get('certcheck_token');
      await apiClient.post('/aws/store-invitation-details', employeeData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      toast({
        title: "Success",
        description: "Employee added successfully",
      });
      setAddEmployeeOpen(false);
    } catch (error) {
      console.error('Failed to add employee:', error);
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Employee List */}
      <Card className="bg-gradient-card shadow-admin-md border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold text-foreground">
              Employee Directory
            </CardTitle>
            {employees.length > 0 && (
              <DownloadButton
                data={employees.map(emp => ({
                  ref_id: emp.ref_id,
                  email: emp.user_email,
                  position: emp.position,
                  work_location: emp.work_location,
                  invite_link: emp.invite_link,
                  created_at: new Date(emp.created_at).toLocaleDateString(),
                  expires_at: new Date(emp.expires_at).toLocaleDateString(),
                  status: emp.status,
                }))}
                filename="employee_directory"
                headers={['Ref ID', 'Email', 'Position', 'Work Location', 'Invite Link', 'Created At', 'Expires At', 'Status']}
                title="Employee Directory"
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
                    <TableHead>Invite Link</TableHead>
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
                      <TableCell className="max-w-[200px] truncate">
                        <a 
                          href={employee.invite_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {employee.invite_link}
                        </a>
                      </TableCell>
                      <TableCell>{new Date(employee.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(employee.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            employee.status === 'pending' ? 'pending' : 
                            employee.status === 'completed' || employee.status === 'accepted' ? 'accepted' : 
                            employee.status === 'rejected' ? 'rejected' :
                            'secondary'
                          }
                          className="hover:bg-red-500/20 hover:text-red-700 hover:border-red-500/30 cursor-pointer transition-colors"
                        >
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
                <p className="text-muted-foreground">No employees found</p>
              </div>
            )}
          </CardContent>
      </Card>

      {/* Add Employee Button - Centered at bottom */}
      <div className="flex justify-center">
        <Button
          onClick={() => setAddEmployeeOpen(true)}
          className="bg-gradient-primary hover:opacity-90 text-white shadow-admin-md"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <AddEmployeeDialog
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        onAddEmployee={handleAddEmployee}
      />
    </div>
  );
};

export default Dashboard;