import { useState, useEffect, useCallback } from "react";
import { Search, Grid3X3, LayoutGrid, X, Download, Copy, Eye, ImageOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchImages, ImageRecord } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ImageDetailModal from "@/components/ImageDetailModal";

const LIMIT = 12;

export default function Gallery() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gridMode, setGridMode] = useState<"masonry" | "grid">("masonry");
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const authed = isAuthenticated();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchImages = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const result = await searchImages(debouncedQuery, LIMIT, page * LIMIT);
      setImages(result.data || []);
      setTotalCount(result.totalCount || 0);
    } catch {
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, authed]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const totalPages = Math.ceil(totalCount / LIMIT);

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
            <Button className="bg-gradient-gold text-primary-foreground shadow-glow hover:opacity-90 font-semibold px-6">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="outline" className="border-border text-foreground hover:bg-muted px-6">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Image Gallery</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount > 0 ? `${totalCount} image${totalCount !== 1 ? "s" : ""} in your library` : "Your image library"}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setGridMode("masonry")}
            className={`p-2 rounded-md transition-all ${gridMode === "masonry" ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridMode("grid")}
            className={`p-2 rounded-md transition-all ${gridMode === "grid" ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, description or keywords..."
          className="pl-10 pr-10 h-12 bg-card border-border focus:border-primary text-foreground placeholder:text-muted-foreground text-base"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ImageOff className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-foreground font-medium text-lg mb-1">No images found</p>
          <p className="text-muted-foreground text-sm">
            {query ? `No results for "${query}"` : "Upload your first image to get started"}
          </p>
          {!query && (
            <Link to="/upload" className="mt-4">
              <Button className="bg-gradient-gold text-primary-foreground shadow-glow hover:opacity-90 font-semibold">
                Upload Images
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div
          className={
            gridMode === "masonry"
              ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4"
              : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          }
        >
          {images.map((img, i) => (
            <ImageCard
              key={img._id}
              image={img}
              masonry={gridMode === "masonry"}
              index={i}
              onClick={() => setSelectedImage(img)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border-border text-foreground hover:bg-muted"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-md text-sm font-medium transition-all ${
                    page === pageNum
                      ? "bg-gradient-gold text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="border-border text-foreground hover:bg-muted"
          >
            Next
          </Button>
        </div>
      )}

      {/* Modal */}
      {selectedImage && (
        <ImageDetailModal image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
}

function ImageCard({ image, masonry, index, onClick }: {
  image: ImageRecord;
  masonry: boolean;
  index: number;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl cursor-pointer shadow-card hover:shadow-image transition-all duration-300 hover:-translate-y-0.5 animate-fade-in bg-card ${masonry ? "break-inside-avoid mb-4" : "aspect-square"}`}
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
          src={image.imageUrl}
          alt={image.title}
          className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0 absolute"} ${!masonry ? "h-full" : ""}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      )}

      {/* Overlay */}
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
              navigator.clipboard.writeText(image.imageUrl);
              toast.success("URL copied!");
            }}
            className="p-1.5 rounded-md bg-card/80 hover:bg-card text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
          <a
            href={image.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md bg-card/80 hover:bg-card text-foreground transition-colors"
          >
            <Eye className="w-3 h-3" />
          </a>
          <a
            href={image.imageUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md bg-card/80 hover:bg-card text-foreground transition-colors"
          >
            <Download className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
