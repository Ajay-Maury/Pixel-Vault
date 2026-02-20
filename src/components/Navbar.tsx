import { Link, useNavigate, useLocation } from "react-router-dom";
import { Camera, Upload, LogOut, LogIn, UserPlus, Search } from "lucide-react";
import { isAuthenticated, removeToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const authed = isAuthenticated();

  function handleLogout() {
    removeToken();
    toast.success("Logged out successfully");
    navigate("/login");
  }

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-primary font-semibold"
      : "text-muted-foreground hover:text-foreground";

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center shadow-glow group-hover:shadow-glow transition-all duration-300">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              <span className="text-gradient-gold">Pixel</span>
              <span className="text-foreground">Vault</span>
            </span>
          </Link>

          {/* Center nav */}
          {authed && (
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className={`text-sm transition-colors ${isActive("/")}`}>
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Gallery
                </span>
              </Link>
              <Link to="/upload" className={`text-sm transition-colors ${isActive("/upload")}`}>
                <span className="flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </span>
              </Link>
            </nav>
          )}

          {/* Auth buttons */}
          <div className="flex items-center gap-2">
            {authed ? (
              <>
                <Link to="/upload" className="md:hidden">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Upload className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold">
                    <UserPlus className="w-4 h-4" />
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
