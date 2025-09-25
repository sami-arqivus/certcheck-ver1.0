import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Camera, XCircle, CheckCircle, Loader2, Shield, Sparkles, FileText } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from './AuthenticatedLayout';
import UserFiles from './UserFiles';
import axios from 'axios';
import { useLocation } from 'react-router-dom';


// const [isLoadingCamera, setIsLoadingCamera] = useState(true);
const CameraCapture = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { referencePhoto, referenceFilename } = location.state || {};

  useEffect(() => {
    let stream: MediaStream | null = null;
    console.log("isCameraActive:", isCameraActive);
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio : false, video: true });
        console.log("Camera stream started:", stream);
        videoRef.current?.addEventListener('loadedmetadata', () => {
          console.log("Video metadata loaded");
          if (videoRef.current) {
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
          }
        }
        );
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Play error:", e));
          console.log("Video element assigned stream:", videoRef.current.srcObject);
          setIsCameraActive(true);
        } else {
          console.error("Video reference is null");
          toast({
            title: "Camera Error",
            description: "Unable to access the camera. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access to continue.",
          variant: "destructive",
        });
      }
    };

    if (!capturedImage) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [capturedImage, toast]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        setHasPhoto(true);
        setIsCameraActive(false);
      }
    }
  };

  const discardPhoto = () => {
    setCapturedImage(null);
    setHasPhoto(false);
    setIsCameraActive(true);
  };

  const handleValidation = async () => {
    if (!capturedImage || !referencePhoto) {
      toast({
        title: "Missing Images",
        description: "Both captured and reference photos are required.",
        variant: "destructive",
      });
      return;
    }
    if (!referenceFilename) {
      toast({
        title: "Missing Reference Filename",
        description: "Please upload the reference image again.",
        variant: "destructive",
      });
      return;
    }
    setIsValidating(true);
    try {
      // Convert data URLs to Blobs
      const capturedBlob = await (await fetch(capturedImage)).blob();
      const referenceBlob = await (await fetch(referencePhoto)).blob();
      const token = localStorage.getItem('auth_token');

      const sanitizeFilename = (filename) => {
        return filename.replace(/[^a-zA-Z0-9._-]+|\s+/g, '_');
      };
      const safeFilename = sanitizeFilename(referenceFilename); // Preserve original filename
      console.log("Reference filename:", safeFilename);

      // Create FormData
      const formData = new FormData();
      formData.append('reference_image', referenceBlob, safeFilename);
      formData.append('comparison_image', capturedBlob, 'captured.png');

      // Send to FastAPI endpoint
      const response = await axios.post('/vision/facial-recognition', formData, {
        headers: { 'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
         },
      });

      console.log('Backend response:', response.data);

      // Navigate to result page with the result
      navigate('/result', { state: { result: response.data } });
    } catch (error: any) {
      console.error('Validation error:', error);
      let errorMessage = 'Please try again.';
      if (error.response) {
        errorMessage = error.response.data.detail || error.response.data.message || 'Server error occurred.';
      } else if (error.request) {
        errorMessage = 'Failed to connect to the server. Check your network or server status.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
      }

      toast({
        title: 'Validation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <AuthenticatedLayout showDashboard={false}>
      <div className="flex gap-8">
        {/* Main Camera Section */}
        <div className="flex-1">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 relative">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-yellow-400 animate-bounce-subtle" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                {hasPhoto ? 'Confirm Your Live Photo' : 'Capture Your Live Photo'}
              </CardTitle>
              <p className="text-gray-300 mt-2">
                {hasPhoto
                  ? 'Verify the captured image or retake it, then validate with your ID.'
                  : 'Position yourself clearly in the frame for live capture.'}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                {isCameraActive && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    onLoadedMetadata={() => {
                      console.log("Video metadata loaded");
                      if (videoRef.current) {
                        videoRef.current.play().catch(e => console.error("Video play failed:", e));
                      }
                    }}
                    onError={(e) => console.error("Video error:", e)}
                  />
                )}
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!isCameraActive && !capturedImage && (
                  <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center">
                    <p>Camera is inactive</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                {!hasPhoto ? (
                  <Button
                    onClick={capturePhoto}
                    disabled={!isCameraActive}
                    className="bg-green-500 hover:bg-green-400 text-white"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Live Photo
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={discardPhoto}
                      variant="secondary"
                      className="bg-gray-500 hover:bg-gray-400 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Retake
                    </Button>
                    <Button
                      onClick={handleValidation}
                      disabled={isValidating}
                      className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Validate Identity
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              <div className="text-center text-xs text-gray-400 mt-4 p-3 bg-black/20 rounded-lg border border-white/10">
                <p>🔒 Your live camera feed is processed securely and not stored permanently.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Files Section - Right Side */}
        <div className="w-80">
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
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default CameraCapture;