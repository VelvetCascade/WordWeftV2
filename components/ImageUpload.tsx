import React, { useState, useRef } from 'react';
import { getImageKitAuth, reportImageUploadDiagnostic, uploadImageToImageKit } from '../api/client';
import imageCompression from 'browser-image-compression';
import { Upload, X, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';
import { newUploadReference, uploadErrorMessage } from '../utils/uploadDiagnostics';

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
    disabled?: boolean;
    onBusyChange?: (busy: boolean) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    className = "",
    fallbackUrl = "https://via.placeholder.com/150",
    label = "Upload Image",
    aspectRatio,
    cropShape = 'rect',
    disabled = false,
    onBusyChange,
}) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState('');
    const [uploadReference, setUploadReference] = useState('');
    const [retryFile, setRetryFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadingRef = useRef(false);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const uniqueId = useRef(`image-upload-${Math.random().toString(36).slice(2, 8)}`);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Choose a JPG, PNG, or WEBP image.');
            e.target.value = '';
            return;
        }

        // 1. Size Check (5MB max before compression)
        if (file.size > 5 * 1024 * 1024) {
            setError('This image is over 5 MB. Choose a smaller file and try again.');
            e.target.value = '';
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
        if (uploadingRef.current || disabled) return;
        uploadingRef.current = true;
        const reference = newUploadReference();
        setUploadReference(reference);
        setRetryFile(file);
        setError('');
        setUploading(true);
        onBusyChange?.(true);
        setProgress(5);
        setStatusText('Preparing image…');
        void reportImageUploadDiagnostic({ uploadId: reference, event: 'selected', contentType: file.type, sizeBytes: file.size }).catch(() => undefined);

        try {
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);
            setProgress(20);
            setStatusText('Starting secure upload…');

            const auth = await getImageKitAuth(reference);
            void reportImageUploadDiagnostic({ uploadId: reference, event: 'auth_ready', contentType: compressedFile.type, sizeBytes: compressedFile.size }).catch(() => undefined);
            setProgress(25);
            setStatusText('Uploading image…');

            const data = await uploadImageToImageKit(
                compressedFile,
                auth,
                file.name || compressedFile.name || 'upload.jpg',
                (providerProgress) => setProgress(25 + Math.round(providerProgress * 0.75)),
            );
            setProgress(100);
            setStatusText('Upload complete');
            setRetryFile(null);
            void reportImageUploadDiagnostic({ uploadId: reference, event: 'uploaded', contentType: compressedFile.type, sizeBytes: compressedFile.size, httpStatus: 200 }).catch(() => undefined);
            
            // Pass back URL and File ID
            onChange(data.url, data.fileId);

        } catch (err: any) {
            console.error(err);
            const message = uploadErrorMessage(err?.status, err?.diagnostic || err?.message);
            setError(message);
            void reportImageUploadDiagnostic({
                uploadId: reference,
                event: 'failed',
                contentType: file.type,
                sizeBytes: file.size,
                httpStatus: err?.status,
                message: String(err?.diagnostic || err?.message || 'client_upload_failure').slice(0, 300),
            }).catch(() => undefined);
        } finally {
            uploadingRef.current = false;
            setUploading(false);
            onBusyChange?.(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                        {value && !uploading && !disabled && (
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
                            disabled={uploading || disabled}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            id={uniqueId.current}
                        />
                        <label 
                            htmlFor={uniqueId.current}
                            aria-disabled={uploading || disabled}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors cursor-pointer w-max ${(uploading || disabled) ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4" />}
                            {uploading ? 'Processing...' : 'Choose Image'}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or WEBP (Max 5MB)</p>
                        
                        {uploading && (
                            <div className="w-full max-w-xs mt-1" role="status" aria-live="polite" aria-label={`${statusText} ${progress}%`}>
                                <div className="flex items-center justify-between mb-1 text-[11px] text-gray-500 dark:text-gray-400">
                                    <span>{statusText}</span><span>{progress}%</span>
                                </div>
                                <div className="bg-gray-200 dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="image-upload-error text-red-500 text-xs mt-1" role="alert">
                                <span><AlertCircle className="w-3 h-3" />{error}</span>
                                {uploadReference && <small>Reference: {uploadReference.slice(0, 8)}</small>}
                                {retryFile && <button type="button" onClick={() => processAndUpload(retryFile)} disabled={uploading}><RotateCcw className="w-3 h-3" /> Retry upload</button>}
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
