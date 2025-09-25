import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, RefreshCw, Award, Folder, FolderOpen, User, QrCode } from 'lucide-react';
import { SidebarProfileView } from './SidebarProfileView';
import { SidebarQRView } from './SidebarQRView';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface S3File {
  key: string;
  lastModified: string;
  size: number;
  url?: string;
}

export function AppSidebar() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { state } = useSidebar();
  const [files, setFiles] = useState<S3File[]>([]);
  const [certificates, setCertificates] = useState<S3File[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'files' | 'certificates' | 'profile' | 'qr' | null>(null);
  
  const fetchUserFiles = async () => {
    if (!token) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in to view your files.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setFilesLoading(true);
      const response = await axios.get('/aws/list-files/', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const fileList = Array.isArray(response.data.files) ? response.data.files : [];
      setFiles(fileList);
    } catch (error: any) {
      console.error('Error fetching user files:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to load files. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setFilesLoading(false);
    }
  };

  const fetchUserCertificates = async () => {
    if (!token) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in to view your certificates.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCertificatesLoading(true);
      const response = await axios.get(`/aws/list-certificates/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      const certificateList = Array.isArray(response.data.files) ? response.data.files : [];
      setCertificates(certificateList);
    } catch (error: any) {
      console.error('Error fetching user certificates:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to load certificates. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setCertificatesLoading(false);
    }
  };

  const handleDownload = async (fileKey: string) => {
    try {
      const response = await axios.get(`/aws/download-file/${encodeURIComponent(fileKey)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const handleSectionClick = (section: 'files' | 'certificates' | 'profile' | 'qr') => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
      if (section === 'files' && files.length === 0) {
        fetchUserFiles();
      } else if (section === 'certificates' && certificates.length === 0) {
        fetchUserCertificates();
      }
    }
  };

  const renderFileList = (fileList: S3File[], isLoading: boolean, emptyIcon: React.ReactNode, emptyText: string) => (
    <div className="space-y-2 pl-4">
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="ml-2 text-sm text-foreground">Loading...</span>
        </div>
      ) : fileList.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground">
          {emptyIcon}
          <p className="text-xs mt-2">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {fileList.map((file, index) => (
            <Card key={index} className="bg-gradient-card border-border/20 backdrop-blur-sm hover:shadow-sm transition-all duration-300">
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileText className="w-3 h-3 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-medium truncate text-xs">
                        {file.key.split('/').pop() || file.key}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDownload(file.key)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Sidebar className="border-r border-border/30 bg-gradient-card backdrop-blur-md">
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Documents
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-4">
              {/* Your Files Section */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleSectionClick('files')}
                  className="w-full justify-start text-left hover:bg-accent/50"
                >
                  {activeSection === 'files' ? (
                    <FolderOpen className="w-4 h-4 mr-2 text-primary" />
                  ) : (
                    <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
                  )}
                  <span className="font-medium">Your Files</span>
                  <div className="ml-auto flex items-center">
                    {activeSection === 'files' && (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchUserFiles();
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </SidebarMenuButton>
                {activeSection === 'files' && (
                  <div className="mt-2">
                    {renderFileList(
                      files, 
                      filesLoading, 
                      <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />, 
                      'No files found'
                    )}
                  </div>
                )}
              </SidebarMenuItem>

              {/* Your Certificates Section */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleSectionClick('certificates')}
                  className="w-full justify-start text-left hover:bg-accent/50"
                >
                  {activeSection === 'certificates' ? (
                    <FolderOpen className="w-4 h-4 mr-2 text-primary" />
                  ) : (
                    <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
                  )}
                  <span className="font-medium">Your Cards</span>
                  <div className="ml-auto flex items-center">
                    {activeSection === 'certificates' && (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchUserCertificates();
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </SidebarMenuButton>
                {activeSection === 'certificates' && (
                  <div className="mt-2">
                    {renderFileList(
                      certificates, 
                      certificatesLoading, 
                      <Award className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />, 
                      'No certificates found'
                    )}
                  </div>
                )}
              </SidebarMenuItem>

              {/* Your Profile Section */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleSectionClick('profile')}
                  className="w-full justify-start text-left hover:bg-accent/50 transition-colors duration-200"
                >
                  <User className={`w-4 h-4 mr-2 transition-colors duration-200 ${activeSection === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Your Profile</span>
                </SidebarMenuButton>
                {activeSection === 'profile' && (
                  <div className="mt-2 animate-fade-in">
                    <SidebarProfileView />
                  </div>
                )}
              </SidebarMenuItem>

              {/* Your QR Section */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleSectionClick('qr')}
                  className="w-full justify-start text-left hover:bg-accent/50 transition-colors duration-200"
                >
                  <QrCode className={`w-4 h-4 mr-2 transition-colors duration-200 ${activeSection === 'qr' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Your QR</span>
                </SidebarMenuButton>
                {activeSection === 'qr' && (
                  <div className="mt-2 animate-fade-in">
                    <SidebarQRView />
                  </div>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}