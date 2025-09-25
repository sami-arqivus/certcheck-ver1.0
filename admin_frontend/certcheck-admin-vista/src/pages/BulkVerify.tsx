import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUp, FolderOpen, X, Loader2, Download, FileText, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import apiClient from '@/lib/api';
import Cookies from 'js-cookie';
import * as XLSX from 'xlsx';

interface VerificationResult {
  filename: string;
  file_type: string;
  success: boolean;
  message: string;
  extracted_data?: any;
  validation_data?: any;
  task_id?: string;
}

const BulkVerify = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState({
    files: [] as File[],
    isProcessing: false,
    totalFiles: 0,
    processedFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    results: [] as VerificationResult[],
  });

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      return validTypes.includes(file.type);
    });
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were skipped. Only PNG, JPG, JPEG, and PDF files are supported.",
        variant: "destructive",
      });
    }
    
    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      totalFiles: prev.totalFiles + validFiles.length
    }));
  }, [toast]);

  // Handle folder selection
  const handleFolderSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      return validTypes.includes(file.type);
    });
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were skipped. Only PNG, JPG, JPEG, and PDF files are supported.",
        variant: "destructive",
      });
    }
    
    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      totalFiles: prev.totalFiles + validFiles.length
    }));
  }, [toast]);

  // Remove file from list
  const removeFile = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
      totalFiles: prev.totalFiles - 1
    }));
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      files: [],
      totalFiles: 0,
      results: [],
      processedFiles: 0,
      completedFiles: 0,
      failedFiles: 0
    }));
  }, []);

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

    // Check authentication before starting
    const token = Cookies.get('certcheck_token');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      results: [],
      processedFiles: 0,
      completedFiles: 0,
      failedFiles: 0
    }));

    try {
      // Create FormData for bulk upload
      const formData = new FormData();
      state.files.forEach(file => {
        formData.append('files', file);
      });

      console.log(`Starting bulk verification for ${state.files.length} files`);

      // Call bulk verification endpoint
      const response = await apiClient.post('/tasks_scheduling/bulk-verify-cards/', formData);

      if (response.data.success) {
        const results = response.data.results || [];
        
        setState(prev => ({
          ...prev,
          results: results,
          completedFiles: results.filter(r => r.success).length,
          failedFiles: results.filter(r => !r.success).length,
          processedFiles: results.length
        }));

        toast({
          title: "Processing Complete",
          description: `Processed ${results.length} files. ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed.`,
          variant: "default",
        });
      } else {
        throw new Error(response.data.message || 'Bulk verification failed');
      }
    } catch (error: any) {
      console.error('Bulk verification failed:', error);
      toast({
        title: "Processing Failed",
        description: error.response?.data?.detail || error.message || 'An error occurred during processing.',
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Generate Excel report
  const generateReport = () => {
    if (state.results.length === 0) {
      toast({
        title: "No Results",
        description: "No results to download.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for Excel
    const excelData = state.results.map(result => {
      const cardData = result.validation_data?.cards_data?.[0] || {};
      return {
        'Filename': result.filename,
        'File Type': result.file_type,
        'Status': result.success ? 'SUCCESS' : 'FAILED',
        'Message': result.message,
        'Task ID': result.task_id || 'N/A',
        'Scheme': cardData.scheme || 'N/A',
        'Registration Number': cardData.registration_number || 'N/A',
        'Last Name': cardData.last_name || 'N/A',
        'First Name': cardData.first_name || 'N/A',
        'Expiry Date': cardData.expiry_date || 'N/A',
        'HSE Tested': cardData.hse_tested || 'N/A',
        'Role': cardData.role || 'N/A',
        'Raw Data': result.validation_data ? JSON.stringify(result.validation_data) : 'N/A'
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Verification Results');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk-verification-report-${new Date().toISOString().split('T')[0]}.xlsx`;
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

  const progress = state.totalFiles > 0 ? (state.processedFiles / state.totalFiles) * 100 : 0;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
                disabled={state.isProcessing}
              >
                <Upload className="w-4 h-4" />
                <span>Select Files</span>
              </Button>
              
              <Button
                onClick={() => folderInputRef.current?.click()}
                variant="outline"
                className="flex items-center space-x-2"
                disabled={state.isProcessing}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Folder</span>
              </Button>
              
              {state.files.length > 0 && (
                <Button
                  onClick={clearAllFiles}
                  variant="outline"
                  className="flex items-center space-x-2"
                  disabled={state.isProcessing}
                >
                  <X className="w-4 h-4" />
                  <span>Clear All</span>
                </Button>
              )}
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf"
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
          </div>

          {/* File List */}
          {state.files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Selected Files ({state.files.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                {state.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <FileUp className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">({file.type})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={state.isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Section */}
          {state.isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing files...</span>
                <span>{state.completedFiles} completed, {state.failedFiles} failed</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              onClick={processAllFiles}
              disabled={state.files.length === 0 || state.isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {state.isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Start Verification'
              )}
            </Button>
            
            {state.results.length > 0 && (
              <Button
                onClick={generateReport}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel Report
              </Button>
            )}
          </div>

          {/* Results Summary */}
          {state.results.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Results Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-900 text-lg">{state.totalFiles}</div>
                  <div className="text-blue-600">Total Files</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-900 text-lg">{state.completedFiles}</div>
                  <div className="text-green-600">Successful</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="font-medium text-red-900 text-lg">{state.failedFiles}</div>
                  <div className="text-red-600">Failed</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Detailed Results</h4>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {state.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{result.filename}</div>
                          <div className="text-xs text-gray-600 mt-1">{result.message}</div>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          result.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.success ? 'SUCCESS' : 'FAILED'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkVerify;