import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import Navbar from "./components/Navbar";
import Gallery from "./pages/Gallery";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UploadPage from "./pages/Upload";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { isAuthenticated } from "@/lib/auth";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
// Wrapper for protected routes
function RequireAuth({ children }: { children: JSX.Element }) {
  const authed = isAuthenticated();
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Auth pages — no navbar */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Main app — with navbar */}
            <Route
              path="/*"
              element={
                <>
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={
                        <RequireAuth>
                          <Gallery />
                        </RequireAuth>
                      } />
                      <Route path="/upload" element={
                        <RequireAuth>
                          <UploadPage />
                        </RequireAuth>
                      } />
                      <Route path="/profile" element={
                        <RequireAuth>
                          <Profile />
                        </RequireAuth>
                      } />
                      <Route path="/groups" element={
                        <RequireAuth>
                          <Groups />
                        </RequireAuth>
                      } />
                      <Route path="/groups/:id" element={
                        <RequireAuth>
                          <GroupDetail />
                        </RequireAuth>
                      } />
                      {/* Redirect all unknown paths to Gallery (/) if authed, else Login */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
