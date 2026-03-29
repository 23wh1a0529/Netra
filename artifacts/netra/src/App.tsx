import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";

import { SplashScreen } from "@/pages/splash";
import { LoginPage } from "@/pages/login";
import { AdminDashboard } from "@/pages/admin/dashboard";
import { LiveMapPage } from "@/pages/admin/map";
import { PersonnelPage } from "@/pages/admin/personnel";
import { AlertsPage } from "@/pages/admin/alerts";
import { AnnouncementsPage } from "@/pages/admin/announcements";
import { OfficerHome } from "@/pages/officer/home";
import { FaceVerifyPage } from "@/pages/officer/face-verify";
import { OfficerCameraPage } from "@/pages/officer/camera";
import { AdminLayout } from "@/components/AdminLayout";
import { OfficerLayout } from "@/components/OfficerLayout";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false }
  }
});

// Route Guard components
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, role } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated || role !== "admin") {
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }
  return <AdminLayout><Component /></AdminLayout>;
}

function OfficerRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, role } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated || role !== "officer") {
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }
  return <OfficerLayout><Component /></OfficerLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashScreen} />
      <Route path="/login" component={LoginPage} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/map">
        <AdminRoute component={LiveMapPage} />
      </Route>
      <Route path="/admin/personnel">
        <AdminRoute component={PersonnelPage} />
      </Route>
      <Route path="/admin/alerts">
        <AdminRoute component={AlertsPage} />
      </Route>
      <Route path="/admin/announcements">
        <AdminRoute component={AnnouncementsPage} />
      </Route>

      {/* Officer Routes */}
      <Route path="/officer">
        <OfficerRoute component={OfficerHome} />
      </Route>
      <Route path="/officer/face-verify">
        <OfficerRoute component={FaceVerifyPage} />
      </Route>
      <Route path="/officer/camera">
        <OfficerRoute component={OfficerCameraPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'font-sans font-semibold rounded-xl border border-border',
              style: { background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
