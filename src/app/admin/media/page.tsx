'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { uploadImage } from '@/services/imageUploadService';
import { Copy, Upload, Image as ImageIcon, Check } from 'lucide-react';

interface UploadedImage {
  url: string;
  directUrl: string;
  name: string;
  timestamp: number;
}

export default function MediaLibraryPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: UploadedImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }

        const url = await uploadImage(file, 'blog');
        // Create a direct URL that bypasses CORS
        const directUrl = url.replace(
          'https://firebasestorage.googleapis.com/v0/b/',
          'https://storage.googleapis.com/'
        ).replace('/o/', '/');
        
        newImages.push({
          url,
          directUrl,
          name: file.name,
          timestamp: Date.now()
        });
      }

      setUploadedImages(prev => [...newImages, ...prev]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload some images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <AdminLayout title="Media Library">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Media Library</h2>
          <p className="text-muted-foreground mt-1">
            Upload images to Firebase Storage and get URLs for blog posts
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={uploading}
          />
          
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                ) : (
                  <Upload className="w-8 h-8 text-primary" />
                )}
              </div>
              
              <div>
                <p className="text-lg font-medium text-foreground">
                  {uploading ? 'Uploading...' : 'Drop images here or click to upload'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports JPG, PNG, GIF, WebP (max 5MB each)
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Quick Instructions */}
        <div className="bg-muted border border-border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">How to use:</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Upload your image using the area above</li>
            <li>Click the copy button to get the Firebase URL</li>
            <li>Paste the URL in your MDX file's frontmatter (cover: "url")</li>
            <li>Or use it in the blog editor when creating posts</li>
          </ol>
        </div>

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Recently Uploaded
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uploadedImages.map((image) => (
                <div 
                  key={image.timestamp} 
                  className="bg-card rounded-lg border border-border overflow-hidden"
                >
                  {/* Image Preview */}
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Image Info */}
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {image.name}
                    </p>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={image.url}
                        readOnly
                        className="flex-1 px-2 py-1 text-xs bg-muted border border-border rounded text-muted-foreground"
                      />
                      <button
                        onClick={() => copyToClipboard(image.url)}
                        className="p-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                        title="Copy URL"
                      >
                        {copiedUrl === image.url ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {uploadedImages.length === 0 && !uploading && (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No images uploaded yet in this session
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload images to get started
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}