import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Image as ImageIcon, BarChart3, Plus, Loader2, Mail,
  Check, X as XIcon, Trash2, UserPlus, Search, Download, ImageOff,
  Pencil, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getGroup, getGroupImages, addImagesToGroup, removeImagesFromGroup,
  inviteToGroup, removeGroupMember, recordGroupDownload, renameGroup,
  getGroupDownloadsSummary, listGroupDownloads, searchUsers, searchImages,
  ShareGroup, GroupMember, ImageRecord, DownloadRecord, DownloadsSummary, UserLite,
} from "@/lib/api";
import { getUserId } from "@/lib/auth";
import { toast } from "sonner";
import ImageDetailModal from "@/components/ImageDetailModal";

const NAME_MAX = 10;

function statusPill(status: string) {
  const cls =
    status === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
    : status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{status}</span>;
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = getUserId();
  const [group, setGroup] = useState<(ShareGroup & { members?: GroupMember[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const isOwner = group?.ownerId ? group.ownerId === userId : group?.role === "owner";

  const refreshGroup = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const g = await getGroup(id);
      setGroup(g);
    } catch (e: any) {
      if (e?.response?.status === 403 || e?.response?.status === 404) setForbidden(true);
      else toast.error("Failed to load group");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refreshGroup(); }, [refreshGroup]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (forbidden || !group || !id) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-foreground font-medium mb-2">Group not available</p>
        <p className="text-muted-foreground text-sm mb-4">You don't have access, or this group no longer exists.</p>
        <Link to="/groups"><Button variant="outline">Back to groups</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <GroupHeader
        group={group}
        isOwner={!!isOwner}
        onRenamed={refreshGroup}
        onDeleted={() => navigate("/groups")}
      />

      <Tabs defaultValue="images" className="mt-6">
        <TabsList className="bg-muted border border-border h-auto p-1 gap-1">
          <TabsTrigger value="images" className="gap-2 px-4 py-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-md text-muted-foreground font-medium">
            <ImageIcon className="w-3.5 h-3.5" /> Images
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 px-4 py-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-md text-muted-foreground font-medium">
            <Users className="w-3.5 h-3.5" /> Members
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="analytics" className="gap-2 px-4 py-2 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-md text-muted-foreground font-medium">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="images" className="mt-6">
          <ImagesTab groupId={id} isOwner={!!isOwner} />
        </TabsContent>
        <TabsContent value="members" className="mt-6">
          <MembersTab groupId={id} group={group} isOwner={!!isOwner} onChanged={refreshGroup} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab groupId={id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── Header ──
function GroupHeader({ group, isOwner, onRenamed, onDeleted }: {
  group: ShareGroup; isOwner: boolean; onRenamed: () => void; onDeleted: () => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleRename() {
    const v = name.trim();
    if (!v) return toast.error("Name required");
    setSaving(true);
    try {
      await renameGroup(group.id, v);
      toast.success("Renamed");
      setRenameOpen(false);
      onRenamed();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    } finally { setSaving(false); }
  }
  async function handleDelete() {
    setSaving(true);
    try {
      const { deleteGroup } = await import("@/lib/api");
      await deleteGroup(group.id);
      toast.success("Group deleted");
      onDeleted();
    } catch { toast.error("Failed to delete"); }
    finally { setSaving(false); setDeleteOpen(false); }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <Link to="/groups" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-primary font-medium uppercase tracking-wider mb-1">
            {isOwner ? <><Crown className="w-3 h-3" /> Owner</> : "Member"}
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">{group.name}</h1>
        </div>
      </div>
      {isOwner && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setName(group.name); setRenameOpen(true); }} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Rename
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename group</DialogTitle></DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))} maxLength={NAME_MAX} autoFocus />
          <div className="text-xs text-muted-foreground text-right">{name.length}/{NAME_MAX}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={saving} className="bg-gradient-gold text-primary-foreground gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
            <AlertDialogDescription>All members lose access. Images themselves are not deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Images Tab ──
function ImagesTab({ groupId, isOwner }: { groupId: string; isOwner: boolean }) {
  const [items, setItems] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const LIMIT = 12;
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [openImage, setOpenImage] = useState<ImageRecord | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getGroupImages(groupId, { searchText: debounced, limit: LIMIT, offset: page * LIMIT });
      setItems(r.data || []);
      setTotal(r.totalCount || 0);
    } catch { toast.error("Failed to load images"); }
    finally { setLoading(false); }
  }, [groupId, debounced, page]);

  useEffect(() => { refresh(); }, [refresh]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function clearSelection() { setSelected(new Set()); }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeImagesFromGroup(groupId, Array.from(selected));
      toast.success(`Removed ${selected.size} image${selected.size > 1 ? "s" : ""}`);
      clearSelection();
      refresh();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to remove"); }
    finally { setRemoving(false); }
  }

  async function handleDownload(img: ImageRecord) {
    setDownloading(img.id);
    try {
      const r = await recordGroupDownload(groupId, img.id);
      const url = r.downloadUrl || r.url || img.image_url;
      const a = document.createElement("a");
      a.href = url; a.download = img.title || "image"; a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); a.remove();
      toast.success("Download started");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to download"); }
    finally { setDownloading(null); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shared images..." className="pl-9" />
        </div>
        {isOwner && (
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-gold text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Add Images
          </Button>
        )}
      </div>

      {isOwner && selected.size > 0 && (
        <div className="sticky top-16 z-30 flex items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-card">
          <div className="text-sm text-foreground font-medium">{selected.size} selected</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clearSelection}>Clear</Button>
            <Button size="sm" onClick={handleRemove} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageOff className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No images in this group</p>
          <p className="text-muted-foreground text-sm mt-1">{isOwner ? "Click 'Add Images' to share some." : "The owner hasn't shared any yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((img) => (
            <div key={img.id} className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-image transition-all">
              {isOwner && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(img.id); }}
                  className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md bg-card/90 border border-border flex items-center justify-center"
                  aria-label="Select"
                >
                  <Checkbox checked={selected.has(img.id)} className="pointer-events-none" />
                </button>
              )}
              <button onClick={() => setOpenImage(img)} className="block w-full aspect-square overflow-hidden">
                <img src={img.image_url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              </button>
              <div className="p-2.5">
                <div className="text-sm font-medium text-foreground truncate">{img.title}</div>
                <div className="mt-1.5 flex justify-end">
                  <button
                    onClick={() => handleDownload(img)}
                    disabled={downloading === img.id}
                    className="p-1.5 rounded-md bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Download"
                  >
                    {downloading === img.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</Button>
          <span className="text-sm text-muted-foreground px-3">Page {page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next</Button>
        </div>
      )}

      {showAdd && isOwner && (
        <AddImagesDialog groupId={groupId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); refresh(); }} />
      )}

      {openImage && (
        <ImageDetailModal
          image={openImage}
          onClose={() => setOpenImage(null)}
          groupContext={{ groupId, canEdit: false, onDownload: () => handleDownload(openImage) }}
        />
      )}
    </div>
  );
}

// ── Add images dialog (picks from owner's library) ──
function AddImagesDialog({ groupId, onClose, onAdded }: { groupId: string; onClose: () => void; onAdded: () => void }) {
  const [items, setItems] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const LIMIT = 12;

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    searchImages(debounced, LIMIT, page * LIMIT, true)
      .then((r) => { setItems(r.data || []); setTotal(r.totalCount || 0); })
      .catch(() => toast.error("Failed to load library"))
      .finally(() => setLoading(false));
  }, [debounced, page]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await addImagesToGroup(groupId, Array.from(selected));
      toast.success(`Added ${selected.size} image${selected.size > 1 ? "s" : ""}`);
      onAdded();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to add"); }
    finally { setSaving(false); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add images to group</DialogTitle>
          <DialogDescription>Pick images from your library to share with this group.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library..." className="pl-9" />
        </div>
        <div className="min-h-[300px] max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No images found</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((img) => {
                const isSel = selected.has(img.id);
                return (
                  <button
                    key={img.id}
                    onClick={() => toggle(img.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSel ? "border-primary shadow-glow" : "border-border hover:border-primary/40"}`}
                  >
                    <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                    {isSel && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Prev</Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        )}
        <DialogFooter>
          <span className="text-sm text-muted-foreground mr-auto">{selected.size} selected</span>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || selected.size === 0} className="bg-gradient-gold text-primary-foreground gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add {selected.size > 0 ? selected.size : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Members Tab ──
function MembersTab({ groupId, group, isOwner, onChanged }: {
  groupId: string; group: ShareGroup & { members?: GroupMember[] }; isOwner: boolean; onChanged: () => void;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const members = group.members || [];

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    try {
      await removeGroupMember(groupId, memberId);
      toast.success("Member removed");
      onChanged();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to remove"); }
    finally { setRemovingId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</div>
        {isOwner && (
          <Button onClick={() => setShowInvite(true)} className="bg-gradient-gold text-primary-foreground gap-2">
            <UserPlus className="w-4 h-4" /> Invite Users
          </Button>
        )}
      </div>
      {members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {isOwner ? "No members yet. Invite someone to get started." : "No other members."}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {(m.firstName?.[0] || m.email?.[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {m.firstName || m.lastName ? `${m.firstName || ""} ${m.lastName || ""}`.trim() : m.email}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {statusPill(m.status)}
                {isOwner && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={removingId === m.id}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove"
                  >
                    {removingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && isOwner && (
        <InviteDialog groupId={groupId} onClose={() => setShowInvite(false)} onInvited={() => { setShowInvite(false); onChanged(); }} />
      )}
    </div>
  );
}

// ── Invite dialog with autocomplete ──
function InviteDialog({ groupId, onClose, onInvited }: { groupId: string; onClose: () => void; onInvited: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      searchUsers(query.trim())
        .then((r) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function addEmail(email: string) {
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Invalid email");
      return;
    }
    if (chips.includes(e)) return;
    setChips([...chips, e]);
    setQuery("");
    setResults([]);
  }

  function removeChip(e: string) {
    setChips(chips.filter((c) => c !== e));
  }

  async function handleSend() {
    if (chips.length === 0) return toast.error("Add at least one email");
    setSending(true);
    try {
      await inviteToGroup(groupId, chips);
      toast.success(`Invited ${chips.length} user${chips.length > 1 ? "s" : ""}`);
      onInvited();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to invite"); }
    finally { setSending(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite users</DialogTitle>
          <DialogDescription>Search registered users or enter an email directly.</DialogDescription>
        </DialogHeader>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((e) => (
              <span key={e} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-sm">
                <Mail className="w-3 h-3 text-muted-foreground" />
                {e}
                <button onClick={() => removeChip(e)} className="text-muted-foreground hover:text-destructive">
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(query); } }}
            placeholder="Type a name or email…"
            autoFocus
          />
          {(searching || results.length > 0) && query.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-image max-h-64 overflow-y-auto">
              {searching ? (
                <div className="p-3 text-center text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </div>
              ) : (
                results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => addEmail(u.email)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">
                        {u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : u.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Press Enter to add an email manually.</p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || chips.length === 0} className="bg-gradient-gold text-primary-foreground gap-2">
            {sending && <Loader2 className="w-4 h-4 animate-spin" />} Send {chips.length > 0 ? chips.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Analytics Tab ──
function AnalyticsTab({ groupId }: { groupId: string }) {
  const [summary, setSummary] = useState<DownloadsSummary | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getGroupDownloadsSummary(groupId).catch(() => null),
      listGroupDownloads(groupId, LIMIT, page * LIMIT).catch(() => ({ data: [], totalCount: 0 })),
    ]).then(([s, d]) => {
      setSummary(s);
      setDownloads(d.data);
      setTotal(d.totalCount);
    }).finally(() => setLoading(false));
  }, [groupId, page]);

  const totalPages = Math.ceil(total / LIMIT);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Downloads" value={summary.totalDownloads ?? 0} />
          {summary.uniqueUsers != null && <StatCard label="Unique Users" value={summary.uniqueUsers} />}
          {Array.isArray(summary.topImages) && <StatCard label="Top Image" value={summary.topImages[0]?.title || summary.topImages[0]?.imageId || "—"} small />}
        </div>
      )}

      {Array.isArray(summary?.topImages) && summary!.topImages!.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wider">Top Images</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summary!.topImages!.slice(0, 4).map((t, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3">
                {t.imageUrl && <img src={t.imageUrl} className="w-full h-24 object-cover rounded mb-2" alt="" />}
                <div className="text-sm font-medium text-foreground truncate">{t.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground">{t.count} downloads</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wider">Download History</h3>
        {downloads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border rounded-lg">No downloads yet</div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Image</th>
                  <th className="px-4 py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-foreground">{d.userEmail || d.userId || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{d.imageTitle || d.imageId}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {new Date(d.downloadedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Prev</Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: any; small?: boolean }) {
  return (
    <div className="p-5 bg-card border border-border rounded-xl">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className={`font-display ${small ? "text-lg truncate" : "text-3xl"} font-bold text-foreground`}>{value}</div>
    </div>
  );
}
