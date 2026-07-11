import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Camera,
  Image as ImageIcon,
  Upload as UploadIcon,
  Users,
  Mail,
  UserCircle,
  Sun,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";

const STORAGE_KEY = "pv-walkthrough-seen-v1";

export function hasSeenWalkthrough() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWalkthroughSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetWalkthrough() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("pv:walkthrough:start"));
}

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  /** Route to be on when the step renders. If mismatched, we navigate before highlighting. */
  route?: string;
  /** Selectors tried in order; first match is highlighted. */
  targets?: string[];
  cta?: { label: string; to: string };
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to PixelVault",
    body: "Your private, editorial-grade image vault. This quick tour takes under a minute — you can skip anytime.",
  },
  {
    icon: ImageIcon,
    title: "Your Gallery",
    body: "Browse your uploads and public images from the community. Use the search bar and tabs to filter by public, private, or your library.",
    route: "/",
    targets: ['[data-tour="gallery-link"]'],
  },
  {
    icon: UploadIcon,
    title: "Upload with a click",
    body: "Drag & drop or pick files, add metadata, and set visibility to public or private. Bulk actions let you toggle visibility or delete many at once.",
    targets: ['[data-tour="upload-link"]', '[data-tour="upload-link-mobile"]'],
    cta: { label: "Try upload", to: "/upload" },
  },
  {
    icon: Users,
    title: "Share Groups",
    body: "Create a group, invite people by email, and share selected images with them. Members can view and download — only you can add or remove content.",
    targets: ['[data-tour="groups-link"]', '[data-tour="invites-link-mobile"]'],
    cta: { label: "See groups", to: "/groups" },
  },
  {
    icon: Mail,
    title: "Invites",
    body: "When someone invites you, a badge appears in the navbar. Head to Invites to accept, reject, or jump straight into a shared group.",
    targets: ['[data-tour="invites-link"]', '[data-tour="invites-link-mobile"]', '[data-tour="groups-link"]'],
  },
  {
    icon: Sun,
    title: "Theme & Account",
    body: "Toggle light/dark from the top bar. Manage your profile, change password, sign out, or restart this tour from the Account page.",
    targets: ['[data-tour="account-link"]', '[data-tour="theme-toggle"]'],
    cta: { label: "Open profile", to: "/profile" },
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function findRect(selectors?: string[]): { rect: Rect; el: HTMLElement } | null {
  if (!selectors) return null;
  for (const s of selectors) {
    const el = document.querySelector(s) as HTMLElement | null;
    if (el && el.offsetParent !== null) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return {
          el,
          rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        };
      }
    }
  }
  return null;
}

export default function Walkthrough() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-launch for a new device once authed
  useEffect(() => {
    if (!isAuthenticated()) return;
    if (["/login", "/register"].includes(location.pathname)) return;
    if (!hasSeenWalkthrough()) {
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  // Manual restart
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("pv:walkthrough:start", handler);
    return () => window.removeEventListener("pv:walkthrough:start", handler);
  }, []);

  const current = STEPS[step];

  // Navigate to the step's route if needed
  useEffect(() => {
    if (!open) return;
    if (current.route && location.pathname !== current.route) {
      navigate(current.route);
    }
  }, [open, step, current.route, location.pathname, navigate]);

  const updateRect = useCallback(() => {
    if (!open) return;
    const found = findRect(current.targets);
    setRect(found?.rect ?? null);
    if (found?.el) {
      found.el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }, [open, current.targets]);

  // Recompute highlight after render / route change / resize / scroll
  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRect);
    };
    run();
    // give the route a beat to mount
    const t = setTimeout(run, 150);
    window.addEventListener("resize", run);
    window.addEventListener("scroll", run, true);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", run);
      window.removeEventListener("scroll", run, true);
    };
  }, [open, step, location.pathname, updateRect]);

  if (!open) return null;

  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const close = () => {
    markWalkthroughSeen();
    setRect(null);
    setOpen(false);
  };

  const next = () => {
    if (isLast) return close();
    setStep((s) => s + 1);
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  // Spotlight geometry (with padding)
  const pad = 6;
  const spot = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pv-walkthrough-title"
      className="fixed inset-0 z-[100] animate-fade-in"
    >
      {/* Backdrop with optional spotlight cutout */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        style={
          spot
            ? {
                clipPath: `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${spot.left}px ${spot.top}px,
                  ${spot.left}px ${spot.top + spot.height}px,
                  ${spot.left + spot.width}px ${spot.top + spot.height}px,
                  ${spot.left + spot.width}px ${spot.top}px,
                  ${spot.left}px ${spot.top}px
                )`,
              }
            : undefined
        }
        onClick={close}
      />

      {/* Highlight ring */}
      {spot && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary shadow-glow transition-all duration-300"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      )}

      {/* Card */}
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        >
          <button
            onClick={close}
            aria-label="Close walkthrough"
            className="absolute right-3 top-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-4 pr-8">
              <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-glow shrink-0">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Step {step + 1} of {STEPS.length}
              </span>
            </div>

            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h2
                id="pv-walkthrough-title"
                className="font-display text-lg sm:text-2xl font-bold text-foreground leading-tight pt-1 break-words"
              >
                {current.title}
              </h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed break-words">
              {current.body}
            </p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mt-5 flex-wrap">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground">
                  Skip tour
                </Button>
                {step > 0 && (
                  <Button variant="outline" size="sm" onClick={prev} className="gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {current.cta && !isLast && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate(current.cta!.to);
                      next();
                    }}
                  >
                    {current.cta.label}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={next}
                  className="gap-1 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold"
                >
                  {isLast ? (
                    <>
                      <UserCircle className="w-3.5 h-3.5" />
                      Get started
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
