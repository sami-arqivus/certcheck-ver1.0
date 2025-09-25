import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Download, Share2, Loader2, ExternalLink, Copy, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import axios from 'axios';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_photo: string | null;
}

export function SidebarQRView() {
  const { token } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await axios.get('/user/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user profile.',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile(token).then((profile) => {
        if (profile) {
          setUserProfile(profile);
          const url = `https://54.159.160.253/public-profile/${profile.id}`;
          setPublicUrl(url);
          // Removed generateQRCode(url) call from here
        }
      });
    }
  }, [token]);

  // NEW: Trigger sidebar QR code generation after state updates
  useEffect(() => {
    if (userProfile?.id && publicUrl && canvasRef.current) {
      generateQRCode();
    }
  }, [userProfile?.id, publicUrl]);

  const generateQRCode = async (url?: string) => {
    const qrUrl = url || publicUrl;
    if (!qrUrl || !canvasRef.current) return;

    try {
      setLoading(true);
      const canvas = canvasRef.current;
      
      // Generate smaller QR code for sidebar
      await QRCode.toCanvas(canvas, qrUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const link = document.createElement('a');
      link.download = 'my-certcheck-qr.png';
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: 'Success',
        description: 'QR code downloaded.',
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to download QR code.',
        variant: 'destructive',
      });
    }
  };

  const copyPublicUrl = async () => {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Success',
        description: 'URL copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy URL.',
        variant: 'destructive',
      });
    }
  };

  const generateLargeQRCode = async () => {
    if (!modalCanvasRef.current || !publicUrl) return;

    try {
      setModalLoading(true);
      const canvas = modalCanvasRef.current;
      
      // Generate larger QR code for modal
      await QRCode.toCanvas(canvas, publicUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Error generating large QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code.',
        variant: 'destructive',
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenModal = () => {
    setDialogOpen(true);
    setTimeout(() => generateLargeQRCode(), 100);
  };

  const shareQRCode = async () => {
    if (!publicUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My CertCheck Profile',
          text: 'Check out my verified certificates',
          url: publicUrl,
        });
      } catch (error) {
        copyPublicUrl();
      }
    } else {
      copyPublicUrl();
    }
  };

  if (!userProfile?.id) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <QrCode className="w-6 h-6 mx-auto mb-2" />
        <p className="text-xs">QR code not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pl-4">
      <Card className="bg-gradient-card border-border/20 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <QrCode className="w-3 h-3 mr-2 text-primary" />
            Your QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="relative p-2 bg-white rounded-md shadow-sm">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="block"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* URL Preview */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Profile URL:</p>
            <div className="flex items-center space-x-1 p-2 bg-muted/30 rounded text-xs">
              <code className="flex-1 truncate text-foreground">
                {publicUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPublicUrl}
                className="h-5 w-5 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={downloadQRCode} 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-7"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            <Button 
              onClick={shareQRCode} 
              size="sm" 
              className="w-full text-xs h-7"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Share
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs h-7"
                  onClick={handleOpenModal}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open Full View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-center">Your QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center p-4">
                  <div className="relative p-4 bg-white rounded-lg shadow-sm">
                    {modalLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}
                    <canvas
                      ref={modalCanvasRef}
                      className="block"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground px-4 pb-2">
                  Scan this QR code to view your public profile
                </p>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}