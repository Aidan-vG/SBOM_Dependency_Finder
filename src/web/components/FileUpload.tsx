import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileLoad: (file: File) => void;
}

function FileUpload({ onFileLoad }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 1) {
      alert('Please drop only one file at a time');
      return;
    }

    const file = files[0];
    if (!file.name.endsWith('.json')) {
      alert('Please upload a JSON file (CycloneDX SBOM)');
      return;
    }

    onFileLoad(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileLoad(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        <h2>Drop your SBOM here</h2>
        <p>or click to select a file</p>
        <p className="hint">CycloneDX JSON format (version 1.4 recommended)</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      <div className="upload-info">
        <h3>What is this tool?</h3>
        <p>
          This tool helps users trace vulnerable JAR dependencies
          back to their parent Marketplace widgets and modules. Upload a CycloneDX
          SBOM from a Mendix project to get started.
        </p>
      </div>
    </div>
  );
}

export default FileUpload;
