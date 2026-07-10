import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Upload, X, ImageIcon, Loader2, CheckCircle, Tag, FileText, Type, Lock, Globe,
  AlertCircle, Plus, RotateCw, ArrowLeft, ArrowRight, XCircle, Check, ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { uploadSingleImage, saveImagesBatch, CloudinaryUpload } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

import { MAX_FILES, MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL, UPLOAD_CONCURRENCY } from "@/lib/constants";

type UploadStatus = "queued" | "uploading" | "success" | "failed";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  width?: number;
  height?: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  upload?: CloudinaryUpload;
  selected: boolean;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const authed = isAuthenticated();

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<UploadedFile>) => {
    setFiles((curr) => curr.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;

    setFiles((prev) => {
      const remainingSlots = MAX_FILES - prev.length;
      if (remainingSlots <= 0) {
        toast.error(`You can upload up to ${MAX_FILES} images at once`);
        return prev;
      }

      let skippedForCount = 0;
      const accepted: UploadedFile[] = [];

      for (const file of list) {
        if (accepted.length >= remainingSlots) { skippedForCount++; continue; }
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: only image files are accepted`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: exceeds ${MAX_FILE_SIZE_LABEL} limit`);
          continue;
        }
        const preview = URL.createObjectURL(file);
        const entry: UploadedFile = {
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          preview,
          status: "queued",
          progress: 0,
          selected: true,
        };
        accepted.push(entry);

        // Load image dimensions asynchronously
        const img = new Image();
        img.onload = () => updateFile(entry.id, { width: img.width, height: img.height });
        img.src = preview;
      }

      if (skippedForCount > 0) {
        toast.warning(`Only ${remainingSlots} more file(s) added — max ${MAX_FILES} per upload`);
      }

      if (!title && accepted.length > 0 && prev.length === 0) {
        setTitle(accepted[0].file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
      setSuccess(false);
      return [...prev, ...accepted];
    });
  }, [title, updateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  }

  function clearAll() {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setTitle(""); setDescription(""); setKeywords("");
    setIsPrivate(true); setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function moveFile(id: string, direction: -1 | 1) {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function toggleSelected(id: string) {
    setFiles((prev) =>
      prev.map((f) => (f.id === id && f.status === "success" ? { ...f, selected: !f.selected } : f))
    );
  }

  // Upload a single file (used for initial upload + retry)
  async function uploadOne(entry: UploadedFile) {
    updateFile(entry.id, { status: "uploading", progress: 0, error: undefined });
    try {
      const upload = await uploadSingleImage(entry.file, (p) =>
        updateFile(entry.id, { progress: p })
      );
      updateFile(entry.id, {
        status: "success",
        progress: 100,
        upload,
        selected: true,
      });
      return { ok: true as const };
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Upload failed";
      updateFile(entry.id, { status: "failed", error: message, progress: 0 });
      return { ok: false as const, message };
    }
  }

  // Run uploads with bounded concurrency
  async function runUploads(targets: UploadedFile[]) {
    if (targets.length === 0) return { successCount: 0, failCount: 0 };
    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    try {
      const queue = [...targets];
      const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
        while (queue.length) {
          const next = queue.shift();
          if (!next) break;
          const r = await uploadOne(next);
          if (r.ok) successCount++; else failCount++;
        }
      });
      await Promise.all(workers);
    } finally {
      setUploading(false);
    }
    return { successCount, failCount };
  }

  async function handleStartUpload() {
    if (!title.trim()) { toast.error("Please add a title"); return; }
    const pending = files.filter((f) => f.status === "queued" || f.status === "failed");
    if (pending.length === 0) { toast.info("Nothing to upload"); return; }
    const { successCount, failCount } = await runUploads(pending);
    if (successCount > 0 && failCount === 0) toast.success(`Uploaded ${successCount} image${successCount > 1 ? "s" : ""}`);
    else if (successCount > 0 && failCount > 0) toast.warning(`${successCount} uploaded · ${failCount} failed — retry the failed ones`);
    else if (failCount > 0) toast.error(`All ${failCount} upload${failCount > 1 ? "s" : ""} failed`);
  }

  async function handleRetry(id: string) {
    const entry = files.find((f) => f.id === id);
    if (!entry) return;
    await runUploads([entry]);
  }

  async function handleRetryAllFailed() {
    const failed = files.filter((f) => f.status === "failed");
    if (failed.length === 0) return;
    await runUploads(failed);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Please add a title"); return; }
    const selectedSuccess = files.filter((f) => f.status === "success" && f.selected && f.upload);
    if (selectedSuccess.length === 0) { toast.error("Select at least one successfully uploaded image to save"); return; }

    setSaving(true);
    try {
      const imageUrls = selectedSuccess.map((f) => ({
        imageUrl: f.upload!.secure_url || f.upload!.url || "",
        width: f.upload!.width || f.width || 0,
        height: f.upload!.height || f.height || 0,
        size:
          f.upload!.size != null
            ? Math.round(f.upload!.size / 1024)
            : Math.round(f.file.size / 1024),
      }));

      await saveImagesBatch({
        title: title.trim(),
        description: description.trim(),
        keywords: keywords.trim(),
        isPrivate,
        imageUrls,
      });

      setSuccess(true);
      toast.success(`${selectedSuccess.length} image${selectedSuccess.length > 1 ? "s" : ""} saved to your library!`);
      setTimeout(() => navigate("/?tab=my-library", { replace: true }), 1200);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Derived counts
  const counts = useMemo(() => {
    const c = { queued: 0, uploading: 0, success: 0, failed: 0, selected: 0 };
    files.forEach((f) => {
      c[f.status]++;
      if (f.status === "success" && f.selected) c.selected++;
    });
    return c;
  }, [files]);

  const overallProgress = useMemo(() => {
    if (files.length === 0) return 0;
    const total = files.reduce((acc, f) => {
      if (f.status === "success") return acc + 100;
      if (f.status === "uploading") return acc + f.progress;
      return acc;
    }, 0);
    return Math.round(total / files.length);
  }, [files]);

  if (!authed) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <Upload className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Sign in to upload</h2>
        <p className="text-muted-foreground mb-6">You need an account to upload images.</p>
        <Link to="/login">
          <Button className="bg-gradient-gold text-primary-foreground shadow-glow hover:opacity-90 font-semibold">Sign In</Button>
        </Link>
      </div>
    );
  }

  const totalSizeKB = files.reduce((acc, f) => acc + f.file.size, 0) / 1024;
  const canAddMore = files.length < MAX_FILES && !uploading && !saving;
  const hasPending = counts.queued > 0 || counts.failed > 0;
  const allDoneOrFailed = files.length > 0 && counts.queued === 0 && counts.uploading === 0;
  const showSelectionPanel = counts.success > 0;

  const statusBadge = (f: UploadedFile) => {
    switch (f.status) {
      case "queued":
        return <span className="px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">Queued</span>;
      case "uploading":
        return <span className="px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary">{f.progress}%</span>;
      case "success":
        return <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-400 flex items-center gap-0.5"><Check className="w-3 h-3" />Done</span>;
      case "failed":
        return <span className="px-1.5 py-0.5 rounded-sm bg-destructive/20 text-destructive flex items-center gap-0.5"><XCircle className="w-3 h-3" />Failed</span>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Upload Images</h1>
          <p className="text-muted-foreground">Add up to {MAX_FILES} images at once · max {MAX_FILE_SIZE_LABEL} each</p>
        </div>
        {files.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{files.length}</span> / {MAX_FILES} selected · {(totalSizeKB / 1024).toFixed(2)} MB total
          </div>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Drop zone / grid */}
        <div
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
            dragging
              ? "border-primary bg-primary/5 scale-[1.005]"
              : files.length > 0
              ? "border-border bg-card"
              : "border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
          }`}
          onDragOver={(e) => { e.preventDefault(); if (canAddMore) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => files.length === 0 && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="sr-only"
          />

          {files.length === 0 ? (
            <div className="py-14 px-6 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow">
                <Upload className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold">Drop your images here</p>
                <p className="text-muted-foreground text-sm mt-1">or <span className="text-primary font-medium">click to browse</span></p>
              </div>
              <p className="text-muted-foreground text-xs">PNG, JPG, WEBP, GIF · up to {MAX_FILES} files · {MAX_FILE_SIZE_LABEL} each</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {files.map((f, idx) => {
                  const ringColor =
                    f.status === "success" ? "ring-emerald-500/60"
                    : f.status === "failed" ? "ring-destructive/70"
                    : f.status === "uploading" ? "ring-primary/60"
                    : "ring-transparent";
                  const isSelected = f.status === "success" && f.selected;
                  return (
                    <div
                      key={f.id}
                      className={`relative group rounded-lg overflow-hidden bg-muted border border-border aspect-square ring-2 ${ringColor} ${
                        f.status === "success" && !f.selected ? "opacity-50" : ""
                      }`}
                    >
                      <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />

                      {/* Order index */}
                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-gradient-gold text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-glow">
                          {files.filter((x, i) => i <= idx && x.status === "success" && x.selected).length}
                        </div>
                      )}

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                        aria-label={`Remove ${f.file.name}`}
                        disabled={uploading || saving}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-card/90 hover:bg-destructive hover:text-destructive-foreground text-foreground transition-colors shadow-card opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Uploading overlay */}
                      {f.status === "uploading" && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 p-3">
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          <Progress value={f.progress} className="h-1.5 w-full" />
                          <span className="text-[10px] text-foreground font-medium">{f.progress}%</span>
                        </div>
                      )}

                      {/* Failed overlay */}
                      {f.status === "failed" && (
                        <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                          <XCircle className="w-5 h-5 text-destructive" />
                          <p className="text-[10px] text-destructive line-clamp-2">{f.error || "Failed"}</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRetry(f.id); }}
                            className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-border hover:border-primary text-foreground"
                          >
                            <RotateCw className="w-3 h-3" /> Retry
                          </button>
                        </div>
                      )}

                      {/* Footer: status badge / reorder / select */}
                      <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/85 to-transparent">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-white">
                          {statusBadge(f)}
                          {f.status === "success" && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); moveFile(f.id, -1); }}
                                title="Move left"
                                disabled={idx === 0}
                                className="p-0.5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-30"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); moveFile(f.id, 1); }}
                                title="Move right"
                                disabled={idx === files.length - 1}
                                className="p-0.5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-30"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleSelected(f.id); }}
                                title={f.selected ? "Exclude from save" : "Include in save"}
                                className={`p-0.5 rounded ${f.selected ? "bg-emerald-500/80" : "bg-white/15 hover:bg-white/25"}`}
                              >
                                {f.selected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-0.5 text-[9px] text-white/70 truncate">
                          {f.width && f.height ? `${f.width}×${f.height} · ` : ""}{(f.file.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>
                  );
                })}

                {canAddMore && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs">Add more</span>
                  </button>
                )}
              </div>

              {/* Overall progress + summary */}
              {(uploading || allDoneOrFailed) && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5" />
                      {counts.success} done · {counts.uploading} uploading · {counts.queued} queued · <span className={counts.failed > 0 ? "text-destructive" : ""}>{counts.failed} failed</span>
                    </span>
                    <span className="text-foreground font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-1.5" />
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {files.length === MAX_FILES ? (
                    <span className="flex items-center gap-1 text-primary">
                      <AlertCircle className="w-3.5 h-3.5" /> Max {MAX_FILES} reached
                    </span>
                  ) : (
                    <span>{MAX_FILES - files.length} slot(s) remaining</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {counts.failed > 0 && (
                    <button
                      type="button"
                      onClick={handleRetryAllFailed}
                      disabled={uploading}
                      className="text-xs inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                    >
                      <RotateCw className="w-3 h-3" /> Retry all failed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={uploading || saving}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selection summary panel */}
        {showSelectionPanel && (
          <div className="rounded-xl border border-border bg-card/60 p-4 text-sm flex flex-wrap items-center justify-between gap-2">
            <div className="text-muted-foreground">
              <span className="text-foreground font-semibold">{counts.selected}</span> of {counts.success} successful image{counts.success > 1 ? "s" : ""} selected to save.
              Use the arrows on each tile to reorder, the ✓ toggle to include/exclude.
            </div>
          </div>
        )}

        {/* Metadata fields */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border">
          {files.length > 1 && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border border-border">
              The title, description, keywords, and privacy setting below will be applied to all selected images. You can edit each image individually later.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground font-medium flex items-center gap-2">
              <Type className="w-3.5 h-3.5 text-primary" />
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your image a descriptive title"
              maxLength={120}
              className="bg-muted border-border focus:border-primary text-foreground placeholder:text-muted-foreground h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground font-medium flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the image content..."
              maxLength={1000}
              className="bg-muted border-border focus:border-primary text-foreground placeholder:text-muted-foreground resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords" className="text-foreground font-medium flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary" />
              Keywords
            </Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="nature, landscape, sunset (comma separated)"
              maxLength={250}
              className="bg-muted border-border focus:border-primary text-foreground placeholder:text-muted-foreground h-11"
            />
            <p className="text-muted-foreground text-xs">Separate keywords with commas for better searchability</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {isPrivate ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Globe className="w-4 h-4 text-primary" />
              )}
              <div>
                <p className="text-foreground font-medium text-sm">{isPrivate ? "Private" : "Public"}</p>
                <p className="text-muted-foreground text-xs">
                  {isPrivate ? "Only you can see these images" : "Visible to everyone in the public gallery"}
                </p>
              </div>
            </div>
            <Switch checked={!isPrivate} onCheckedChange={(checked) => setIsPrivate(!checked)} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handleStartUpload}
            disabled={uploading || saving || success || !hasPending || files.length === 0}
            className="flex-1 h-12 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold text-base gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Uploading… {overallProgress}%</>
            ) : (
              <><Upload className="w-5 h-5" /> Upload {hasPending ? `${counts.queued + counts.failed} ` : ""}file{counts.queued + counts.failed === 1 ? "" : "s"}</>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={uploading || saving || success || counts.selected === 0}
            variant={counts.selected > 0 && !hasPending ? "default" : "outline"}
            className="flex-1 h-12 font-semibold text-base gap-2 disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
            ) : success ? (
              <><CheckCircle className="w-5 h-5" /> Saved! Redirecting…</>
            ) : (
              <><Check className="w-5 h-5" /> Save {counts.selected > 0 ? `${counts.selected} ` : ""}to Library</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
