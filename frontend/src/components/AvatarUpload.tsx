'use client';

import { useRef, useState } from "react";
import { Camera, User, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface AvatarUploadProps{
    value: string | null;
    onChange: (url: string) => void;
    size? : 'sm' | 'md' | 'lg';
}

export default function AvatarUpload({value, onChange, size='md'}: AvatarUploadProps){
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async(e: React.ChangeEvent<HTMLInputElement>)=>{
        const file = e.target.files?.[0];
        if(!file){
            return;
        }
        if(!file.type.startsWith('image/')){
            setError('Please Select an image file');
            return;
        }
        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file',file);

        try {
      // 3. Upload to backend
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // 4. Pass the returned URL (e.g., "/uploads/xyz.jpg") to the parent
      onChange(response.data.url);
    } catch (err) {
      setError('Failed to upload image');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }

    }

    const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  // Construct the full URL for display
  const fullUrl = value 
    ? (value.startsWith('http') ? value : `${process.env.NEXT_PUBLIC_API_URL}${value}`)
    : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative ${sizeClasses[size]} rounded-full bg-gray-100 border-2 border-dashed border-gray-300 cursor-pointer hover:border-emerald-500 transition-colors overflow-hidden flex items-center justify-center`}
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        ) : fullUrl ? (
          <img src={fullUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-gray-400" />
        )}
        
        {/* Hover overlay with camera icon */}
        {!isUploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}