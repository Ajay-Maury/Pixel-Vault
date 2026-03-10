import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  PencilLine,
  Save,
  Sparkles,
  User,
  UserRound,
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
import { getProfile, searchImages, changePassword, updateProfile, type ProfileRecord } from "@/lib/api";
import { getToken, removeToken } from "@/lib/auth";
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
  };
}

function getGenderMeta(gender?: string | null) {
  const normalized = gender?.toUpperCase();
  if (normalized === "FEMALE") {
    return {
      label: "Female",
      icon: Accessibility,
      badgeClass: "bg-rose-500/12 text-rose-300 border-rose-400/20",
    };
  }
  if (normalized === "MALE") {
    return {
      label: "Male",
      icon: UserRound,
      badgeClass: "bg-sky-500/12 text-sky-300 border-sky-400/20",
    };
  }
  return {
    label: normalized ? "Other" : "Not set",
    icon: User,
    badgeClass: "bg-muted text-muted-foreground border-border",
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const token = getToken();

  const [uploadCount, setUploadCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
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
        localStorage.setItem("userEmail", nextProfile.email);
        if (nextProfile.id) {
          localStorage.setItem("userId", nextProfile.id);
        }
      } catch {
        if (mounted) toast.error("Unable to load your profile");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    async function loadUploads() {
      setLoadingCount(true);
      try {
        const res = await searchImages("", 1, 0, true);
        if (mounted) setUploadCount(res.totalCount ?? 0);
      } catch {
        if (mounted) setUploadCount(0);
      } finally {
        if (mounted) setLoadingCount(false);
      }
    }

    void loadProfile();
    void loadUploads();

    return () => {
      mounted = false;
    };
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
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setProfileErrors(errors);
      return;
    }

    setSavingProfile(true);
    try {
      const response = await updateProfile(result.data);
      const nextProfile = extractProfile(response) ?? {
        ...profile,
        ...result.data,
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase mb-2">Profile</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your identity, preferences, and account security.</p>
        </div>
        <Link to="/?tab=my-library">
          <Button variant="outline" className="border-border text-foreground hover:bg-muted gap-2">
            <ImageIcon className="w-4 h-4" />
            Open My Library
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="absolute inset-x-0 top-0 h-[56%] bg-gradient-gold opacity-60" />
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-background/90 shadow-glow ring-1 ring-white/10">
                  <genderMeta.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="pt-1">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${genderMeta.badgeClass}`}>
                    <genderMeta.icon className="w-3.5 h-3.5" />
                    {genderMeta.label}
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-4">{displayName}</h2>
                  <p className="text-muted-foreground flex items-center gap-2 mt-2">
                    <Mail className="w-4 h-4" />
                    {profileLoading ? "Loading email..." : (profile?.email || "No email")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-64">
                <StatCard
                  icon={<ImageIcon className="w-4 h-4" />}
                  label="Uploads"
                  value={loadingCount ? "—" : String(uploadCount ?? 0)}
                  loading={loadingCount}
                />
                <StatCard
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Status"
                  value="Active"
                  subValue="member"
                />
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <InfoChip label="First Name" value={profileLoading ? "Loading..." : (profile?.firstName || "—")} />
              <InfoChip label="Last Name" value={profileLoading ? "Loading..." : (profile?.lastName || "—")} />
              <InfoChip label="Gender" value={profileLoading ? "Loading..." : genderMeta.label} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2 xl:col-span-2">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <PencilLine className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Update Profile</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Open a modal to edit your account details.</p>
            <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold gap-2">
                  <PencilLine className="w-4 h-4" />
                  Update Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-card shadow-card sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl text-foreground">Update Profile</DialogTitle>
                  <DialogDescription>Change your profile information and sync it with the backend.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-foreground font-medium text-sm">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setProfileErrors((prev) => ({ ...prev, firstName: "" }));
                      }}
                      placeholder="Enter your first name"
                      className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground"
                      disabled={profileLoading || savingProfile}
                    />
                    {profileErrors.firstName && <InlineError message={profileErrors.firstName} />}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-foreground font-medium text-sm">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setProfileErrors((prev) => ({ ...prev, lastName: "" }));
                      }}
                      placeholder="Enter your last name"
                      className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground"
                      disabled={profileLoading || savingProfile}
                    />
                    {profileErrors.lastName && <InlineError message={profileErrors.lastName} />}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-foreground font-medium text-sm">Email</Label>
                    <Input
                      id="email"
                      value={profile?.email ?? ""}
                      className="bg-muted border-border text-muted-foreground h-11"
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-foreground font-medium text-sm">Gender</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => {
                        setGender(e.target.value as "MALE" | "FEMALE" | "OTHER");
                        setProfileErrors((prev) => ({ ...prev, gender: "" }));
                      }}
                      className="h-11 w-full rounded-md border border-border bg-muted px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={profileLoading || savingProfile}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                    {profileErrors.gender && <InlineError message={profileErrors.gender} />}
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={profileLoading || savingProfile || !hasProfileChanges}
                      className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold gap-2 sm:w-auto"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Reset Password</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Open a modal to verify your current password and set a new one.</p>
            <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold gap-2">
                  <KeyRound className="w-4 h-4" />
                  Reset Password
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-card shadow-card sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl text-foreground">Reset Password</DialogTitle>
                  <DialogDescription>Verify your current password before saving the new one.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <PasswordField
                    id="currentPassword"
                    label="Current Password"
                    value={currentPassword}
                    show={showCurrent}
                    onToggle={() => setShowCurrent((v) => !v)}
                    onChange={(value) => {
                      setCurrentPassword(value.slice(0, 100));
                      setFieldErrors((p) => ({ ...p, currentPassword: "" }));
                    }}
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    error={fieldErrors.currentPassword}
                  />

                  <div className="space-y-1.5">
                    <PasswordField
                      id="newPassword"
                      label="New Password"
                      value={newPassword}
                      show={showNew}
                      onToggle={() => setShowNew((v) => !v)}
                      onChange={(value) => {
                        setNewPassword(value.slice(0, 100));
                        setFieldErrors((p) => ({ ...p, newPassword: "" }));
                      }}
                      autoComplete="new-password"
                      placeholder="Min. 6 characters"
                      error={fieldErrors.newPassword}
                    />
                    {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
                  </div>

                  <PasswordField
                    id="confirmPassword"
                    label="Confirm New Password"
                    value={confirmPassword}
                    show={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                    onChange={(value) => {
                      setConfirmPassword(value.slice(0, 100));
                      setFieldErrors((p) => ({ ...p, confirmPassword: "" }));
                    }}
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    error={fieldErrors.confirmPassword}
                  />

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={changingPw || !canSubmitPassword}
                      className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold gap-2 sm:w-auto"
                    >
                      {changingPw ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          Reset Password
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 xl:col-span-2">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Upload</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Jump straight to the upload flow from here.</p>
            <Link to="/upload" className="block">
              <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted gap-2">
                <ImageIcon className="w-4 h-4" />
                Open Upload Page
              </Button>
            </Link>
          </section>

          <section className="rounded-3xl border border-destructive/30 bg-card p-6 shadow-card">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Sign out</h3>
                <p className="text-sm text-muted-foreground">
                  End the current session and return to the login screen.
                </p>
              </div>

              <Button onClick={handleLogout} variant="destructive" className="w-full gap-2 font-semibold">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, loading }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
        {icon}
        {label}
      </div>
      {loading ? (
        <div className="h-5 w-16 rounded bg-border animate-pulse" />
      ) : (
        <div className="font-semibold text-lg text-foreground">
          {value}
          {subValue && <span className="ml-1 text-sm font-normal text-muted-foreground">{subValue}</span>}
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-foreground font-medium mt-1">{value}</p>
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

function PasswordField({
  id,
  label,
  value,
  show,
  onToggle,
  onChange,
  placeholder,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground font-medium text-sm">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-muted border-border focus:border-primary h-11 text-foreground placeholder:text-muted-foreground pr-10"
          autoComplete={autoComplete}
          maxLength={100}
        />
        <ToggleVisible show={show} toggle={onToggle} />
      </div>
      {error && <InlineError message={error} />}
    </div>
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
