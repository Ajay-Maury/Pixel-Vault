import { useState, useEffect } from "react";
import {
  User, Mail, Image as ImageIcon, Calendar, KeyRound,
  Eye, EyeOff, Loader2, LogOut, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchImages, login } from "@/lib/api";
import { getToken, removeToken } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(100, "Password too long"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function Profile() {
  const navigate = useNavigate();
  const token = getToken();
  const payload = token ? decodeJwt(token) : null;

  const [uploadCount, setUploadCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const storedEmail = localStorage.getItem("userEmail") || "";

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    searchImages("", 1, 0)
      .then((res) => setUploadCount(res.totalCount ?? 0))
      .catch(() => setUploadCount(0))
      .finally(() => setLoadingCount(false));
  }, [token, navigate]);

  function handleLogout() {
    removeToken();
    localStorage.removeItem("userEmail");
    toast.success("Logged out successfully");
    navigate("/login");
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const result = passwordChangeSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    if (newPassword === currentPassword) {
      setFieldErrors({ newPassword: "New password must differ from current password" });
      return;
    }

    if (!storedEmail) {
      toast.error("Cannot verify identity — please log out and back in");
      return;
    }

    setChangingPw(true);
    try {
      const verifyRes = await login(storedEmail, currentPassword);
      if (!verifyRes.token) {
        setFieldErrors({ currentPassword: "Current password is incorrect" });
        return;
      }
      toast.info(
        "Identity verified. The backend doesn't yet expose a change-password endpoint — contact the API owner to add PUT /user/change-password.",
        { duration: 6000 }
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setChangingPw(false);
    }
  }

  const tokenExp = payload?.exp ? new Date(payload.exp * 1000) : null;
  const isExpired = tokenExp ? tokenExp < new Date() : false;

  if (!token) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-1">Account</h1>
        <p className="text-muted-foreground">Manage your profile and security settings</p>
      </div>

      <div className="space-y-6">
        {/* Profile card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="h-1.5 bg-gradient-gold" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow flex-shrink-0">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-bold text-foreground truncate">
                  {storedEmail || payload?.userId || "PixelVault User"}
                </h2>
                <p className="text-muted-foreground text-sm mt-0.5">PixelVault member</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                icon={<ImageIcon className="w-4 h-4" />}
                label="Total Uploads"
                value={loadingCount ? "—" : String(uploadCount ?? 0)}
                loading={loadingCount}
              />
              <StatCard
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={storedEmail ? storedEmail.split("@")[0] : "—"}
                subValue={storedEmail ? "@" + storedEmail.split("@")[1] : undefined}
              />
              <StatCard
                icon={<Calendar className="w-4 h-4" />}
                label="Session expires"
                value={
                  isExpired ? "Expired"
                  : tokenExp ? tokenExp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"
                }
                warn={isExpired}
              />
            </div>
          </div>
        </div>

        {/* Change password card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Change Password</h3>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            Your current password will be verified. Note: the backend currently doesn't support persisting the new password — this verifies your identity only.
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-foreground font-medium text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value.slice(0, 100)); setFieldErrors((p) => ({ ...p, currentPassword: "" })); }}
                  className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground pr-10"
                  autoComplete="current-password"
                  maxLength={100}
                />
                <ToggleVisible show={showCurrent} toggle={() => setShowCurrent((v) => !v)} />
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-foreground font-medium text-sm">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value.slice(0, 100)); setFieldErrors((p) => ({ ...p, newPassword: "" })); }}
                  className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground pr-10"
                  autoComplete="new-password"
                  maxLength={100}
                />
                <ToggleVisible show={showNew} toggle={() => setShowNew((v) => !v)} />
              </div>
              {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
              {fieldErrors.newPassword && (
                <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.newPassword}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium text-sm">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value.slice(0, 100)); setFieldErrors((p) => ({ ...p, confirmPassword: "" })); }}
                  className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground pr-10"
                  autoComplete="new-password"
                  maxLength={100}
                />
                <ToggleVisible show={showConfirm} toggle={() => setShowConfirm((v) => !v)} />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={changingPw}
              className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold gap-2"
            >
              {changingPw ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                <><KeyRound className="w-4 h-4" /> Verify & Change Password</>
              )}
            </Button>
          </form>
        </div>

        {/* Quick links */}
        <div className="flex gap-3">
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted gap-2">
              <ImageIcon className="w-4 h-4" />
              Gallery
            </Button>
          </Link>
          <Link to="/upload" className="flex-1">
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted gap-2">
              <ImageIcon className="w-4 h-4" />
              Upload
            </Button>
          </Link>
        </div>

        {/* Prominent Logout button */}
        <div className="bg-card border border-destructive/30 rounded-2xl p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Sign out</h3>
              <p className="text-muted-foreground text-sm">
                You'll be redirected to the login page and your local session will be cleared.
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="gap-2 flex-shrink-0 font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, loading, warn }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  loading?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-muted rounded-xl p-4 border border-border">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
        {icon}{label}
      </div>
      {loading ? (
        <div className="h-5 w-16 bg-border rounded animate-pulse" />
      ) : (
        <div className={`font-semibold text-sm truncate ${warn ? "text-destructive" : "text-foreground"}`}>
          {value}
          {subValue && <span className="text-muted-foreground font-normal">{subValue}</span>}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, mono, warn }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-muted rounded-lg p-3 border border-border flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}{label}
      </div>
      <p className={`text-sm truncate ${mono ? "font-mono" : "font-medium"} ${warn ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function ToggleVisible({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [password.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const levels = ["", "Weak", "Fair", "Good", "Strong"];
  const barColors = ["", "bg-destructive", "bg-yellow-500", "bg-blue-500", "bg-primary"];
  const textColors = ["", "text-destructive", "text-yellow-500", "text-blue-500", "text-primary"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? barColors[score] : "bg-border"}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[score]}`}>{levels[score]}</p>
    </div>
  );
}
