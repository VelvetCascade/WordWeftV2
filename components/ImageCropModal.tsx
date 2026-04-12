import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, RotateCw, Grid3x3, ZoomIn, ZoomOut, Check, Crop, Move, Maximize2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CropArea {
    x: number;   // px from image left
    y: number;   // px from image top
    w: number;   // px width
    h: number;   // px height
}

type HandleType = 'body' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface DragState {
    type: HandleType;
    startX: number;   // pointer start in image-container coords
    startY: number;
    snapCrop: CropArea;
}

interface ImageCropModalProps {
    file: File;
    aspectRatio?: number;       // width/height, e.g. 2/3
    cropShape?: 'rect' | 'circle';
    contextLabel?: string;
    onConfirm: (croppedFile: File) => void;
    onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HANDLE_HIT_RADIUS = 18;   // px — generous touch/mouse hit area
const HANDLE_VIS_SIZE = 10;     // px — visual handle square size
const MIN_CROP_PX = 40;         // px — minimum crop dimension

// ─── Component ────────────────────────────────────────────────────────────────

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
    file,
    aspectRatio,
    cropShape = 'rect',
    contextLabel = 'Image',
    onConfirm,
    onCancel,
}) => {
    // Image loading
    const [imgSrc, setImgSrc] = useState('');
    const [natW, setNatW] = useState(0);
    const [natH, setNatH] = useState(0);
    const [loaded, setLoaded] = useState(false);

    // Display (how big the image renders in the canvas area)
    const [dispW, setDispW] = useState(0);
    const [dispH, setDispH] = useState(0);
    const [displayScale, setDisplayScale] = useState(1); // original-to-display ratio

    // Crop (all in display-image px relative to image top-left)
    const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, w: 200, h: 200 });

    // Controls
    const [rotation, setRotation] = useState(0);   // 0, 90, 180, 270 degrees
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [cursor, setCursor] = useState('default');

    // Refs
    const canvasAreaRef = useRef<HTMLDivElement>(null);
    const imgContainerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);          // visible display img
    const loaderImgRef = useRef<HTMLImageElement | null>(null); // hidden loader img (for canvas ops)
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const isDraggingRef = useRef(false);

    // Stable refs for values accessed in event handlers (prevents stale closures)
    const onCancelRef = useRef(onCancel);
    onCancelRef.current = onCancel;
    const onConfirmRef = useRef(onConfirm);
    onConfirmRef.current = onConfirm;
    const cropRef = useRef(crop);
    cropRef.current = crop;
    const aspectRatioRef = useRef(aspectRatio);
    aspectRatioRef.current = aspectRatio;
    const dispWRef = useRef(dispW);
    dispWRef.current = dispW;
    const dispHRef = useRef(dispH);
    dispHRef.current = dispH;

    // ── Load image ──────────────────────────────────────────────────────────

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setImgSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // ── Compute display size ─────────────────────────────────────────────────

    const computeLayout = useCallback((nw: number, nh: number, rot: number) => {
        const container = canvasAreaRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const pad = 48;
        const maxW = Math.max(rect.width - pad * 2, 80);
        const maxH = Math.max(rect.height - pad * 2, 80);

        // For 90°/270° the effective visual size has width/height swapped
        const isRotated90 = rot === 90 || rot === 270;
        const effectiveW = isRotated90 ? nh : nw;
        const effectiveH = isRotated90 ? nw : nh;

        const scale = Math.min(maxW / effectiveW, maxH / effectiveH, 1);
        const dw = Math.round(effectiveW * scale);
        const dh = Math.round(effectiveH * scale);

        setDispW(dw);
        setDispH(dh);
        setDisplayScale(scale);

        // Initialise crop centred with 85% coverage
        let cw: number, ch: number;
        if (aspectRatio) {
            if (dw / dh > aspectRatio) {
                ch = dh * 0.85;
                cw = ch * aspectRatio;
            } else {
                cw = dw * 0.85;
                ch = cw / aspectRatio;
            }
        } else {
            cw = dw * 0.85;
            ch = dh * 0.85;
        }
        cw = Math.min(cw, dw);
        ch = Math.min(ch, dh);

        setCrop({
            x: (dw - cw) / 2,
            y: (dh - ch) / 2,
            w: cw,
            h: ch,
        });
    }, [aspectRatio]);

    const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        // Store the decoded image element for canvas operations
        loaderImgRef.current = img;
        setNatW(nw);
        setNatH(nh);
        // computeLayout needs the canvas area container to be mounted — defer one tick
        requestAnimationFrame(() => {
            computeLayout(nw, nh, 0);
            setLoaded(true);
        });
    };

    // ── Rotation control ─────────────────────────────────────────────────────

    const handleRotate = (dir: 'cw' | 'ccw') => {
        // NOTE: using functional updates so this does NOT create a new closure
        setRotation(prev => {
            const next = ((prev + (dir === 'cw' ? 90 : -90)) % 360 + 360) % 360;
            // Re-compute layout with this new rotation (we need natW/natH from refs)
            if (natW && natH) computeLayout(natW, natH, next);
            return next;
        });
    };

    // ── Keyboard shortcuts ────────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Do not handle Enter here — that would conflict with button focus
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancelRef.current();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []); // Empty deps — uses onCancelRef to stay fresh

    // ── Document-level pointer listeners for drag ────────────────────────────

    useEffect(() => {
        const getXY = (e: MouseEvent | TouchEvent): { px: number; py: number } => {
            const rect = imgContainerRef.current?.getBoundingClientRect();
            if (!rect) return { px: 0, py: 0 };
            const touch = 'touches' in e ? (e.touches[0] || e.changedTouches[0]) : null;
            const cx = touch ? touch.clientX : (e as MouseEvent).clientX;
            const cy = touch ? touch.clientY : (e as MouseEvent).clientY;
            return { px: cx - rect.left, py: cy - rect.top };
        };

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragRef.current || !imgContainerRef.current) return;
            if ('touches' in e) e.preventDefault();

            const { px, py } = getXY(e);
            const dx = px - dragRef.current.startX;
            const dy = py - dragRef.current.startY;
            const { type, snapCrop: sc } = dragRef.current;

            const iW = dispWRef.current;
            const iH = dispHRef.current;
            const ar = aspectRatioRef.current;

            setCrop(() => {
                if (type === 'body') {
                    return {
                        ...sc,
                        x: Math.max(0, Math.min(sc.x + dx, iW - sc.w)),
                        y: Math.max(0, Math.min(sc.y + dy, iH - sc.h)),
                    };
                }

                // ── Aspect-ratio-locked resize ────────────────────────────
                if (ar) {
                    let nw = sc.w, nh = sc.h, nx = sc.x, ny = sc.y;

                    if (type === 'se') {
                        nw = sc.w + dx;
                        nh = sc.h + dy;
                        // Use whichever delta gives us larger crop
                        const scaleW = nw / sc.w;
                        const scaleH = nh / sc.h;
                        const s = Math.max(scaleW, scaleH, 0);
                        nw = sc.w * s; nh = sc.h * s;
                        nx = sc.x; ny = sc.y;
                    } else if (type === 'sw') {
                        nw = sc.w - dx;
                        nh = sc.h + dy;
                        const s = Math.max(nw / sc.w, nh / sc.h, 0);
                        nw = sc.w * s; nh = sc.h * s;
                        nx = sc.x + sc.w - nw; ny = sc.y;
                    } else if (type === 'ne') {
                        nw = sc.w + dx;
                        nh = sc.h - dy;
                        const s = Math.max(nw / sc.w, nh / sc.h, 0);
                        nw = sc.w * s; nh = sc.h * s;
                        nx = sc.x; ny = sc.y + sc.h - nh;
                    } else if (type === 'nw') {
                        nw = sc.w - dx;
                        nh = sc.h - dy;
                        const s = Math.max(nw / sc.w, nh / sc.h, 0);
                        nw = sc.w * s; nh = sc.h * s;
                        nx = sc.x + sc.w - nw; ny = sc.y + sc.h - nh;
                    }

                    // Enforce minimum size
                    if (nw < MIN_CROP_PX) { nw = MIN_CROP_PX; nh = nw / ar; }
                    if (nh < MIN_CROP_PX / ar) { nh = MIN_CROP_PX / ar; nw = nh * ar; }

                    // Clamp to image bounds
                    nx = Math.max(0, nx);
                    ny = Math.max(0, ny);
                    if (nx + nw > iW) { nw = iW - nx; nh = nw / ar; }
                    if (ny + nh > iH) { nh = iH - ny; nw = nh * ar; }
                    nx = Math.max(0, nx);
                    ny = Math.max(0, ny);

                    return { x: nx, y: ny, w: Math.max(MIN_CROP_PX, nw), h: Math.max(MIN_CROP_PX / ar, nh) };
                }

                // ── Free-form resize ─────────────────────────────────────
                let { x, y, w, h } = sc;

                if (type.includes('e')) w = Math.max(MIN_CROP_PX, sc.w + dx);
                if (type.includes('w')) {
                    w = Math.max(MIN_CROP_PX, sc.w - dx);
                    x = sc.x + sc.w - w;
                }
                if (type.includes('s')) h = Math.max(MIN_CROP_PX, sc.h + dy);
                if (type.includes('n')) {
                    h = Math.max(MIN_CROP_PX, sc.h - dy);
                    y = sc.y + sc.h - h;
                }

                // Clamp to image bounds
                x = Math.max(0, x);
                y = Math.max(0, y);
                if (x + w > iW) w = iW - x;
                if (y + h > iH) h = iH - y;
                w = Math.max(MIN_CROP_PX, w);
                h = Math.max(MIN_CROP_PX, h);

                return { x, y, w, h };
            });
        };

        const onUp = () => {
            dragRef.current = null;
            isDraggingRef.current = false;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);

        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
        };
    }, []); // Empty deps — reads from refs

    // ── Pointer down on image container ─────────────────────────────────────

    const getHandleAt = useCallback((px: number, py: number): HandleType | null => {
        const { x, y, w, h } = cropRef.current;
        const handles: [HandleType, number, number][] = [
            ['nw', x, y], ['ne', x + w, y],
            ['sw', x, y + h], ['se', x + w, y + h],
        ];
        if (!aspectRatio) {
            handles.push(
                ['n', x + w / 2, y], ['s', x + w / 2, y + h],
                ['e', x + w, y + h / 2], ['w', x, y + h / 2],
            );
        }
        for (const [type, hx, hy] of handles) {
            if (Math.hypot(px - hx, py - hy) < HANDLE_HIT_RADIUS) return type;
        }
        return null;
    }, [aspectRatio]);

    const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!imgContainerRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const touch = 'touches' in e ? e.touches[0] : null;
        const cx = touch ? touch.clientX : (e as React.MouseEvent).clientX;
        const cy = touch ? touch.clientY : (e as React.MouseEvent).clientY;

        const rect = imgContainerRef.current.getBoundingClientRect();
        const px = cx - rect.left;
        const py = cy - rect.top;

        const handle = getHandleAt(px, py);
        const c = cropRef.current;

        if (handle) {
            dragRef.current = { type: handle, startX: px, startY: py, snapCrop: { ...c } };
            isDraggingRef.current = true;
            return;
        }

        // Inside crop body?
        if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
            dragRef.current = { type: 'body', startX: px, startY: py, snapCrop: { ...c } };
            isDraggingRef.current = true;
        }
    }, [getHandleAt]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!imgContainerRef.current || isDraggingRef.current) return;
        const rect = imgContainerRef.current.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        const handle = getHandleAt(px, py);
        if (handle) {
            const cursors: Record<HandleType, string> = {
                body: 'move', nw: 'nwse-resize', se: 'nwse-resize',
                ne: 'nesw-resize', sw: 'nesw-resize',
                n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
            };
            setCursor(cursors[handle]);
            return;
        }
        const c = cropRef.current;
        if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
            setCursor('move');
        } else {
            setCursor('default');
        }
    }, [getHandleAt]);

    // ── Live preview canvas ──────────────────────────────────────────────────

    useEffect(() => {
        if (!loaded || !loaderImgRef.current || !previewCanvasRef.current) return;

        const img = loaderImgRef.current;
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx || dispW === 0 || dispH === 0) return;

        // Crop in display-px → translate to rotated-image natural px
        const isRotated90 = rotation === 90 || rotation === 270;
        const rotNatW = isRotated90 ? natH : natW;
        const rotNatH = isRotated90 ? natW : natH;

        const scaleX = rotNatW / dispW;
        const scaleY = rotNatH / dispH;

        const origX = crop.x * scaleX;
        const origY = crop.y * scaleY;
        const origW = crop.w * scaleX;
        const origH = crop.h * scaleY;

        // Preview output size
        const pW = 180;
        const pAR = crop.w / Math.max(crop.h, 1);
        const pH = aspectRatio ? pW / aspectRatio : pW / pAR;

        canvas.width = Math.round(pW);
        canvas.height = Math.round(Math.max(pH, 1));
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Build the rotated image in a temp canvas then crop from it
        const tmpC = document.createElement('canvas');
        tmpC.width = rotNatW;
        tmpC.height = rotNatH;
        const tmpCtx = tmpC.getContext('2d')!;

        tmpCtx.save();
        tmpCtx.translate(rotNatW / 2, rotNatH / 2);
        tmpCtx.rotate((rotation * Math.PI) / 180);
        // After rotation (90°), the original natW becomes height → offset -natW/2
        tmpCtx.drawImage(img, -natW / 2, -natH / 2, natW, natH);
        tmpCtx.restore();

        ctx.drawImage(tmpC, origX, origY, origW, origH, 0, 0, pW, Math.max(pH, 1));
    }, [crop, rotation, loaded, natW, natH, dispW, dispH, aspectRatio]);

    // ── Image CSS for rotated display ────────────────────────────────────────

    const getImgCSS = (): React.CSSProperties => {
        // For 0°/180° the container and img share the same w/h
        if (rotation === 0) {
            return { width: '100%', height: '100%', display: 'block', userSelect: 'none' };
        }
        if (rotation === 180) {
            return { width: '100%', height: '100%', display: 'block', transform: 'rotate(180deg)', userSelect: 'none' };
        }
        // For 90°/270°: the "container" is { dispW × dispH } = { natH*scale × natW*scale }
        // The img's natural display size (un-rotated) is { natW*scale × natH*scale } = { dispH × dispW }
        // We rotate it 90°/270° so it visually becomes dispW × dispH again.
        // We position it absolutely centred within the container.
        const imgW = dispH; // natural dimension width at display scale
        const imgH = dispW; // natural dimension height at display scale
        return {
            position: 'absolute',
            width: imgW,
            height: imgH,
            top: (dispH - imgH) / 2,
            left: (dispW - imgW) / 2,
            display: 'block',
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
            userSelect: 'none',
        };
    };

    // ── Export ────────────────────────────────────────────────────────────────

    const handleConfirm = useCallback(async () => {
        if (!loaderImgRef.current || isExporting || !loaded) return;
        setIsExporting(true);

        try {
            const img = loaderImgRef.current;
            const isRotated90 = rotation === 90 || rotation === 270;
            const rotNatW = isRotated90 ? natH : natW;
            const rotNatH = isRotated90 ? natW : natH;

            const scaleX = rotNatW / dispW;
            const scaleY = rotNatH / dispH;

            const origX = crop.x * scaleX;
            const origY = crop.y * scaleY;
            const origW = crop.w * scaleX;
            const origH = crop.h * scaleY;

            // Create rotated source canvas
            const tmpC = document.createElement('canvas');
            tmpC.width = rotNatW;
            tmpC.height = rotNatH;
            const tmpCtx = tmpC.getContext('2d')!;
            tmpCtx.save();
            tmpCtx.translate(rotNatW / 2, rotNatH / 2);
            tmpCtx.rotate((rotation * Math.PI) / 180);
            tmpCtx.drawImage(img, -natW / 2, -natH / 2, natW, natH);
            tmpCtx.restore();

            // Crop to output canvas
            const outW = Math.round(origW);
            const outH = Math.round(origH);
            const outC = document.createElement('canvas');
            outC.width = outW;
            outC.height = outH;
            const outCtx = outC.getContext('2d')!;
            outCtx.drawImage(tmpC, origX, origY, origW, origH, 0, 0, outW, outH);

            const blob = await new Promise<Blob>((resolve, reject) =>
                outC.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/jpeg', 0.92)
            );

            const croppedFile = new File([blob], file.name || 'cropped.jpg', { type: 'image/jpeg' });
            onConfirmRef.current(croppedFile);
        } catch (err) {
            console.error('Crop export failed:', err);
            setIsExporting(false);
        }
    }, [isExporting, loaded, rotation, natW, natH, dispW, dispH, crop, file.name]);

    // ── Render handles ────────────────────────────────────────────────────────

    const renderHandles = () => {
        const { x, y, w, h } = crop;

        const corners: [HandleType, number, number][] = [
            ['nw', x, y], ['ne', x + w, y],
            ['sw', x, y + h], ['se', x + w, y + h],
        ];
        const edges: [HandleType, number, number][] = !aspectRatio ? [
            ['n', x + w / 2, y], ['s', x + w / 2, y + h],
            ['e', x + w, y + h / 2], ['w', x, y + h / 2],
        ] : [];

        const cursorMap: Record<HandleType, string> = {
            body: 'move', nw: 'nwse-resize', se: 'nwse-resize',
            ne: 'nesw-resize', sw: 'nesw-resize',
            n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
        };

        return [...corners, ...edges].map(([type, hx, hy]) => {
            const isCorner = corners.some(([t]) => t === type);
            return (
                <div
                    key={type}
                    style={{
                        position: 'absolute',
                        left: hx - HANDLE_VIS_SIZE / 2,
                        top: hy - HANDLE_VIS_SIZE / 2,
                        width: HANDLE_VIS_SIZE,
                        height: HANDLE_VIS_SIZE,
                        background: '#ffffff',
                        border: '2px solid #8D6E63',
                        borderRadius: isCorner ? '3px' : '50%',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(141,110,99,0.4)',
                        cursor: cursorMap[type],
                        zIndex: 21,
                        // Extend hit area without affecting visual via pseudo — use border-box trick
                        pointerEvents: 'none', // handled via imgContainerRef mousedown
                    }}
                />
            );
        });
    };

    // ── Preview dimensions ─────────────────────────────────────────────────
    const previewW = 170;
    const previewH = aspectRatio
        ? previewW / aspectRatio
        : (crop.h / Math.max(crop.w, 1)) * previewW;

    const clampedPreviewH = Math.min(previewH, 250);

    // Dimension readout in original pixels
    const isRotated90 = rotation === 90 || rotation === 270;
    const rotNatW = isRotated90 ? natH : natW;
    const rotNatH = isRotated90 ? natW : natH;
    const origCropW = dispW > 0 ? Math.round(crop.w * (rotNatW / dispW)) : 0;
    const origCropH = dispH > 0 ? Math.round(crop.h * (rotNatH / dispH)) : 0;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className="crop-modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) onCancelRef.current(); }}
        >
            <div className="crop-modal-container">

                {/* ── Header ───────────────────────────────────────────── */}
                <div className="crop-modal-header">
                    <button
                        type="button"
                        onClick={() => onCancelRef.current()}
                        className="crop-modal-close-btn"
                        title="Cancel (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="crop-modal-title">
                        <Crop className="w-5 h-5" />
                        <span>Crop {contextLabel}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isExporting || !loaded}
                        className="crop-modal-confirm-btn"
                        title="Confirm"
                    >
                        <Check className="w-4 h-4" />
                        <span>{isExporting ? 'Processing…' : 'Done'}</span>
                    </button>
                </div>

                {/* ── Body ─────────────────────────────────────────────── */}
                <div className="crop-modal-body">

                    {/* Crop canvas area */}
                    <div
                        ref={canvasAreaRef}
                        className="crop-canvas-area"
                        style={{ cursor }}
                    >
                        {/* Hidden loader img — always in DOM so onLoad fires immediately */}
                        <img
                            src={imgSrc}
                            alt=""
                            onLoad={handleImgLoad}
                            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                            draggable={false}
                        />

                        {!loaded && (
                            <div className="crop-loading">
                                <div className="crop-loading-spinner" />
                                <span>Loading image…</span>
                            </div>
                        )}

                        {loaded && (
                            <div
                                ref={imgContainerRef}
                                style={{
                                    position: 'relative',
                                    width: dispW,
                                    height: dispH,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'center',
                                    userSelect: 'none',
                                }}
                                onMouseDown={onPointerDown}
                                onMouseMove={onMouseMove}
                                onTouchStart={onPointerDown}
                            >
                                {/* Visible image — same src, no onLoad needed */}
                                <img
                                    ref={imgRef}
                                    src={imgSrc}
                                    alt=""
                                    style={getImgCSS()}
                                    draggable={false}
                                />

                                {/* Dim overlays — 4 rects around crop box */}
                                {/* Top */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    top: 0, left: 0, right: 0, height: crop.y,
                                    background: 'rgba(0,0,0,0.52)', pointerEvents: 'none',
                                }} />
                                {/* Bottom */}
                                <div style={{
                                    position: 'absolute',
                                    top: crop.y + crop.h, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.52)', pointerEvents: 'none',
                                }} />
                                {/* Left */}
                                <div style={{
                                    position: 'absolute',
                                    top: crop.y, left: 0, width: crop.x, height: crop.h,
                                    background: 'rgba(0,0,0,0.52)', pointerEvents: 'none',
                                }} />
                                {/* Right */}
                                <div style={{
                                    position: 'absolute',
                                    top: crop.y, left: crop.x + crop.w, right: 0, height: crop.h,
                                    background: 'rgba(0,0,0,0.52)', pointerEvents: 'none',
                                }} />

                                {/* Circle dim overlay */}
                                {cropShape === 'circle' && (
                                    <div style={{
                                        position: 'absolute',
                                        left: crop.x, top: crop.y,
                                        width: crop.w, height: crop.h,
                                        borderRadius: '50%',
                                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
                                        pointerEvents: 'none',
                                        zIndex: 5,
                                    }} />
                                )}

                                {/* Crop border */}
                                <div style={{
                                    position: 'absolute',
                                    left: crop.x, top: crop.y,
                                    width: crop.w, height: crop.h,
                                    border: '2px solid rgba(255,255,255,0.85)',
                                    borderRadius: cropShape === 'circle' ? '50%' : 3,
                                    boxSizing: 'border-box',
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                }}>
                                    {showGrid && (
                                        <>
                                            <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                                            <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                                            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                                            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                                        </>
                                    )}
                                </div>

                                {/* Handles */}
                                {renderHandles()}
                            </div>
                        )}
                    </div>

                    {/* ── Preview sidebar ───────────────────────────────── */}
                    <div className="crop-preview-panel">
                        <div className="crop-preview-section">
                            <span className="crop-preview-heading">Live Preview</span>

                            <div
                                className="crop-preview-frame"
                                style={{
                                    width: previewW,
                                    height: clampedPreviewH,
                                    borderRadius: cropShape === 'circle' ? '50%' : 12,
                                }}
                            >
                                <canvas
                                    ref={previewCanvasRef}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: cropShape === 'circle' ? '50%' : 12,
                                    }}
                                />
                            </div>

                            <div className="crop-preview-context-label">
                                {contextLabel}
                            </div>

                            {origCropW > 0 && (
                                <div className="crop-dimension-chip">
                                    {origCropW} × {origCropH} px
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="crop-tips">
                            <p className="crop-tip-heading">Tips</p>
                            <div className="crop-tip-item">
                                <Move className="w-3.5 h-3.5" />
                                <span>Drag to reposition</span>
                            </div>
                            <div className="crop-tip-item">
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Corner handles to resize</span>
                            </div>
                            <div className="crop-tip-item">
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Zoom to check details</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer toolbar ────────────────────────────────────── */}
                <div className="crop-modal-footer">

                    {/* Rotate */}
                    <div className="crop-toolbar-group">
                        <button type="button" onClick={() => handleRotate('ccw')} className="crop-toolbar-btn" title="Rotate counter-clockwise">
                            <RotateCcw className="w-4 h-4" />
                            <span className="crop-toolbar-btn-label">Rotate</span>
                        </button>
                        <button type="button" onClick={() => handleRotate('cw')} className="crop-toolbar-btn" title="Rotate clockwise">
                            <RotateCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="crop-toolbar-divider" />

                    {/* Grid */}
                    <button
                        type="button"
                        onClick={() => setShowGrid(g => !g)}
                        className={`crop-toolbar-btn ${showGrid ? 'crop-toolbar-btn-active' : ''}`}
                        title="Toggle rule-of-thirds grid"
                    >
                        <Grid3x3 className="w-4 h-4" />
                        <span className="crop-toolbar-btn-label">Grid</span>
                    </button>

                    <div className="crop-toolbar-divider" />

                    {/* Zoom */}
                    <div className="crop-zoom-control">
                        <button
                            type="button"
                            onClick={() => setZoom(z => Math.max(0.5, parseFloat((z - 0.1).toFixed(1))))}
                            className="crop-toolbar-btn"
                            style={{ padding: '7px 8px' }}
                            title="Zoom out"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={zoom}
                            onChange={e => setZoom(parseFloat(e.target.value))}
                            className="crop-zoom-slider"
                            aria-label="Zoom level"
                        />
                        <button
                            type="button"
                            onClick={() => setZoom(z => Math.min(3, parseFloat((z + 0.1).toFixed(1))))}
                            className="crop-toolbar-btn"
                            style={{ padding: '7px 8px' }}
                            title="Zoom in"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <span className="crop-zoom-label">{Math.round(zoom * 100)}%</span>
                    </div>

                </div>
            </div>
        </div>
    );
};
