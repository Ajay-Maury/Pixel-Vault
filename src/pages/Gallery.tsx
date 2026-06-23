import { useState, useEffect, useCallback } from "react";
import {
  Search, Grid3X3, LayoutGrid, X, Download, Copy, Eye,
  ImageOff, Loader2, Globe, Lock, Images, CheckSquare, Square,
  Trash2, FolderPlus, Plus, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  searchImages, ImageRecord, bulkUpdatePrivacy, bulkDeleteImages,
  listMyOwnedGroups, createGroup, addImagesToGroup, ShareGroup,
} from "@/lib/api";
import { isAuthenticated, getUserId } from "@/lib/auth";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import ImageDetailModal from "@/components/ImageDetailModal";

const LIMIT = 12;

function useImageFetch(query: string, page: number, authed: boolean, myLibrary: boolean = false) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [privateCount, setPrivateCount] = useState(0);
  const [publicCount, setPublicCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchImages = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const result = await searchImages(query, LIMIT, page * LIMIT, myLibrary);
      setImages(result.data || []);
      setTotalCount(result.totalCount || 0);
      setPrivateCount(result.privateCount ?? 0);
      setPublicCount(result.publicCount ?? 0);
    } catch {
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [query, page, authed, myLibrary]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  return { images, totalCount, privateCount, publicCount, loading, refetch: fetchImages };
}

async function downloadImage(url: string, filename: string) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Download failed");
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "image";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    toast.success("Download started");
  } catch {
    window.open(url, "_blank");
  }
}

function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void; }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="border-border text-foreground hover:bg-muted">Previous</Button>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const pageNum = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
          return (
            <button key={pageNum} onClick={() => setPage(pageNum)}
              className={`w-8 h-8 rounded-md text-sm font-medium transition-all ${page === pageNum ? "bg-gradient-gold text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              {pageNum + 1}
            </button>
          );
        })}
      </div>
      <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="border-border text-foreground hover:bg-muted">Next</Button>
    </div>
  );
}

function ImageGrid({
  images, loading, gridMode, query, onSelect, emptyMessage, showPrivacyBadge,
  selectionMode, selectedIds, onToggleSelect,
}: {
  images: ImageRecord[];
  loading: boolean;
  gridMode: "masonry" | "grid";
  query: string;
  onSelect: (img: ImageRecord) => void;
  emptyMessage: string;
  showPrivacyBadge?: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ImageOff className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-foreground font-medium text-lg mb-1">No images found</p>
        <p className="text-muted-foreground text-sm">
          {query ? `No results for "${query}"` : emptyMessage}
        </p>
        {!query && (
          <Link to="/upload" className="mt-4">
            <Button className="bg-gradient-gold text-primary-foreground shadow-glow hover:opacity-90 font-semibold">
              Upload Images
            </Button>
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className={gridMode === "masonry"
      ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4"
      : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"}>
      {images.map((img, i) => (
        <ImageCard
          key={img.id}
          image={img}
          masonry={gridMode === "masonry"}
          index={i}
          onClick={() => {
            if (selectionMode) onToggleSelect?.(img.id);
            else onSelect(img);
          }}
          showPrivacyBadge={showPrivacyBadge}
          selectionMode={selectionMode}
          selected={selectedIds?.has(img.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

// ─── Public Tab ────────────────────────────────────────────────────────────────
function PublicGallery({ gridMode, onSelect }: { gridMode: "masonry" | "grid"; onSelect: (img: ImageRecord) => void; }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const authed = isAuthenticated();
  const myLibrary = false;

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const { images: allImages, totalCount, loading } = useImageFetch(debouncedQuery, page, authed, myLibrary);
  const images = allImages.filter((img) => !img.is_private);
  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search public images..."
          className="pl-10 pr-10 h-12 bg-card border-border focus:border-primary text-foreground placeholder:text-muted-foreground text-base" />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <ImageGrid images={images} loading={loading} gridMode={gridMode} query={query} onSelect={onSelect}
        emptyMessage="No public images yet — be the first to share one!" />
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ─── My Library Tab ────────────────────────────────────────────────────────────
function MyLibrary({ gridMode, onSelect, refreshKey, onMutate }: {
  gridMode: "masonry" | "grid"; onSelect: (img: ImageRecord) => void;
  refreshKey: number; onMutate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [privacyTab, setPrivacyTab] = useState<"all" | "public" | "private">("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const authed = isAuthenticated();
  const userId = getUserId();
  const myLibrary = true;

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const { images: allImages, totalCount, privateCount, publicCount, loading, refetch } = useImageFetch(debouncedQuery, page, authed, myLibrary);

  // Re-fetch when external refreshKey changes
  useEffect(() => { refetch(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection on tab/page change
  useEffect(() => { setSelected(new Set()); }, [privacyTab, page, debouncedQuery]);
  useEffect(() => { if (!selectionMode) setSelected(new Set()); }, [selectionMode]);

  const myImages = allImages.filter((img) => !userId || img.user_id === userId);

  const images = myImages.filter((img) => {
    if (privacyTab === "public") return !img.is_private;
    if (privacyTab === "private") return img.is_private !== false;
    return true;
  });

  const apiHasCounts = privateCount > 0 || publicCount > 0 || totalCount > 0;
  const computedPublic = apiHasCounts ? publicCount : myImages.filter((img) => !img.is_private).length;
  const computedPrivate = apiHasCounts ? privateCount : myImages.filter((img) => img.is_private !== false).length;
  const computedAll = apiHasCounts ? totalCount : myImages.length;

  const totalPages = Math.ceil(totalCount / LIMIT);

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function selectAllOnPage() {
    setSelected(new Set(images.map((i) => i.id)));
  }

  async function handleBulkPrivacy(makePrivate: boolean) {
    setBulkLoading(makePrivate ? "private" : "public");
    try {
      await bulkUpdatePrivacy(Array.from(selected), makePrivate);
      toast.success(`Updated ${selected.size} image${selected.size > 1 ? "s" : ""}`);
      setSelected(new Set());
      refetch();
      onMutate();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to update"); }
    finally { setBulkLoading(null); }
  }

  async function handleBulkDelete() {
    setBulkLoading("delete");
    try {
      await bulkDeleteImages(Array.from(selected));
      toast.success(`Deleted ${selected.size} image${selected.size > 1 ? "s" : ""}`);
      setSelected(new Set());
      setConfirmDelete(false);
      refetch();
      onMutate();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to delete"); }
    finally { setBulkLoading(null); }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your images..."
          className="pl-10 pr-10 h-12 bg-card border-border focus:border-primary text-foreground placeholder:text-muted-foreground text-base" />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "public", "private"] as const).map((tab) => {
            const icons = { all: <Images className="w-3.5 h-3.5" />, public: <Globe className="w-3.5 h-3.5" />, private: <Lock className="w-3.5 h-3.5" /> };
            const counts = { all: computedAll, public: computedPublic, private: computedPrivate };
            const labels = { all: "All", public: "Public", private: "Private" };
            return (
              <button key={tab} onClick={() => setPrivacyTab(tab)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  privacyTab === tab
                    ? "bg-gradient-gold text-primary-foreground border-transparent shadow-glow"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}>
                {icons[tab]}{labels[tab]}
                <span className={`text-xs ml-0.5 ${privacyTab === tab ? "opacity-80" : "opacity-60"}`}>({counts[tab]})</span>
              </button>
            );
          })}
        </div>
        <Button
          variant={selectionMode ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectionMode((s) => !s)}
          className={selectionMode ? "bg-gradient-gold text-primary-foreground gap-1.5" : "gap-1.5"}
        >
          {selectionMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          {selectionMode ? "Done" : "Select"}
        </Button>
      </div>

      {selectionMode && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-card">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-foreground">{selected.size} selected</span>
            {selected.size < images.length && images.length > 0 && (
              <button onClick={selectAllOnPage} className="text-primary hover:underline text-xs">Select all on page</button>
            )}
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground text-xs">Clear</button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={selected.size === 0 || !!bulkLoading} onClick={() => handleBulkPrivacy(false)} className="gap-1.5">
              {bulkLoading === "public" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} Public
            </Button>
            <Button size="sm" variant="outline" disabled={selected.size === 0 || !!bulkLoading} onClick={() => handleBulkPrivacy(true)} className="gap-1.5">
              {bulkLoading === "private" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Private
            </Button>
            <Button size="sm" variant="outline" disabled={selected.size === 0 || !!bulkLoading} onClick={() => setShowAddToGroup(true)} className="gap-1.5">
              <FolderPlus className="w-3.5 h-3.5" /> Add to group
            </Button>
            <Button size="sm" disabled={selected.size === 0 || !!bulkLoading} onClick={() => setConfirmDelete(true)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      )}

      <ImageGrid
        images={images} loading={loading} gridMode={gridMode} query={query} onSelect={onSelect}
        emptyMessage="Upload your first image to get started"
        showPrivacyBadge
        selectionMode={selectionMode}
        selectedIds={selected}
        onToggleSelect={toggleSelect}
      />
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} image{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Images will be removed from Cloudinary and your library.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              {bulkLoading === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showAddToGroup && (
        <AddToGroupDialog
          imageIds={Array.from(selected)}
          onClose={() => setShowAddToGroup(false)}
          onAdded={() => { setShowAddToGroup(false); setSelected(new Set()); }}
        />
      )}
    </div>
  );
}

// ── Add to group dialog ──
function AddToGroupDialog({ imageIds, onClose, onAdded }: { imageIds: string[]; onClose: () => void; onAdded: () => void }) {
  const [groups, setGroups] = useState<ShareGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    listMyOwnedGroups()
      .then(setGroups)
      .catch(() => toast.error("Failed to load groups"))
      .finally(() => setLoading(false));
  }, []);

  async function addTo(groupId: string) {
    setAdding(groupId);
    try {
      await addImagesToGroup(groupId, imageIds);
      toast.success(`Added ${imageIds.length} image${imageIds.length > 1 ? "s" : ""}`);
      onAdded();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to add"); }
    finally { setAdding(null); }
  }

  async function handleCreateAndAdd() {
    const name = newName.trim();
    if (!name) return toast.error("Name required");
    if (name.length > 10) return toast.error("Max 10 characters");
    setCreating(true);
    try {
      const g = await createGroup(name);
      await addImagesToGroup(g.id, imageIds);
      toast.success(`Created "${g.name}" and added ${imageIds.length} image${imageIds.length > 1 ? "s" : ""}`);
      onAdded();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
    finally { setCreating(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {imageIds.length} image{imageIds.length > 1 ? "s" : ""} to group</DialogTitle>
          <DialogDescription>Pick an existing group or create a new one.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">You don't own any groups yet.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => addTo(g.id)}
                disabled={!!adding}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted transition-all text-left"
              >
                <div>
                  <div className="font-medium text-foreground">{g.name}</div>
                  {g.memberCount != null && <div className="text-xs text-muted-foreground">{g.memberCount} members</div>}
                </div>
                {adding === g.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Check className="w-4 h-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Or create new</p>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 10))}
              maxLength={10}
              placeholder="Group name"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateAndAdd(); }}
            />
            <Button onClick={handleCreateAndAdd} disabled={creating || !newName.trim()} className="bg-gradient-gold text-primary-foreground gap-2 flex-shrink-0">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Gallery ──────────────────────────────────────────────────────────────
export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [gridMode, setGridMode] = useState<"masonry" | "grid">("masonry");
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const authed = isAuthenticated();
  const requestedTab = searchParams.get("tab");
  const activeTab = requestedTab === "my-library" ? "my-library" : "public";

  function handleDeleted() {
    setSelectedImage(null);
    setRefreshKey((k) => k + 1);
  }

  function handleUpdated(updated: ImageRecord) {
    setSelectedImage(updated);
    setRefreshKey((k) => k + 1);
  }

  if (!authed) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow mb-6">
          <ImageOff className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="font-display text-4xl font-bold text-foreground mb-3">Welcome to PixelVault</h1>
        <p className="text-muted-foreground text-lg max-w-md mb-8">
          Sign in to explore, search and manage your entire image library.
        </p>
        <div className="flex gap-3">
          <Link to="/login">
            <Button className="bg-gradient-gold text-primary-foreground shadow-glow hover:opacity-90 font-semibold px-6">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="outline" className="border-border text-foreground hover:bg-muted px-6">Create Account</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Gallery</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse public images or manage your library</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setGridMode("masonry")}
            className={`p-2 rounded-md transition-all ${gridMode === "masonry" ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setGridMode("grid")}
            className={`p-2 rounded-md transition-all ${gridMode === "grid" ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Tabs value={activeTab}
        onValueChange={(value) => { setSearchParams(value === "my-library" ? { tab: "my-library" } : {}); }}
        className="w-full">
        <TabsList className="mb-6 bg-muted border border-border h-auto p-1 gap-1">
          <TabsTrigger value="public"
            className="flex items-center gap-2 px-5 py-2.5 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md text-muted-foreground font-medium transition-all">
            <Globe className="w-4 h-4" />Public
          </TabsTrigger>
          <TabsTrigger value="my-library"
            className="flex items-center gap-2 px-5 py-2.5 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md text-muted-foreground font-medium transition-all">
            <Images className="w-4 h-4" />My Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public">
          <PublicGallery gridMode={gridMode} onSelect={setSelectedImage} />
        </TabsContent>

        <TabsContent value="my-library">
          <MyLibrary
            gridMode={gridMode}
            onSelect={setSelectedImage}
            refreshKey={refreshKey}
            onMutate={() => setRefreshKey((k) => k + 1)}
          />
        </TabsContent>
      </Tabs>

      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

function ImageCard({ image, masonry, index, onClick, showPrivacyBadge, selectionMode, selected, onToggleSelect }: {
  image: ImageRecord;
  masonry: boolean;
  index: number;
  onClick: () => void;
  showPrivacyBadge?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl cursor-pointer shadow-card hover:shadow-image transition-all duration-300 hover:-translate-y-0.5 animate-fade-in bg-card ${masonry ? "break-inside-avoid mb-4" : "aspect-square"} ${selected ? "ring-2 ring-primary" : ""}`}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onClick}
    >
      {!loaded && !error && (
        <div className={`${masonry ? "h-48" : "w-full h-full"} bg-muted animate-pulse`} />
      )}
      {error ? (
        <div className={`${masonry ? "h-48" : "w-full h-full"} bg-muted flex items-center justify-center`}>
          <ImageOff className="w-8 h-8 text-muted-foreground" />
        </div>
      ) : (
        <img
          src={image.image_url}
          alt={image.title}
          className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0 absolute"} ${!masonry ? "h-full" : ""}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      )}

      {selectionMode && (
        <div
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-md bg-card/95 border border-border flex items-center justify-center shadow-card"
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(image.id); }}
        >
          <Checkbox checked={!!selected} className="pointer-events-none" />
        </div>
      )}

      {showPrivacyBadge && loaded && (
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${
          image.is_private !== false
            ? "bg-card/80 text-muted-foreground border border-border"
            : "bg-primary/20 text-primary border border-primary/30"
        }`}>
          {image.is_private !== false
            ? <><Lock className="w-2.5 h-2.5" /> Private</>
            : <><Globe className="w-2.5 h-2.5" /> Public</>
          }
        </div>
      )}

      {!selectionMode && (
        <>
          <div className="absolute inset-0 image-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <p className="text-foreground font-semibold text-sm truncate">{image.title}</p>
            {image.description && (
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{image.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(image.image_url);
                  toast.success("URL copied!");
                }}
                className="p-1.5 rounded-md bg-card/80 hover:bg-card text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              <a href={image.image_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md bg-card/80 hover:bg-card text-foreground transition-colors">
                <Eye className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await downloadImage(image.image_url, image.title || "image");
                }}
                className="p-1.5 rounded-md bg-card/80 hover:bg-card text-foreground transition-colors"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
