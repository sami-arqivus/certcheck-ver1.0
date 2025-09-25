
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Camera, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import AuthenticatedLayout from './AuthenticatedLayout';
import UserFiles from './UserFiles';
import axios from 'axios';

const PhotoUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !token) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you're logged in",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to data URL for passing to camera capture
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        toast({
          title: "Success!",
          description: "ID document uploaded successfully. Now capture your live photo.",
        });
        navigate('/capture', { 
          state: { 
            referencePhoto: result,
            referenceFilename: file.name
          } 
        });
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AuthenticatedLayout showDashboard={false}>
      <div className="flex gap-8">
        {/* Main Upload Section */}
        <div className="flex-1 space-y-8">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Upload Your ID Document</CardTitle>
              <CardDescription className="text-gray-300">
                Upload a clear photo of your identification document for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="file-upload" className="text-gray-200">
                  Select Image File
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="bg-white/10 border-white/20 text-white file:text-white file:bg-blue-500/20 file:border-0 file:rounded-md file:px-4 file:py-2 file:mr-4"
                />
                {file && (
                  <div className="text-sm text-gray-300">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="flex-1 bg-blue-500/80 hover:bg-blue-500 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Continue to Live Photo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Files Section - Right Side */}
        {/* <div className="w-80">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Your Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserFiles />
            </CardContent>
          </Card>
        </div> */}
      </div>
    </AuthenticatedLayout>
  );
};

export default PhotoUpload;
