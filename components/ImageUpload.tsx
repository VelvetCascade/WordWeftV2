import React, { useState, useRef } from 'react';
import { getImageKitAuth } from '../api/client';
import imageCompression from 'browser-image-compression';
import * as nsfwjs from 'nsfwjs';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string, fileId: string | null) => void;
    className?: string;
    fallbackUrl?: string;
    label?: string;
    /** Aspect ratio for crop (width/height). e.g., 2/3 for book covers, 1 for avatars. Undefined = free-form. */
    aspectRatio?: number;
    /** Shape of the crop area. 'circle' for avatars, 'rect' for everything else. */
    cropShape?: 'rect' | 'circle';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    className = "",
    fallbackUrl = "https://via.placeholder.com/150",
    label = "Upload Image",
    aspectRatio,
    cropShape = 'rect',
}) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const uniqueId = useRef(`image-upload-${Math.random().toString(36).slice(2, 8)}`);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');

        // 1. Size Check (5MB max before compression)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        // Open crop modal instead of immediately uploading
        setCropFile(file);
    };

    const handleCropConfirm = async (croppedFile: File) => {
        setCropFile(null);
        await processAndUpload(croppedFile);
    };

    const handleCropCancel = () => {
        setCropFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processAndUpload = async (file: File) => {
        setUploading(true);
        setProgress(10);

        try {
            // 2. Compress Image
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);
            setProgress(30);

            // 3. NSFW Check
            const isSafe = await checkNSFW(compressedFile);
            if (!isSafe) {
                setError('Image blocked: Explicit content detected.');
                setUploading(false);
                return;
            }
            setProgress(50);

            // 4. Get Auth Signature
            const auth = await getImageKitAuth();
            setProgress(70);

            // 5. Upload to ImageKit
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('publicKey', auth.publicKey);
            formData.append('signature', auth.signature);
            formData.append('expire', auth.expire.toString());
            formData.append('token', auth.token);
            formData.append('fileName', file.name || 'upload.jpg');

            const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                throw new Error('Upload failed: ' + errText);
            }

            const data = await uploadRes.json();
            setProgress(100);
            
            // Pass back URL and File ID
            onChange(data.url, data.fileId);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred during upload.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const checkNSFW = async (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = async () => {
                try {
                    const model = await nsfwjs.load();
                    const predictions = await model.classify(img);
                    URL.revokeObjectURL(img.src);
                    
                    // predictions is sorted by probability descending
                    // Check if Porn or Hentai is highly probable (e.g. > 60%)
                    const explicit = predictions.find(p => 
                        (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.6
                    );
                    
                    if (explicit) resolve(false);
                    else resolve(true);
                } catch (e) {
                    console.error("NSFW check failed", e);
                    resolve(true); // default to allow if check breaks
                }
            };
            img.onerror = () => resolve(false);
        });
    };

    const handleRemove = () => {
        onChange('', null);
    };

    // Determine preview thumbnail shape
    const previewShape = cropShape === 'circle' ? 'rounded-full' : 'rounded-xl';

    return (
        <>
            <div className={`flex flex-col gap-2 ${className}`}>
                {label && <label className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body">{label}</label>}
                
                <div className="flex items-start gap-4">
                    {/* Preview Thumbnail */}
                    <div className="relative group shrink-0">
                        <img 
                            src={value || fallbackUrl} 
                            alt="Preview" 
                            className={`w-24 h-24 ${previewShape} object-cover ring-2 ring-gray-100 dark:ring-dark-border bg-gray-50 flex-shrink-0`}
                            onError={(e) => (e.currentTarget.src = fallbackUrl)}
                        />
                        {value && !uploading && (
                            <button 
                                type="button" 
                                onClick={handleRemove}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 focus:opacity-100"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 flex flex-col justify-center gap-2">
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            id={uniqueId.current}
                        />
                        <label 
                            htmlFor={uniqueId.current}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors cursor-pointer w-max ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4" />}
                            {uploading ? 'Processing...' : 'Choose Image'}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG, WEBP or GIF (Max 5MB)</p>
                        
                        {uploading && (
                            <div className="w-full max-w-xs bg-gray-200 dark:bg-dark-border rounded-full h-1.5 mt-1 overflow-hidden">
                                <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Crop Modal */}
            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    aspectRatio={aspectRatio}
                    cropShape={cropShape}
                    contextLabel={label}
                    onConfirm={handleCropConfirm}
                    onCancel={handleCropCancel}
                />
            )}
        </>
    );
};
