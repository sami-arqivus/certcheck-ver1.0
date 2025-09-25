import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api';
import Cookies from 'js-cookie';

interface VerificationResult {
  filename: string;
  fileType: string;
  success: boolean;
  message: string;
  cardsData?: any;
  attempts: number;
  taskId?: string;
}

interface BulkVerificationState {
  files: File[];
  results: VerificationResult[];
  isProcessing: boolean;
  currentFile: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
}

const BulkVerify = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<BulkVerificationState>({
    files: [],
    results: [],
    isProcessing: false,
    currentFile: 0,
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0
  });

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only images and PDF files are allowed.",
        variant: "destructive",
      });
    }
    
    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      totalFiles: prev.files.length + validFiles.length
    }));
  };

  // Handle folder selection
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      totalFiles: prev.files.length + validFiles.length
    }));
  };

  // Remove file from list
  const removeFile = (index: number) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
      totalFiles: prev.totalFiles - 1
    }));
  };

  // Clear all files
  const clearFiles = () => {
    setState(prev => ({
      ...prev,
      files: [],
      results: [],
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0
    }));
  };

  // Process single file with retry logic
  const processFile = async (file: File, maxAttempts: number = 5): Promise<VerificationResult> => {
    const result: VerificationResult = {
      filename: file.name,
      fileType: file.type,
      success: false,
      message: '',
      attempts: 0,
      cardsData: null
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      result.attempts = attempt;
      
      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Call vision API for CSCS card extraction
        const token = Cookies.get('certcheck_token');
        const ocrResponse = await apiClient.post('/vision/cert-to-json', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        if (ocrResponse.data.success && ocrResponse.data.extracted_data) {
          const extractedData = ocrResponse.data.extracted_data;
          
          // Check if we have the required fields
          if (extractedData.scheme && extractedData.registration_number && extractedData.last_name) {
            // Call admin validation
            const validationResponse = await apiClient.post('/tasks_scheduling/admin_validate_cscs_card/', {
              scheme: extractedData.scheme,
              registration_number: extractedData.registration_number,
              last_name: extractedData.last_name,
              first_name: extractedData.first_name || null,
              expiry_date: extractedData.expiry_date || null,
              hse_tested: null,
              role: null
            });

            if (validationResponse.data.status === 'SUBMITTED' && validationResponse.data.task_id) {
              // Poll for result
              const finalResult = await pollForValidationResult(validationResponse.data.task_id);
              
              if (finalResult.success) {
                result.success = true;
                result.message = 'Verification successful';
                result.cardsData = finalResult.cardsData;
                result.taskId = validationResponse.data.task_id;
                return result;
              } else {
                result.message = finalResult.message || 'Verification failed';
              }
            } else {
              result.message = 'Failed to submit verification';
            }
          } else {
            result.message = 'Could not extract required card details from image';
          }
        } else {
          result.message = 'OCR failed to extract data from image';
        }
      } catch (error: any) {
        result.message = `Attempt ${attempt} failed: ${error.response?.data?.detail || error.message}`;
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return result;
  };

  // Poll for validation result
  const pollForValidationResult = async (taskId: string, maxAttempts: number = 30): Promise<any> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await apiClient.get(`/tasks_scheduling/admin_validate_cscs_card/${taskId}`);
        const { status, result, message } = response.data;
        
        if (status === 'SUCCESS') {
          return { success: true, cardsData: result, message: 'Verification completed' };
        } else if (status === 'FAILURE') {
          return { success: false, message: message || 'Verification failed' };
        } else if (status === 'PENDING' || status === 'RECEIVED' || status === 'STARTED') {
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          return { success: false, message: `Unexpected status: ${status}` };
        }
      } catch (error: any) {
        if (attempt === maxAttempts) {
          return { success: false, message: 'Failed to get verification result' };
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    return { success: false, message: 'Verification timed out' };
  };


  // Process all files
  const processAllFiles = async () => {
    if (state.files.length === 0) {
      toast({
        title: "No Files",
        description: "Please select files to process.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      results: [],
      currentFile: 0,
      completedFiles: 0,
      failedFiles: 0
    }));

    const results: VerificationResult[] = [];

    for (let i = 0; i < state.files.length; i++) {
      setState(prev => ({ ...prev, currentFile: i + 1 }));
      
      const file = state.files[i];
      const result = await processFile(file);
      results.push(result);
      
      setState(prev => ({
        ...prev,
        results: [...results],
        completedFiles: results.filter(r => r.success).length,
        failedFiles: results.filter(r => !r.success).length
      }));
    }

    setState(prev => ({ ...prev, isProcessing: false }));
    
    toast({
      title: "Processing Complete",
      description: `Processed ${state.files.length} files. ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed.`,
      variant: "default",
    });
  };

  // Generate and download Excel report
  const downloadExcelReport = () => {
    if (state.results.length === 0) {
      toast({
        title: "No Results",
        description: "No results to download.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content (Excel can open CSV)
    const headers = [
      'Filename',
      'File Type',
      'Status',
      'Message',
      'Attempts',
      'Task ID',
      'Scheme',
      'Registration Number',
      'Last Name',
      'First Name',
      'Expiry Date',
      'Card Data'
    ];

    const rows = state.results.map(result => {
      const cardData = result.cardsData?.cards_data?.[0] || {};
      return [
        result.filename,
        result.fileType,
        result.success ? 'SUCCESS' : 'FAILED',
        result.message,
        result.attempts.toString(),
        result.taskId || 'N/A',
        cardData.scheme || 'N/A',
        cardData.registration_number || 'N/A',
        cardData.last_name || 'N/A',
        cardData.first_name || 'N/A',
        cardData.expiry_date || 'N/A',
        result.cardsData ? JSON.stringify(result.cardsData) : 'N/A'
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk-verification-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Bulk verification report has been downloaded.",
      variant: "default",
    });
  };

  const progress = state.totalFiles > 0 ? (state.completedFiles + state.failedFiles) / state.totalFiles * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-primary" />
            <span>Bulk Card Verification</span>
          </CardTitle>
          <CardDescription>
            Upload multiple image or PDF files to verify CSCS cards in bulk. Results will be exported to an Excel report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Select Files</span>
              </Button>
              
              <Button
                onClick={() => folderInputRef.current?.click()}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Folder</span>
              </Button>
              
              {state.files.length > 0 && (
                <Button
                  onClick={clearFiles}
                  variant="destructive"
                  size="sm"
                >
                  Clear All
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <input
              ref={folderInputRef}
              type="file"
              multiple
              webkitdirectory=""
              onChange={handleFolderSelect}
              className="hidden"
            />

            {/* File List */}
            {state.files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Selected Files ({state.files.length})</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {state.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        {file.type.startsWith('image/') ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : (
                          <File className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="secondary">{file.type}</Badge>
                      </div>
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                        disabled={state.isProcessing}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Processing Section */}
          {state.isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Processing file {state.currentFile} of {state.totalFiles}
                </span>
                <span className="text-sm text-muted-foreground">
                  {state.completedFiles} completed, {state.failedFiles} failed
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing files... This may take several minutes.</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={processAllFiles}
              disabled={state.files.length === 0 || state.isProcessing}
              className="flex items-center space-x-2"
            >
              {state.isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>
                {state.isProcessing ? 'Processing...' : 'Start Verification'}
              </span>
            </Button>

            {state.results.length > 0 && !state.isProcessing && (
              <Button
                onClick={downloadExcelReport}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Report</span>
              </Button>
            )}
          </div>

          {/* Results Summary */}
          {state.results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{state.completedFiles}</p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{state.failedFiles}</p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{state.results.length}</p>
              </div>
            </div>
          )}

          {/* Detailed Results */}
          {state.results.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Detailed Results</h4>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {state.results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center space-x-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">{result.filename}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? 'SUCCESS' : 'FAILED'}
                      </Badge>
                      <Badge variant="outline">
                        {result.attempts} attempts
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{result.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkVerify;
