import { X, Download, Copy, ExternalLink, Calendar, Maximize2, Tag, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageRecord } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  image: ImageRecord;
  onClose: () => void;
}

export default function ImageDetailModal({ image, onClose }: Props) {
  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function copyUrl() {
    navigator.clipboard.writeText(image.image_url);
    toast.success("Image URL copied to clipboard!");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-image max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image side */}
        <div className="md:w-1/2 bg-muted flex items-center justify-center overflow-hidden min-h-64 md:min-h-0">
          <img
            src={image.image_url}
            alt={image.title}
            className="w-full h-full object-contain max-h-[50vh] md:max-h-[80vh]"
          />
        </div>

        {/* Info side */}
        <div className="md:w-1/2 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div className="flex-1 pr-3">
              <h2 className="font-display text-xl font-bold text-foreground leading-tight">{image.title}</h2>
              {image.description && (
                <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{image.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metadata */}
          <div className="p-6 flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3">
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

            {/* Keywords */}
            {image.keywords && image.keywords.length > 0 && (
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

            {/* URL */}
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

          {/* Actions */}
          <div className="p-6 border-t border-border flex gap-2">
            <Button
              onClick={copyUrl}
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-muted gap-2"
            >
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
          </div>
        </div>
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
