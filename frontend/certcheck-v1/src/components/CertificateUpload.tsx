
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Shield, Sparkles, ArrowRight, File, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from './AuthenticatedLayout';
import { apiClient } from '@/lib/api';

const CertificateUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem('auth_token');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];

    if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select an image (JPG, PNG, GIF) or PDF file.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      
      // For images, show preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!token) {
      toast({
        title: 'Authentication Error',
        description: 'No authentication token found. Please log in again.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      console.log('token:', token);
      const response = await apiClient.post('/vision/cert-to-json', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Certificate upload response:', response.data);

      toast({
        title: "Certificate Uploaded Successfully!",
        description: "Your certificate has been uploaded and is being processed.",
      });

      // Navigate to homepage after successful upload
      navigate('/home');
    } catch (error: any) {
      console.error('Certificate upload error:', error);
      let errorMessage = 'Please try again.';
      if (error.response) {
        errorMessage = error.response.data.detail || 'Server error occurred.';
      } else if (error.request) {
        errorMessage = 'Failed to connect to the server.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
      }

      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = () => {
    if (selectedFile?.type === 'application/pdf') {
      return <FileText className="w-16 h-16 text-red-400" />;
    }
    return <File className="w-16 h-16 text-blue-400" />;
  };

  return (
    <AuthenticatedLayout showDashboard={false}>
      <div className="animate-fade-in">
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
        
        <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl mx-auto max-w-2xl">
          <CardHeader className="text-center pb-2 px-4 sm:px-6">
            <div className="mx-auto mb-4 relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 sm:h-6 sm:w-6 text-yellow-400 animate-bounce-subtle" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-white">
              Upload Your Competence Card
            </CardTitle>
            <p className="text-gray-300 mt-2">
              Upload your competence card or qualification document
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            {/* Upload Area */}
            <div className="relative border-2 border-dashed border-white/40 rounded-xl p-4 sm:p-6 text-center transition-all duration-300 hover:bg-white/5">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                ref={fileInputRef}
              />
              
              {selectedFile ? (
                <div className="relative">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Certificate Preview"
                      className="rounded-xl max-h-48 w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      {getFileIcon()}
                      <p className="text-white mt-2 font-medium">{selectedFile.name}</p>
                      <p className="text-gray-400 text-sm">
                        {selectedFile.type === 'application/pdf' ? 'PDF Document' : 'Image File'}
                      </p>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearSelection();
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white shadow-md"
                  >
                    <ArrowRight className="h-4 w-4 rotate-45" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-green-300 mx-auto mb-4 animate-pulse-subtle" />
                  <p className="text-white text-sm sm:text-base">
                    Drag & drop your card here or click to browse
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">
                    Supported formats: JPG, PNG, PDF
                  </p>
                </>
              )}
            </div>

            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-gradient-to-r from-green-600 via-blue-600 to-green-600 hover:from-green-700 hover:via-blue-700 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-5 w-5 animate-spin" />
                    Uploading Certificate...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-5 w-5" />
                    Upload Certificate
                  </>
                )}
              </Button>
            )}

            {/* Security Note */}
            <div className="text-center text-xs text-gray-400 mt-4 p-3 bg-black/20 rounded-lg border border-white/10">
              <p>🔒 Your certificate is securely processed and stored with encryption.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default CertificateUpload;
