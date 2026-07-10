import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  AlertCircle,
  Calendar,
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  PencilLine,
  Save,
  Shield,
  Upload,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getProfile, searchImages, changePassword, updateProfile, type ProfileRecord } from "@/lib/api";
import { getToken, removeToken } from "@/lib/auth";
import { resetWalkthrough } from "@/components/Walkthrough";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(100, "Password too long"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name is too long"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
});

function extractProfile(data: any): ProfileRecord | null {
  const source = data?.user ?? data?.data ?? data?.profile ?? data;
  if (!source?.email) return null;
  return {
    id: source.id,
    email: source.email,
    firstName: source.firstName ?? "",
    lastName: source.lastName ?? "",
    gender: source.gender ?? null,
    uploadCount: source.uploadCount ?? 0,
  };
}

function getGenderMeta(gender?: string | null) {
  const normalized = gender?.toUpperCase();
  if (normalized === "FEMALE") {
    return { label: "Female", icon: Accessibility, color: "text-rose-400" };
  }
  if (normalized === "MALE") {
    return { label: "Male", icon: UserRound, color: "text-sky-400" };
  }
  return { label: normalized ? "Other" : "Not set", icon: User, color: "text-muted-foreground" };
}

function getInitials(firstName: string, lastName: string, email: string) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  return email?.slice(0, 2).toUpperCase() ?? "PV";
}

export default function Profile() {
  const navigate = useNavigate();
  const token = getToken();

  const [uploadCount, setUploadCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("OTHER");
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const genderMeta = useMemo(() => getGenderMeta(profile?.gender ?? gender), [profile?.gender, gender]);
  const displayName = useMemo(() => {
    const fullName = `${profile?.firstName ?? firstName} ${profile?.lastName ?? lastName}`.trim();
    if (fullName) return fullName;
    return profile?.email?.split("@")[0] ?? "PixelVault User";
  }, [firstName, lastName, profile]);
  const initials = useMemo(
    () => getInitials(profile?.firstName ?? firstName, profile?.lastName ?? lastName, profile?.email ?? ""),
    [firstName, lastName, profile]
  );
  const hasProfileChanges = Boolean(
    profile && (
      firstName.trim() !== profile.firstName ||
      lastName.trim() !== profile.lastName ||
      gender !== (profile.gender?.toUpperCase() ?? "OTHER")
    )
  );
  const canSubmitPassword = Boolean(
    currentPassword.trim() &&
    newPassword.trim() &&
    confirmPassword.trim() &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword
  );

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    let mounted = true;

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const result = await getProfile();
        const nextProfile = extractProfile(result);
        if (!mounted) return;
        if (!nextProfile) {
          toast.error("Failed to load profile details");
          return;
        }
        setProfile(nextProfile);
        setFirstName(nextProfile.firstName);
        setLastName(nextProfile.lastName);
        setGender((nextProfile.gender?.toUpperCase() as "MALE" | "FEMALE" | "OTHER") || "OTHER");
        setUploadCount(nextProfile.uploadCount);
        localStorage.setItem("userEmail", nextProfile.email);
        if (nextProfile.id) localStorage.setItem("userId", nextProfile.id);
      } catch {
        if (mounted) toast.error("Unable to load your profile");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    void loadProfile();
    return () => { mounted = false; };
  }, [token, navigate]);

  function handleLogout() {
    removeToken();
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    toast.success("Logged out successfully");
    navigate("/login");
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileErrors({});

    const result = profileSchema.safeParse({ firstName, lastName, gender });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setProfileErrors(errors);
      return;
    }

    setSavingProfile(true);
    try {
      const response = await updateProfile({
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        gender: result.data.gender,
      });
      const nextProfile = extractProfile(response) ?? {
        ...profile,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        gender: result.data.gender,
        email: profile?.email ?? localStorage.getItem("userEmail") ?? "",
      };

      setProfile(nextProfile);
      localStorage.setItem("userEmail", nextProfile.email);
      toast.success("Profile updated successfully");
      setProfileModalOpen(false);
    } catch {
      toast.error("Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const result = passwordChangeSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    if (newPassword === currentPassword) {
      setFieldErrors({ newPassword: "New password must differ from current password" });
      return;
    }

    setChangingPw(true);
    try {
      const response = await changePassword(currentPassword, newPassword);
      if (!response.success) {
        setFieldErrors({ currentPassword: response.message || "Incorrect current password" });
        return;
      }
      toast.info("Password changed successfully", { duration: 6000 });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordModalOpen(false);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setChangingPw(false);
    }
  }

  if (!token) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--gold)/0.15),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-20 sm:pt-14 sm:pb-24">
          <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-3">Account</p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Your Profile
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg text-sm sm:text-base">
            Manage your identity, preferences, and account security.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-14 pb-16 relative z-10">
        {/* Profile Card */}
        <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow text-primary-foreground font-display text-2xl sm:text-3xl font-bold">
                  {profileLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : initials}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-100" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                  {profileLoading ? "Loading..." : displayName}
                </h2>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1 justify-center sm:justify-start text-sm">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{profileLoading ? "Loading..." : (profile?.email || "No email")}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium ${genderMeta.color}`}>
                    <genderMeta.icon className="w-3 h-3" />
                    {genderMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-emerald-400">
                    <Shield className="w-3 h-3" />
                    Active
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-3 shrink-0">
                <div className="text-center px-4 py-3 rounded-xl border border-border bg-background/60 min-w-[80px]">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Camera className="w-3 h-3" />
                    Uploads
                  </div>
                  {profileLoading ? (
                    <div className="h-6 w-10 mx-auto rounded bg-border animate-pulse" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">{uploadCount ?? 0}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Detail chips */}
            <Separator className="my-5 sm:my-6 bg-border/60" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DetailRow icon={<User className="w-3.5 h-3.5" />} label="First Name" value={profileLoading ? "..." : (profile?.firstName || "—")} />
              <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Last Name" value={profileLoading ? "..." : (profile?.lastName || "—")} />
              <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Gender" value={profileLoading ? "..." : genderMeta.label} />
            </div>
          </div>
        </section>

        {/* Action Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          {/* Edit Profile */}
          <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
            <DialogTrigger asChild>
              <button className="group text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-glow transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <PencilLine className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Edit Profile</h3>
                <p className="text-xs text-muted-foreground mt-1">Update your name & gender</p>
              </button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card shadow-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-foreground">Edit Profile</DialogTitle>
                <DialogDescription>Update your personal information below.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-foreground font-medium text-sm">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => { setFirstName(e.target.value); setProfileErrors((p) => ({ ...p, firstName: "" })); }} placeholder="Enter your first name" className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground" disabled={profileLoading || savingProfile} />
                  {profileErrors.firstName && <InlineError message={profileErrors.firstName} />}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-foreground font-medium text-sm">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => { setLastName(e.target.value); setProfileErrors((p) => ({ ...p, lastName: "" })); }} placeholder="Enter your last name" className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground" disabled={profileLoading || savingProfile} />
                  {profileErrors.lastName && <InlineError message={profileErrors.lastName} />}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground font-medium text-sm">Email</Label>
                  <Input id="email" value={profile?.email ?? ""} className="bg-muted border-border text-muted-foreground h-11" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-foreground font-medium text-sm">Gender</Label>
                  <select id="gender" value={gender} onChange={(e) => { setGender(e.target.value as "MALE" | "FEMALE" | "OTHER"); setProfileErrors((p) => ({ ...p, gender: "" })); }} className="h-11 w-full rounded-md border border-border bg-muted px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={profileLoading || savingProfile}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {profileErrors.gender && <InlineError message={profileErrors.gender} />}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={profileLoading || savingProfile || !hasProfileChanges} className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold gap-2 sm:w-auto">
                    {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Change Password */}
          <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
            <DialogTrigger asChild>
              <button className="group text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-glow transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Change Password</h3>
                <p className="text-xs text-muted-foreground mt-1">Update your security credentials</p>
              </button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card shadow-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-foreground">Change Password</DialogTitle>
                <DialogDescription>Verify your current password before setting a new one.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <PasswordField id="currentPassword" label="Current Password" value={currentPassword} show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} onChange={(v) => { setCurrentPassword(v.slice(0, 100)); setFieldErrors((p) => ({ ...p, currentPassword: "" })); }} autoComplete="current-password" placeholder="Enter current password" error={fieldErrors.currentPassword} />
                <div className="space-y-1.5">
                  <PasswordField id="newPassword" label="New Password" value={newPassword} show={showNew} onToggle={() => setShowNew((v) => !v)} onChange={(v) => { setNewPassword(v.slice(0, 100)); setFieldErrors((p) => ({ ...p, newPassword: "" })); }} autoComplete="new-password" placeholder="Min. 6 characters" error={fieldErrors.newPassword} />
                  {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
                </div>
                <PasswordField id="confirmPassword" label="Confirm Password" value={confirmPassword} show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} onChange={(v) => { setConfirmPassword(v.slice(0, 100)); setFieldErrors((p) => ({ ...p, confirmPassword: "" })); }} autoComplete="new-password" placeholder="Repeat new password" error={fieldErrors.confirmPassword} />
                <DialogFooter>
                  <Button type="submit" disabled={changingPw || !canSubmitPassword} className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold gap-2 sm:w-auto">
                    {changingPw ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : <><KeyRound className="w-4 h-4" />Update Password</>}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Upload shortcut */}
          <Link to="/upload" className="group text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-glow transition-all duration-300 block">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Upload Image</h3>
            <p className="text-xs text-muted-foreground mt-1">Add new images to your vault</p>
          </Link>

          {/* My Library */}
          <Link to="/?tab=my-library" className="group text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-glow transition-all duration-300 block">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">My Library</h3>
            <p className="text-xs text-muted-foreground mt-1">Browse your uploaded images</p>
          </Link>

          {/* Share Groups */}
          <Link to="/groups" className="group text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-glow transition-all duration-300 block">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Share Groups</h3>
            <p className="text-xs text-muted-foreground mt-1">Owned, joined & invites</p>
          </Link>
        </div>

        {/* Sign Out */}
        <section className="mt-6 rounded-xl border border-destructive/20 bg-card p-5 shadow-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Sign Out</h3>
              <p className="text-xs text-muted-foreground mt-0.5">End your current session and return to the login screen.</p>
            </div>
            <Button onClick={handleLogout} variant="destructive" size="sm" className="gap-2 font-semibold shrink-0">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="text-destructive text-xs flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  );
}

function PasswordField({ id, label, value, show, onToggle, onChange, placeholder, autoComplete, error }: {
  id: string; label: string; value: string; show: boolean; onToggle: () => void; onChange: (v: string) => void; placeholder: string; autoComplete: string; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground font-medium text-sm">{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground pr-10" autoComplete={autoComplete} maxLength={100} />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <InlineError message={error} />}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const levels = ["", "Weak", "Fair", "Good", "Strong"];
  const barColors = ["", "bg-destructive", "bg-yellow-500", "bg-blue-500", "bg-primary"];
  const textColors = ["", "text-destructive", "text-yellow-500", "text-blue-500", "text-primary"];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? barColors[score] : "bg-border"}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[score]}`}>{levels[score]}</p>
    </div>
  );
}
