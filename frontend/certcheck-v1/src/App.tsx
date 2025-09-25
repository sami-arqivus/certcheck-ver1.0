
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./components/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthForm from "./components/AuthForm";
import ResetPassword from "./components/ResetPassword";
import PhotoUpload from "./components/PhotoUpload";
import CameraCapture from "./components/CameraCapture";
import ValidationResult from "./components/ValidationResult";
import CertificateUpload from "./components/CertificateUpload";
import Homepage from "./components/Homepage";
import InvitationsStatus from "./components/InvitationsStatus";
import Updates from "./components/Updates";
import AgreementPage from "./components/Agreement";
import VerifiedActiveCards from "./components/VerifiedActiveCards";
import PublicProfileView from "./components/PublicProfileView";
import { NotificationProvider } from "@/hooks/useNotifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
          <Routes>
            <Route path="/" element={<AuthForm />} />
            <Route path="/login" element={<AuthForm />} />
            <Route path="/register" element={<AuthForm />} />
            <Route path="/forgot-password" element={<AuthForm />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <PhotoUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/certificate"
              element={
                <ProtectedRoute>
                  <CertificateUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/capture"
              element={
                <ProtectedRoute>
                  <CameraCapture />
                </ProtectedRoute>
              }
            />
            <Route
              path="/result"
              element={
                <ProtectedRoute>
                  <ValidationResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Homepage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invitations"
              element={
                <ProtectedRoute>
                  <InvitationsStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verified-cards"
              element={
                <ProtectedRoute>
                  <VerifiedActiveCards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/updates"
              element={
                <ProtectedRoute>
                  <Updates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agreement"
              element={
                <ProtectedRoute>
                  <AgreementPage />
                </ProtectedRoute>
              }
            />
            <Route path="/public-profile/:userid" element={<PublicProfileView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
