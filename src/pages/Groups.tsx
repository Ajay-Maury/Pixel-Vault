import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users, Plus, Loader2, Mail, Inbox, Check, X as XIcon, Trash2,
  Pencil, ArrowRight, Crown, UserCheck, Clock, ShieldX, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createGroup, deleteGroup, listMyOwnedGroups, listMyJoinedGroups,
  listMyInvites, acceptInvite, rejectInvite, renameGroup,
  ShareGroup, GroupInvite, InviteStatus,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";

const NAME_MAX = 10;

type TabKey = "owned" | "joined" | "invites";
type InviteFilter = "all" | "pending" | "accepted" | "rejected";

interface GroupsProps {
  defaultTab?: TabKey;
}

function normalizeStatus(status: InviteStatus | string | undefined) {
  return String(status ?? "").trim().toLowerCase();
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const diff = Date.now() - d;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusBadge(status: InviteStatus | string | undefined) {
  const normalized = normalizeStatus(status);
  const map: Record<string, { cls: string; icon: JSX.Element; label: string }> = {
    pending:  { cls: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400", icon: <Clock className="w-3 h-3" />, label: "Pending" },
    accepted: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400", icon: <UserCheck className="w-3 h-3" />, label: "Accepted" },
    rejected: { cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <ShieldX className="w-3 h-3" />, label: "Rejected" },
  };
  const s = map[normalized] ?? {
    cls: "bg-muted text-muted-foreground border-border",
    icon: <Mail className="w-3 h-3" />,
    label: normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Unknown",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

export default function Groups({ defaultTab = "owned" }: GroupsProps) {
  const authed = isAuthenticated();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get("tab") as TabKey) || defaultTab;
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [owned, setOwned] = useState<ShareGroup[]>([]);
  const [joined, setJoined] = useState<ShareGroup[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>("all");

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameTarget, setRenameTarget] = useState<ShareGroup | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ShareGroup | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sync tab with URL (?tab=invites)
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabKey | null;
    if (urlTab && urlTab !== tab && ["owned", "joined", "invites"].includes(urlTab)) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleTabChange(v: string) {
    const next = v as TabKey;
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === defaultTab) params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  const refresh = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const [o, j, i] = await Promise.all([
        listMyOwnedGroups().catch(() => []),
        listMyJoinedGroups().catch(() => []),
        listMyInvites().catch(() => []),
      ]);
      setOwned(o);
      setJoined(j);
      setInvites(i);
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return toast.error("Group name required");
    if (name.length > NAME_MAX) return toast.error(`Max ${NAME_MAX} characters`);
    setCreating(true);
    try {
      await createGroup(name);
      toast.success("Group created");
      setNewName("");
      setShowCreate(false);
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return toast.error("Group name required");
    if (name.length > NAME_MAX) return toast.error(`Max ${NAME_MAX} characters`);
    setActionLoading("rename");
    try {
      await renameGroup(renameTarget.id, name);
      toast.success("Group renamed");
      setRenameTarget(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to rename");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading("delete");
    try {
      await deleteGroup(deleteTarget.id);
      toast.success("Group deleted");
      setDeleteTarget(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(invite: GroupInvite) {
    setActionLoading(invite.id);
    try {
      await acceptInvite(invite.id);
      toast.success(`Joined "${invite.group.name}"`);
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to accept");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(invite: GroupInvite) {
    setActionLoading(invite.id);
    try {
      await rejectInvite(invite.id);
      toast.success("Invite rejected");
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = invites.filter((i) => normalizeStatus(i.status) === "pending").length;

  const filteredInvites = useMemo(() => {
    if (inviteFilter === "all") return invites;
    return invites.filter((i) => normalizeStatus(i.status) === inviteFilter);
  }, [invites, inviteFilter]);

  if (!authed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Sign in to manage share groups.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary flex-shrink-0" />
            {tab === "invites" ? "My Invites" : "Share Groups"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tab === "invites"
              ? "Track invites you've received and jump into shared groups."
              : "Create groups, invite users, and share selected images privately."}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> New Group
        </Button>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mb-6 bg-muted border border-border h-auto p-1 gap-1 flex flex-wrap w-full sm:w-auto">
          <TabsTrigger value="owned" className="gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md text-muted-foreground font-medium text-xs sm:text-sm">
            <Crown className="w-3.5 h-3.5" /> Owned <span className="text-xs opacity-70">({owned.length})</span>
          </TabsTrigger>
          <TabsTrigger value="joined" className="gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md text-muted-foreground font-medium text-xs sm:text-sm">
            <UserCheck className="w-3.5 h-3.5" /> Joined <span className="text-xs opacity-70">({joined.length})</span>
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2 px-3 sm:px-4 py-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md text-muted-foreground font-medium text-xs sm:text-sm">
            <Inbox className="w-3.5 h-3.5" /> Invites
            {pendingCount > 0 && (
              <span className="text-xs ml-0.5 px-1.5 rounded-full bg-destructive text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        <TabsContent value="owned">
          {!loading && owned.length === 0 ? (
            <EmptyState
              icon={<Crown className="w-10 h-10" />}
              title="No groups yet"
              description="Create a group to share selected images with friends."
              cta={<Button onClick={() => setShowCreate(true)} className="bg-gradient-gold text-primary-foreground gap-2"><Plus className="w-4 h-4" /> Create Group</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {owned.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  role="owner"
                  onRename={() => { setRenameTarget(g); setRenameValue(g.name); }}
                  onDelete={() => setDeleteTarget(g)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="joined">
          {!loading && joined.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="w-10 h-10" />}
              title="No joined groups"
              description="Accept an invite to start viewing shared images."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joined.map((g) => <GroupCard key={g.id} group={g} role="member" />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites">
          {!loading && invites.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap" role="tablist" aria-label="Filter invites">
              <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Filter
              </span>
              {(["all", "pending", "accepted", "rejected"] as InviteFilter[]).map((f) => {
                const active = inviteFilter === f;
                const count = f === "all" ? invites.length : invites.filter((i) => normalizeStatus(i.status) === f).length;
                return (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setInviteFilter(f)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-gradient-gold text-primary-foreground border-transparent shadow-glow"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && filteredInvites.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-10 h-10" />}
              title={invites.length === 0 ? "No invites" : "Nothing here"}
              description={
                invites.length === 0
                  ? "You'll see group invites here as soon as someone shares with you."
                  : "No invites match this filter."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredInvites.map((inv) => {
                const status = normalizeStatus(inv.status);
                const inviterEmail = (inv as any).inviter?.email || inv.group.ownerEmail;
                return (
                  <div
                    key={inv.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 bg-card border border-border rounded-xl ${
                      status === "rejected" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{inv.group.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          {statusBadge(inv.status)}
                          {inviterEmail && <span className="truncate">from {inviterEmail}</span>}
                          {inv.invitedAt && <span title={new Date(inv.invitedAt).toLocaleString()}>· {timeAgo(inv.invitedAt)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                      {status === "pending" ? (
                        <>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => handleReject(inv)}
                            disabled={actionLoading === inv.id}
                            className="border-border gap-1.5 flex-1 sm:flex-none"
                          ><XIcon className="w-3.5 h-3.5" /> Reject</Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(inv)}
                            disabled={actionLoading === inv.id}
                            className="bg-gradient-gold text-primary-foreground gap-1.5 flex-1 sm:flex-none"
                          >
                            {actionLoading === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Accept
                          </Button>
                        </>
                      ) : status === "accepted" ? (
                        <Link to={`/groups/${inv.group.id}`} className="w-full sm:w-auto">
                          <Button size="sm" className="bg-gradient-gold text-primary-foreground gap-1.5 w-full">
                            Open group <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground px-2 py-1">Hidden</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create group */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create share group</DialogTitle>
            <DialogDescription>
              Group names are unique to you and limited to {NAME_MAX} characters.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, NAME_MAX))}
            placeholder="e.g. friends"
            maxLength={NAME_MAX}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          />
          <div className="text-xs text-muted-foreground text-right">{newName.length}/{NAME_MAX}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-gold text-primary-foreground gap-2">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value.slice(0, NAME_MAX))}
            maxLength={NAME_MAX}
            autoFocus
          />
          <div className="text-xs text-muted-foreground text-right">{renameValue.length}/{NAME_MAX}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={actionLoading === "rename"} className="bg-gradient-gold text-primary-foreground gap-2">
              {actionLoading === "rename" && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              All members will lose access. Images themselves are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {actionLoading === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupCard({
  group, role, onRename, onDelete,
}: {
  group: ShareGroup;
  role: "owner" | "member";
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group relative p-5 bg-card border border-border rounded-xl shadow-card hover:shadow-image transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              {role === "owner" ? "Owner" : "Member"}
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-foreground truncate">{group.name}</h3>
        </div>
        {role === "owner" && (
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={onRename} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted" title="Rename" aria-label="Rename group">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete" aria-label="Delete group">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
        {group.memberCount != null && <span>{group.memberCount} members</span>}
        {group.imageCount != null && <span>· {group.imageCount} images</span>}
      </div>
      <Link to={`/groups/${group.id}`}>
        <Button variant="outline" className="w-full border-border gap-2 justify-center">
          Open <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

function EmptyState({ icon, title, description, cta }: { icon: JSX.Element; title: string; description: string; cta?: JSX.Element }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <p className="text-foreground font-medium text-lg mb-1">{title}</p>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      {cta}
    </div>
  );
}
