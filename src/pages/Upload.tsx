import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, ImageIcon, Loader2, CheckCircle, Tag, FileText, Type, Lock, Globe, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { uploadImagesBatch, saveImagesBatch } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE_LABEL = "5MB";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  width?: number;
  height?: number;
  error?: string;
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
  const [success, setSuccess] = useState(false);
  const authed = isAuthenticated();

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (accepted.length >= remainingSlots) {
          skippedForCount++;
          continue;
        }
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
        };
        accepted.push(entry);

        // Load image dimensions asynchronously
        const img = new Image();
        img.onload = () => {
          setFiles((curr) =>
            curr.map((f) => (f.id === entry.id ? { ...f, width: img.width, height: img.height } : f))
          );
        };
        img.src = preview;
      }

      if (skippedForCount > 0) {
        toast.warning(`Only ${remainingSlots} more file(s) added — max ${MAX_FILES} per upload`);
      }

      // Auto-fill title from first file if empty
      if (!title && accepted.length > 0 && prev.length === 0) {
        setTitle(accepted[0].file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
      setSuccess(false);
      return [...prev, ...accepted];
    });
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    // reset so selecting the same file again still triggers change
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
    setTitle("");
    setDescription("");
    setKeywords("");
    setIsPrivate(true);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) { toast.error("Please select at least one image"); return; }
    if (!title.trim()) { toast.error("Please add a title"); return; }
    if (files.length > MAX_FILES) { toast.error(`Maximum ${MAX_FILES} images per upload`); return; }

    setUploading(true);
    try {
      // 1. Batch upload to backend
      const { uploads } = await uploadImagesBatch(files.map((f) => f.file));
      if (!uploads || uploads.length === 0) throw new Error("Upload failed");

      // 2. Save metadata for all images (shared title/desc/keywords/privacy)
      const imageUrls = uploads.map((u, idx) => ({
        imageUrl: u.secure_url || u.url || "",
        width: u.width || files[idx]?.width || 0,
        height: u.height || files[idx]?.height || 0,
        size: u.size != null ? Math.round(u.size / 1024) : Math.round((files[idx]?.file.size || 0) / 1024),
      }));

      await saveImagesBatch({
        title: title.trim(),
        description: description.trim(),
        keywords: keywords.trim(),
        isPrivate,
        imageUrls,
      });

      setSuccess(true);
      toast.success(`${uploads.length} image${uploads.length > 1 ? "s" : ""} uploaded successfully!`);
      setTimeout(() => navigate("/?tab=my-library", { replace: true }), 1200);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

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
  const canAddMore = files.length < MAX_FILES;

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
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
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="relative group rounded-lg overflow-hidden bg-muted border border-border aspect-square"
                  >
                    <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                      aria-label={`Remove ${f.file.name}`}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-card/90 hover:bg-destructive hover:text-destructive-foreground text-foreground transition-colors shadow-card opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white truncate">
                      {f.width && f.height ? `${f.width}×${f.height} · ` : ""}{(f.file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ))}

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

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
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
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Metadata fields */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border">
          {files.length > 1 && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border border-border">
              The title, description, keywords, and privacy setting below will be applied to all {files.length} images. You can edit each image individually later.
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

          {/* Privacy toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {isPrivate ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Globe className="w-4 h-4 text-primary" />
              )}
              <div>
                <p className="text-foreground font-medium text-sm">
                  {isPrivate ? "Private" : "Public"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isPrivate
                    ? "Only you can see these images"
                    : "Visible to everyone in the public gallery"}
                </p>
              </div>
            </div>
            <Switch
              checked={!isPrivate}
              onCheckedChange={(checked) => setIsPrivate(!checked)}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={uploading || files.length === 0 || success}
          className="w-full h-12 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold text-base gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading {files.length} image{files.length > 1 ? "s" : ""}...
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Uploaded! Redirecting...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload {files.length > 0 ? `${files.length} ` : ""}image{files.length === 1 ? "" : "s"} to Library
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
