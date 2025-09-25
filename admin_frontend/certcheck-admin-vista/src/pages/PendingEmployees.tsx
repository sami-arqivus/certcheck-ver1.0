import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import Cookies from "js-cookie";
import { DownloadButton } from "@/components/DownloadButton";

interface Invitation {
  ref_id: string;
  user_email: string;
  invite_link: string;
  position: string;
  work_location: string;
  created_at: string;
  expires_at: string;
  status: string;
}

export default function PendingEmployees() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingEmployees();
  }, []);

  const fetchPendingEmployees = async () => {
    try {
      const token = Cookies.get('certcheck_token');
      const response = await apiClient.get('/aws/fetch-invitations-details?status=Pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const pendingInvitations = response.data.invitations.filter(
        (inv: Invitation) => inv.status === 'Pending'
      );
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Failed to fetch pending employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    };
    
    return (
      <Badge 
        className={`${variants[status as keyof typeof variants]} animate-pulse transition-all duration-300`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Pending Employees</CardTitle>
          {invitations.length > 0 && (
            <DownloadButton
              data={invitations.map(inv => ({
                ref_id: inv.ref_id,
                email: inv.user_email,
                position: inv.position,
                work_location: inv.work_location,
                created_at: new Date(inv.created_at).toLocaleDateString(),
                expires_at: new Date(inv.expires_at).toLocaleDateString(),
                status: inv.status,
              }))}
              filename="pending_employees"
              headers={['Ref ID', 'Email', 'Position', 'Work Location', 'Created At', 'Expires At', 'Status']}
              title="Pending Employees"
            />
          )}
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Work Location</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.ref_id}>
                      <TableCell className="font-mono text-sm">
                        {invitation.ref_id}
                      </TableCell>
                      <TableCell>{invitation.user_email}</TableCell>
                      <TableCell>{invitation.position}</TableCell>
                      <TableCell>{invitation.work_location}</TableCell>
                      <TableCell>{formatDate(invitation.created_at)}</TableCell>
                      <TableCell>{formatDate(invitation.expires_at)}</TableCell>
                      <TableCell>{getStatusBadge(invitation.status)}</TableCell>
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
}