"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
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

  const removeFile = () => {
    setFile(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("account_name", accountName || file.name.replace(".zip", "").replace("_", " "));

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await res.json();
      toast.success("Upload successful", { description: "Your data has been ingested successfully." });
      router.push(`/accounts/${data.account_id}`);
    } catch (error) {
      console.error(error);
      toast.error("Upload failed", { description: "There was an error uploading your data. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 flex justify-center bg-background min-h-[calc(100vh-4rem)]">
      {/* Flow Container */}
      <div className="w-full max-w-[680px] flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-foreground mb-1">New Account</h2>
          <p className="text-[18px] leading-[28px] text-muted-foreground">Provide account details and upload data to begin analysis</p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 flex flex-col gap-8">
          {/* Basic Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground">Target Account Name</label>
              <input 
                className="w-full h-10 px-3 text-[16px] leading-[24px] text-foreground bg-muted border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow" 
                placeholder="e.g. Meridian Global" 
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground">Company Domain</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">language</span>
                <input 
                  className="w-full h-10 pl-10 pr-3 text-[16px] leading-[24px] text-foreground bg-muted border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow" 
                  placeholder="meridian.com" 
                  type="text"
                  value={companyDomain}
                  onChange={(e) => setCompanyDomain(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <hr className="border-t border-border" />
          
          {/* Data Pack Upload Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between mb-1">
              <div>
                <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground">Data Pack</h3>
                <p className="text-[12px] leading-[16px] text-muted-foreground mt-1">Upload CRM exports, intelligence docs, or email threads.</p>
              </div>
            </div>
            
            {/* Dropzone */}
            {!file && (
              <div 
                className={`w-full rounded-lg border-2 border-dashed border-border bg-background hover:bg-muted/50 transition-colors duration-200 py-8 px-6 flex flex-col items-center justify-center text-center cursor-pointer group ${isDragging ? "bg-muted border-primary" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[24px] text-muted-foreground group-hover:text-primary transition-colors">cloud_upload</span>
                </div>
                <p className="text-[16px] leading-[24px] text-foreground font-medium mb-1">Click to upload or drag and drop</p>
                
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])}
                />
                
                {/* File Type Chips */}
                <div className="flex gap-2 mt-4">
                  <span className="px-2 py-1 bg-muted text-secondary-foreground rounded text-[11px] leading-[16px] tracking-[0.05em] font-semibold">ZIP</span>
                  <span className="px-2 py-1 bg-muted text-secondary-foreground rounded text-[11px] leading-[16px] tracking-[0.05em] font-semibold">CSV</span>
                  <span className="px-2 py-1 bg-muted text-secondary-foreground rounded text-[11px] leading-[16px] tracking-[0.05em] font-semibold">PDF</span>
                  <span className="px-2 py-1 bg-muted text-secondary-foreground rounded text-[11px] leading-[16px] tracking-[0.05em] font-semibold">JSON</span>
                </div>
              </div>
            )}

            {/* Manifest List (Uploaded Files) */}
            {file && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-4 p-3 rounded bg-muted border border-border group hover:border-foreground/20 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-secondary-foreground">folder_zip</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[13px] leading-[18px] font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }} title="Validation Success">check_circle</span>
                  <button onClick={removeFile} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary-foreground hover:text-destructive transition-colors">delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Area */}
        <div className="mt-8 flex flex-col items-center">
          {/* Primary Action Button */}
          <button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="h-12 px-8 rounded bg-primary text-primary-foreground text-[18px] leading-[24px] font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 w-full md:w-auto min-w-[240px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isUploading ? "sync" : "temp_preferences_custom"}
            </span>
            {isUploading ? "Uploading..." : "Analyze Account"}
          </button>
          
          {/* Helper Microcopy */}
          <p className="mt-4 font-mono text-[13px] leading-[18px] text-muted-foreground text-center max-w-md mx-auto">
            We'll research the company, map stakeholders, and identify buying signals — usually under 60 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
