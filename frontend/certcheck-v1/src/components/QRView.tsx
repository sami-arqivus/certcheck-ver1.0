import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Share2, Loader2, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

export function QRView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    console.log(user)
    console.log(user.id)
    if (user?.id) {
      const url = `${import.meta.env.VITE_API_URL || 'https://localhost'}/public-profile/${user.id}`;
      setPublicUrl(url);
      generateQRCode(url);
    }
  }, [user]);

  const generateQRCode = async (url?: string) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User ID not available. Please try logging in again.',
        variant: 'destructive',
      });
      return;
    }

    const qrUrl = url || publicUrl;
    if (!qrUrl || !canvasRef.current) return;

    try {
      setLoading(true);
      const canvas = canvasRef.current;
      
      // Generate QR code directly to canvas
      await QRCode.toCanvas(canvas, qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });

      toast({
        title: 'Success',
        description: 'QR code generated successfully!',
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
        description: 'QR code downloaded successfully.',
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
        description: 'Public URL copied to clipboard.',
      });
    } catch (error) {
      console.error('Error copying URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy URL.',
        variant: 'destructive',
      });
    }
  };

  const openPublicUrl = () => {
    if (!publicUrl) return;
    window.open(publicUrl, '_blank');
  };

  const shareQRCode = async () => {
    if (!publicUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My CertCheck Profile',
          text: 'Check out my verified certificates and profile',
          url: publicUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      copyPublicUrl();
    }
  };

  if (!user?.id) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p>User not available. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Your QR Code</h2>
        <p className="text-muted-foreground">Share your verified profile with others</p>
      </div>

      <Card className="bg-gradient-card border-border/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center">
            <QrCode className="w-5 h-5 mr-2 text-primary" />
            Personal QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="relative p-4 bg-white rounded-lg shadow-lg">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="block"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* Public URL Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Public Profile URL:</label>
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md border">
              <code className="flex-1 text-sm text-foreground truncate">
                {publicUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPublicUrl}
                className="h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={openPublicUrl}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid gap-2 md:grid-cols-2">
            <Button onClick={downloadQRCode} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
            <Button onClick={shareQRCode} className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share Profile
            </Button>
          </div>

          {/* Info Text */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Anyone can scan this QR code to view your verified certificates and public profile information.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default QRView;