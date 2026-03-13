import { useState, useMemo, useCallback, useEffect } from "react";
import { X, Download, Copy, ExternalLink, Calendar, Maximize2, Minimize2, Tag, FileImage, Trash2, Pencil, Loader2, Lock, Globe } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageRecord, deleteImage, updateImage } from "@/lib/api";
import { getUserId } from "@/lib/auth";
import { toast } from "sonner";

interface Props {
  image: ImageRecord;
  onClose: () => void;
  onDeleted?: (id: string) => void;
  onUpdated?: (image: ImageRecord) => void;
}

export default function ImageDetailModal({ image, onClose, onDeleted, onUpdated }: Props) {
  const userId = getUserId();
  const isOwner = userId && image.user_id === userId;
  const isMobile = useIsMobile();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [title, setTitle] = useState(image.title);
  const [description, setDescription] = useState(image.description || "");
  const [keywords, setKeywords] = useState((image.keywords || []).join(", "));
  const [isPrivate, setIsPrivate] = useState(image.is_private !== false);

  const isPortrait = image.height > image.width;
  // Side-by-side when image is narrow (portrait) and not mobile
  const useSideLayout = !isMobile && isPortrait;

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function copyUrl() {
    navigator.clipboard.writeText(image.image_url);
    toast.success("Image URL copied to clipboard!");
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteImage(image.id);
      toast.success("Image deleted");
      onDeleted?.(image.id);
      onClose();
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await updateImage(image.id, {
        title: title.trim(),
        description: description.trim(),
        keywords: keywords.trim(),
        isPrivate,
      });
      toast.success("Image updated");
      onUpdated?.({
        ...image,
        title: title.trim(),
        description: description.trim(),
        keywords: keywords.trim().split(",").map((k) => k.trim()).filter(Boolean),
        is_private: isPrivate,
      });
      setEditing(false);
    } catch {
      toast.error("Failed to update image");
    } finally {
      setSaving(false);
    }
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (fullscreen) setFullscreen(false);
      else onClose();
    }
  }, [fullscreen, onClose]);

  // ── Fullscreen View ──
  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex items-center justify-center cursor-zoom-out animate-fade-in"
        onClick={() => setFullscreen(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <img
          src={image.image_url}
          alt={image.title}
          className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-image"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
            className="bg-card/80 backdrop-blur-sm hover:bg-card text-foreground rounded-full h-10 w-10"
          >
            <Minimize2 className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-muted-foreground">
          Press <kbd className="font-mono text-foreground mx-1">Esc</kbd> or click to exit
        </div>
      </div>
    );
  }

  // ── Detail Modal ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-navy/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className={`bg-card border border-border rounded-2xl shadow-image max-h-[95vh] overflow-hidden flex animate-scale-in ${
          useSideLayout ? 'flex-row max-w-5xl w-auto' : 'flex-col max-w-4xl w-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Single scrollable container */}
        <div className={`overflow-y-auto max-h-[95vh] flex w-full ${useSideLayout ? 'flex-row' : 'flex-col'}`}>

          {/* ── Title above image (stacked layout only) ── */}
          {!useSideLayout && (
            <div className="px-5 pt-4 pb-2 flex items-start justify-between">
              <div className="flex-1 pr-3 min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight truncate">{image.title}</h2>
                {image.description && !editing && (
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed line-clamp-2">{image.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setFullscreen(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── Image ── */}
          <div
            className={`relative group bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 ${
              useSideLayout ? 'h-auto' : 'w-full'
            }`}
          >
            <img
              src={image.image_url}
              alt={image.title}
              className="object-contain block cursor-zoom-in"
              style={
                isMobile
                  ? { width: '100%', aspectRatio: `${image.width}/${image.height}`, maxHeight: '55vh' }
                  : isPortrait
                    ? { maxHeight: '85vh', width: 'auto', aspectRatio: `${image.width}/${image.height}` }
                    : { maxHeight: '70vh', width: '100%', aspectRatio: `${image.width}/${image.height}` }
              }
              onClick={() => setFullscreen(true)}
            />
            {/* Fullscreen overlay hint */}
            <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/10 transition-colors pointer-events-none flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm rounded-full p-2.5 pointer-events-none">
                <Maximize2 className="w-5 h-5 text-foreground" />
              </div>
            </div>
          </div>

          {/* ── Info Panel ── */}
          <div className={`flex flex-col ${useSideLayout ? 'w-80 min-w-[280px] flex-shrink-0' : 'w-full'}`}>
            {/* Header — side layout has its own title + close */}
            {useSideLayout && (
              <div className="flex items-start justify-between p-5 border-b border-border">
                <div className="flex-1 pr-3 min-w-0">
                  {editing ? (
                    <EditForm
                      title={title} setTitle={setTitle}
                      description={description} setDescription={setDescription}
                      keywords={keywords} setKeywords={setKeywords}
                      isPrivate={isPrivate} setIsPrivate={setIsPrivate}
                    />
                  ) : (
                    <>
                      <h2 className="font-display text-xl font-bold text-foreground leading-tight">{image.title}</h2>
                      {image.description && (
                        <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{image.description}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setFullscreen(true)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Edit form for stacked layout */}
            {!useSideLayout && editing && (
              <div className="px-5 py-3 border-b border-border">
                <EditForm
                  title={title} setTitle={setTitle}
                  description={description} setDescription={setDescription}
                  keywords={keywords} setKeywords={setKeywords}
                  isPrivate={isPrivate} setIsPrivate={setIsPrivate}
                />
              </div>
            )}

            {/* Metadata */}
            <div className="p-5 flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <MetaStat icon={<Maximize2 className="w-3.5 h-3.5" />} label="Dimensions" value={`${image.width} × ${image.height}`} />
                <MetaStat icon={<FileImage className="w-3.5 h-3.5" />} label="File size" value={formatFileSize(image.size)} />
                {image.uploaded_at && (
                  <MetaStat
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Uploaded"
                    value={new Date(image.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  />
                )}
              </div>

              {!editing && image.keywords && image.keywords.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                    <Tag className="w-3 h-3" />
                    Keywords
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {image.keywords.map((kw, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs border border-border">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">Image URL</div>
                <div className="flex items-center gap-2 bg-muted rounded-lg p-2.5 border border-border">
                  <span className="text-muted-foreground text-xs truncate flex-1">{image.image_url}</span>
                  <button onClick={copyUrl} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Delete confirmation */}
            {confirmDelete && (
              <div className="px-5 pb-3">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-destructive text-sm font-medium">Delete?</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="h-7 text-xs border-border">Cancel</Button>
                    <Button size="sm" onClick={handleDelete} disabled={deleting} className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-5 border-t border-border flex gap-2 flex-wrap">
              {editing ? (
                <>
                  <Button onClick={() => setEditing(false)} variant="outline" className="flex-1 border-border text-foreground hover:bg-muted">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={copyUrl} variant="outline" className="flex-1 border-border text-foreground hover:bg-muted gap-2">
                    <Copy className="w-4 h-4" />
                    Copy URL
                  </Button>
                  <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </Button>
                  </a>
                  <a href={image.image_url} download>
                    <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow gap-2">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                  {isOwner && (
                    <>
                      <Button onClick={() => setEditing(true)} variant="outline" className="border-border text-foreground hover:bg-muted gap-2">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => setConfirmDelete(true)} variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditForm({ title, setTitle, description, setDescription, keywords, setKeywords, isPrivate, setIsPrivate }: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  keywords: string; setKeywords: (v: string) => void;
  isPrivate: boolean; setIsPrivate: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-foreground text-xs font-medium">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border focus:border-primary text-foreground h-9 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-foreground text-xs font-medium">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted border-border focus:border-primary text-foreground text-sm resize-none" rows={2} />
      </div>
      <div className="space-y-1">
        <Label className="text-foreground text-xs font-medium">Keywords</Label>
        <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="comma separated" className="bg-muted border-border focus:border-primary text-foreground h-9 text-sm" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isPrivate ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Globe className="w-3.5 h-3.5 text-primary" />}
          <span className="text-foreground text-sm">{isPrivate ? "Private" : "Public"}</span>
        </div>
        <Switch checked={!isPrivate} onCheckedChange={(c) => setIsPrivate(!c)} />
      </div>
    </div>
  );
}

function MetaStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-3 border border-border">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-foreground text-sm font-medium">{value}</div>
    </div>
  );
}
