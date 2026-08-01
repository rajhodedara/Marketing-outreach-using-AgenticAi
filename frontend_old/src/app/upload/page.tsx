"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileType, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.zip')) {
      toast.error("Invalid file type", { description: "Please upload a .zip file containing your account data." });
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("account_name", file.name.replace(".zip", "").replace("_", " "));

    try {
      const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload file");
      }

      toast.success("Upload successful", { description: "Your data has been ingested successfully." });
      router.push("/");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed", { description: "There was an error uploading your data. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Upload Data</h1>
          <p className="text-muted-foreground mt-2">Upload your target accounts ZIP file to begin the orchestration process.</p>
        </div>

        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="p-0">
            <div
              className={`flex flex-col items-center justify-center p-12 text-center transition-colors ${isDragging ? "bg-primary/5 border-primary" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Drag and drop your ZIP file here</h3>
              <p className="text-sm text-muted-foreground mb-6">
                or click to browse from your computer
              </p>
              
              <input
                type="file"
                accept=".zip"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])}
              />
              
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="min-w-32">
                Browse Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {file && (
          <Card className="bg-card shadow-sm border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-md">
                  <FileType className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button onClick={handleUpload} disabled={isUploading} className="min-w-24">
                {isUploading ? "Uploading..." : "Upload File"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
