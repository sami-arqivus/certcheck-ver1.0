
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

interface S3File {
  key: string;
  lastModified: string;
  size: number;
  url?: string;
}

const UserFiles: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<S3File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserFiles = async () => {
    if (!token) {
      setError('Please log in to view your files');
      toast({
        title: 'Authentication Error',
        description: 'Please log in to view your files.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/aws/list-files/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const fileList = Array.isArray(response.data.files) ? response.data.files : [];
      if (!fileList.every((file: S3File) => 'key' in file && 'lastModified' in file && 'size' in file)) {
        throw new Error('Invalid file data format');
      }
      setFiles(fileList);
    } catch (error: any) {
      console.error('Error fetching user files:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to load files. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserFiles();
  }, [token]);

  const handleDownload = async (fileKey: string) => {
    console.log('Downloading file:', fileKey);
    try {
      const response = await apiClient.get(`/aws/download-file/${encodeURIComponent(fileKey)}`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-300" />
        <span className="ml-2 text-white">Loading your files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-300 mb-4">{error}</p>
        <Button 
          onClick={fetchUserFiles}
          className="bg-blue-500/80 hover:bg-blue-500 text-white"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Your Files</h3>
        <Button 
          onClick={fetchUserFiles}
          size="sm"
          className="bg-blue-500/80 hover:bg-blue-500 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center p-8 text-gray-300">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No files found</p>
          <p className="text-sm text-gray-400 mt-2">
            Upload some documents to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {files.map((file, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-300 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">
                        {file.key.split('/').pop() || file.key}
                      </p>
                      <p className="text-sm text-gray-300">
                        {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <Button
                      onClick={() => handleDownload(file.key)}
                      size="sm"
                      className="bg-green-500/80 hover:bg-green-500 text-white"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserFiles;
