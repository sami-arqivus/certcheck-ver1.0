import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AcceptedEmployees from "./pages/AcceptedEmployees";
import RejectedEmployees from "./pages/RejectedEmployees";
import ExpiredCards from "./pages/ExpiredEmployees";
import ActiveCards from "./pages/ActiveEmployees";
import PendingEmployees from "./pages/PendingEmployees";
import CSCSCardDetails from "./pages/CSCSCardDetails";
import FilteredCSCSCards from "./pages/FilteredCSCSCards";
import VerifyCard from "./pages/VerifyCard";
import UserProfile from "./pages/UserProfile";
import DashboardLayout from "./layouts/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/admin">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="pending" element={<PendingEmployees />} />
              <Route path="accepted" element={<AcceptedEmployees />} />
              <Route path="rejected" element={<RejectedEmployees />} />
              <Route path="expired" element={<ExpiredCards />} />
              <Route path="active" element={<ActiveCards />} />
              <Route path="cscs-cards" element={<CSCSCardDetails />} />
              <Route path="filtered-cscs" element={<FilteredCSCSCards />} />
              <Route path="verify-card" element={<VerifyCard />} />
              <Route path="profile/:refId" element={<UserProfile />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
