import { useState, useCallback, useRef } from "react";
import { Upload, X, ImageIcon, Loader2, CheckCircle, Tag, FileText, Type, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { uploadToCloudinary, saveImage } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

interface UploadedFile {
  file: File;
  preview: string;
  width?: number;
  height?: number;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const authed = isAuthenticated();

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are accepted");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setUploadedFile({ file, preview, width: img.width, height: img.height });
    };
    img.src = preview;
    setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    setSuccess(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadedFile) { toast.error("Please select an image"); return; }
    if (!title.trim()) { toast.error("Please add a title"); return; }
    setUploading(true);
    try {
      // 1. Upload to cloudinary
      const cloudRes = await uploadToCloudinary(uploadedFile.file);
      if (!cloudRes.secure_url && !cloudRes.url) {
        throw new Error(cloudRes.message || "Upload failed");
      }
      const imageUrl = cloudRes.secure_url || cloudRes.url;

      // 2. Save metadata
      await saveImage({
        title: title.trim(),
        description: description.trim(),
        keywords: keywords.trim(),
        height: uploadedFile.height || cloudRes.height || 0,
        width: uploadedFile.width || cloudRes.width || 0,
        imageUrl: cloudRes.secure_url,
        size: Math.round(uploadedFile.file.size / 1024),
        isPrivate,
      });

      setSuccess(true);
      toast.success("Image uploaded successfully!");
      setTimeout(() => navigate("/?tab=my-library", { replace: true }), 1500);
    } catch (err: any) {
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function clearFile() {
    if (uploadedFile) URL.revokeObjectURL(uploadedFile.preview);
    setUploadedFile(null);
    setTitle("");
    setDescription("");
    setKeywords("");
    setIsPrivate(true);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-1">Upload Image</h1>
        <p className="text-muted-foreground">Add images to your library with metadata</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : uploadedFile
              ? "border-border bg-card"
              : "border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploadedFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />

          {uploadedFile ? (
            <div className="relative">
              <img
                src={uploadedFile.preview}
                alt="Preview"
                className="w-full rounded-xl object-contain max-h-72"
              />
              <div className="absolute top-2 right-2 flex gap-1.5">
                {success && (
                  <div className="rounded-full p-1 bg-primary/90">
                    <CheckCircle className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="p-1.5 rounded-full bg-card/90 hover:bg-card text-muted-foreground hover:text-foreground transition-colors shadow-card"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* File info */}
              <div className="p-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">{uploadedFile.file.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {uploadedFile.width && uploadedFile.height && `${uploadedFile.width}×${uploadedFile.height} · `}
                  {(uploadedFile.file.size / 1024).toFixed(0)} KB
                </div>
              </div>
            </div>
          ) : (
            <div className="py-14 px-6 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow">
                <Upload className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold">Drop your image here</p>
                <p className="text-muted-foreground text-sm mt-1">or <span className="text-primary font-medium">click to browse</span></p>
              </div>
              <p className="text-muted-foreground text-xs">PNG, JPG, WEBP, GIF · Max 10MB</p>
            </div>
          )}
        </div>

        {/* Metadata fields */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border">
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
                    ? "Only you can see this image"
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
          disabled={uploading || !uploadedFile || success}
          className="w-full h-12 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-semibold text-base gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Uploaded! Redirecting...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload to Library
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
