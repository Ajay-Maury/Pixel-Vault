import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  Info,
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
  /** Optional friendly note used when no target can be found (e.g. mobile hides desktop nav). */
  fallbackNote?: string;
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
    fallbackNote: "The Gallery link lives in the top navigation. On smaller screens, tap the PixelVault logo to return here anytime.",
  },
  {
    icon: UploadIcon,
    title: "Upload with a click",
    body: "Drag & drop or pick files, add metadata, and set visibility to public or private. Bulk actions let you toggle visibility or delete many at once.",
    targets: ['[data-tour="upload-link"]', '[data-tour="upload-link-mobile"]'],
    cta: { label: "Try upload", to: "/upload" },
    fallbackNote: "Open Upload from the top navigation whenever you're ready to add images.",
  },
  {
    icon: Users,
    title: "Share Groups",
    body: "Create a group, invite people by email, and share selected images with them. Members can view and download — only you can add or remove content.",
    targets: ['[data-tour="groups-link"]', '[data-tour="invites-link-mobile"]'],
    cta: { label: "See groups", to: "/groups" },
    fallbackNote: "Head to Groups from the navigation bar to create or join a shared album.",
  },
  {
    icon: Mail,
    title: "Invites",
    body: "When someone invites you, a badge appears in the navbar. Head to Invites to accept, reject, or jump straight into a shared group.",
    targets: ['[data-tour="invites-link"]', '[data-tour="invites-link-mobile"]', '[data-tour="groups-link"]'],
    fallbackNote: "You'll see an Invites badge in the navbar whenever there are pending invitations.",
  },
  {
    icon: Sun,
    title: "Theme & Account",
    body: "Toggle light/dark from the top bar. Manage your profile, change password, sign out, or restart this tour from the Account page.",
    targets: ['[data-tour="account-link"]', '[data-tour="theme-toggle"]'],
    cta: { label: "Open profile", to: "/profile" },
    fallbackNote: "The theme toggle and Account link sit at the top-right of the navigation bar.",
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
  const [targetMissing, setTargetMissing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

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
  const isLast = step === STEPS.length - 1;

  const close = useCallback(() => {
    markWalkthroughSeen();
    setRect(null);
    setTargetMissing(false);
    setOpen(false);
  }, []);

  const next = useCallback(() => {
    if (isLast) {
      close();
      return;
    }
    setStep((s) => s + 1);
  }, [isLast, close]);

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

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
    if (found) {
      setRect(found.rect);
      setTargetMissing(false);
      found.el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    } else {
      setRect(null);
      // Only mark missing if this step actually expects a target
      setTargetMissing(Boolean(current.targets && current.targets.length));
    }
  }, [open, current.targets]);

  // Recompute highlight after render / route change / resize / scroll.
  // Retry a few times because target components may mount slightly after navigation.
  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const timers: number[] = [];
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRect);
    };
    run();
    // Retry for late-mounting targets
    [100, 300, 700, 1200].forEach((ms) => {
      timers.push(window.setTimeout(run, ms));
    });
    window.addEventListener("resize", run);
    window.addEventListener("scroll", run, true);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", run);
      window.removeEventListener("scroll", run, true);
    };
  }, [open, step, location.pathname, updateRect]);

  // Focus management + focus trap + keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move initial focus into the dialog
    const focusTimer = window.setTimeout(() => {
      nextBtnRef.current?.focus();
    }, 50);

    const getFocusable = (): HTMLElement[] => {
      const root = cardRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
        return;
      }
      if (e.key === "Tab") {
        const items = getFocusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !cardRef.current?.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, close, next, prev]);

  if (!open) return null;

  const Icon = current.icon;

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
      aria-describedby="pv-walkthrough-body"
      className="fixed inset-0 z-[100] animate-fade-in"
    >
      {/* Live region for step announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Step {step + 1} of {STEPS.length}: {current.title}
        {targetMissing ? ". Highlighted element is not visible on this screen." : ""}
      </div>

      {/* Backdrop with optional spotlight cutout */}
      <div
        aria-hidden="true"
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
          role="presentation"
          aria-hidden="true"
          aria-label={`Highlighting: ${current.title}`}
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
          ref={cardRef}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        >
          <button
            onClick={close}
            aria-label="Close walkthrough"
            className="absolute right-3 top-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-4 pr-8">
              <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-glow shrink-0" aria-hidden="true">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Step {step + 1} of {STEPS.length}
              </span>
            </div>

            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h2
                id="pv-walkthrough-title"
                className="font-display text-lg sm:text-2xl font-bold text-foreground leading-tight pt-1 break-words"
              >
                {current.title}
              </h2>
            </div>

            <p id="pv-walkthrough-body" className="text-sm text-muted-foreground leading-relaxed break-words">
              {current.body}
            </p>

            {/* Fallback note when target isn't found on this device/screen */}
            {targetMissing && (
              <div
                role="note"
                className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
              >
                <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span>
                  {current.fallbackNote ??
                    "We couldn't locate this element on the current screen — you can continue the tour and find it later in the navigation."}
                </span>
              </div>
            )}

            {/* Progress dots */}
            <div
              className="flex items-center gap-1.5 mt-5 flex-wrap"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={step + 1}
              aria-label={`Walkthrough progress: step ${step + 1} of ${STEPS.length}`}
            >
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground" aria-label="Skip walkthrough">
                  Skip tour
                </Button>
                {step > 0 && (
                  <Button variant="outline" size="sm" onClick={prev} className="gap-1" aria-label="Previous step">
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
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
                  ref={nextBtnRef}
                  size="sm"
                  onClick={next}
                  className="gap-1 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold"
                  aria-label={isLast ? "Finish walkthrough" : "Next step"}
                >
                  {isLast ? (
                    <>
                      <UserCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      Get started
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="sr-only">
              Use left and right arrow keys to navigate between steps. Press Escape to close.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
