import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Clip, MediaAsset, Overlay } from '../types';

interface PreviewProps {
    clips: Clip[];
    mediaAssets: MediaAsset[];
    playbackTime: number;
    selectedClipId: string | null;
    selectedOverlayId: string | null;
    onSelectOverlay: (id: string | null) => void;
    onUpdateOverlay: (overlay: Overlay) => void;
    isPlaying: boolean;
}

type InteractionMode = 'move' | 'resize-br' | 'rotate' | null;

const HANDLE_SIZE = 10; // px

const Preview = forwardRef<HTMLCanvasElement, PreviewProps>(({ 
    clips, 
    mediaAssets, 
    playbackTime, 
    selectedClipId,
    selectedOverlayId,
    onSelectOverlay,
    onUpdateOverlay,
    isPlaying,
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useImperativeHandle(ref, () => canvasRef.current!);
    
    const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);
    const [startDragPos, setStartDragPos] = useState<{x: number, y: number} | null>(null);
    const [startOverlay, setStartOverlay] = useState<Overlay | null>(null);

    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

    const preloadedImages = (clip: Clip | null) => {
        if (!clip) return;
        const asset = mediaAssets.find(a => a.id === clip.assetId);
        if (asset && !imageCache.current.has(asset.id)) {
            const img = new Image();
            img.src = asset.data;
            imageCache.current.set(asset.id, img);
        }
        clip.overlays?.forEach(overlay => {
            if (!imageCache.current.has(overlay.id)) {
                const img = new Image();
                img.src = overlay.data;
                imageCache.current.set(overlay.id, img);
            }
        });
    };
    
    // Find current clip
    let accumulatedTime = 0;
    let currentClip: Clip | null = null;
    for (const clip of clips) {
        if (playbackTime >= accumulatedTime && playbackTime < accumulatedTime + clip.duration) {
            currentClip = clip;
            break;
        }
        accumulatedTime += clip.duration;
    }
    if (!currentClip && playbackTime >= accumulatedTime && clips.length > 0) {
      currentClip = clips[clips.length - 1];
    }
    
    useEffect(() => {
        preloadedImages(currentClip);
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (currentClip) {
            const asset = mediaAssets.find(a => a.id === currentClip!.assetId);
            if (asset) {
                const img = imageCache.current.get(asset.id) || new Image();
                if (!img.src) img.src = asset.data;
                
                const drawImage = () => {
                    const canvasAspect = canvas.width / canvas.height;
                    const imgAspect = img.width / img.height;
                    let drawWidth, drawHeight, x, y;

                    if (canvasAspect > imgAspect) {
                        drawHeight = canvas.height;
                        drawWidth = drawHeight * imgAspect;
                        x = (canvas.width - drawWidth) / 2;
                        y = 0;
                    } else {
                        drawWidth = canvas.width;
                        drawHeight = drawWidth / imgAspect;
                        x = 0;
                        y = (canvas.height - drawHeight) / 2;
                    }
                    ctx.drawImage(img, x, y, drawWidth, drawHeight);

                    // Draw overlays
                    currentClip?.overlays?.forEach(overlay => {
                        const overlayImg = imageCache.current.get(overlay.id) || new Image();
                        if (!overlayImg.src) overlayImg.src = overlay.data;
                        if(overlayImg.complete && overlayImg.naturalWidth > 0){
                           drawOverlay(ctx, overlayImg, overlay, canvas.width, canvas.height);
                        }
                    });

                    // Draw selection handles if an overlay is selected
                    if (selectedClipId === currentClip.id && selectedOverlayId && !isPlaying) {
                        const selectedOverlay = currentClip.overlays?.find(o => o.id === selectedOverlayId);
                        if (selectedOverlay) {
                            drawSelectionHandles(ctx, selectedOverlay, canvas.width, canvas.height);
                        }
                    }
                };

                if (img.complete && img.naturalWidth > 0) {
                    drawImage();
                } else {
                    img.onload = drawImage;
                }
            }
        }

    }, [currentClip, mediaAssets, selectedOverlayId, isPlaying, clips, playbackTime, onUpdateOverlay]);
    
    const getTransformedCoords = (overlay: Overlay, canvasW: number, canvasH: number) => {
        const { x, y, scale, rotation, width, height } = overlay;
        const centerX = x * canvasW;
        const centerY = y * canvasH;
        const rad = rotation * Math.PI / 180;
        
        const w = (width || 1) * scale;
        const h = (height || 1) * scale;


        const corners = [
            { x: -w/2, y: -h/2 }, // tl
            { x:  w/2, y: -h/2 }, // tr
            { x:  w/2, y:  h/2 }, // br
            { x: -w/2, y:  h/2 }, // bl
        ];

        return corners.map(corner => ({
            x: centerX + corner.x * Math.cos(rad) - corner.y * Math.sin(rad),
            y: centerY + corner.x * Math.sin(rad) + corner.y * Math.cos(rad),
        }));
    };

    const drawOverlay = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, overlay: Overlay, canvasW: number, canvasH: number) => {
        ctx.save();
        ctx.translate(overlay.x * canvasW, overlay.y * canvasH);
        ctx.rotate(overlay.rotation * Math.PI / 180);
        const w = (overlay.width || img.width) * overlay.scale;
        const h = (overlay.height || img.height) * overlay.scale;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
    };

    const drawSelectionHandles = (ctx: CanvasRenderingContext2D, overlay: Overlay, canvasW: number, canvasH: number) => {
        const coords = getTransformedCoords(overlay, canvasW, canvasH);
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;

        // Bounding box
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        ctx.lineTo(coords[1].x, coords[1].y);
        ctx.lineTo(coords[2].x, coords[2].y);
        ctx.lineTo(coords[3].x, coords[3].y);
        ctx.closePath();
        ctx.stroke();

        // Resize handle
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(coords[2].x - HANDLE_SIZE/2, coords[2].y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);

        // Rotation handle
        const rotHandleX = (coords[0].x + coords[1].x) / 2;
        const rotHandleY = (coords[0].y + coords[1].y) / 2;
        ctx.beginPath();
        ctx.moveTo(overlay.x * canvasW, overlay.y * canvasH);
        ctx.lineTo(rotHandleX, rotHandleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rotHandleX, rotHandleY, HANDLE_SIZE/2, 0, 2 * Math.PI);
        ctx.fill();
    };

    const getMousePos = (e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const isPointInPolygon = (point: {x: number, y: number}, polygon: {x: number, y: number}[]) => {
        let isInside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) isInside = !isInside;
        }
        return isInside;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isPlaying || !currentClip || currentClip.id !== selectedClipId) return;

        const pos = getMousePos(e);
        const canvas = canvasRef.current!;

        // First, check if we're interacting with the handles of an already selected overlay
        const selectedOverlay = currentClip.overlays?.find(o => o.id === selectedOverlayId);
        if (selectedOverlay) {
            const coords = getTransformedCoords(selectedOverlay, canvas.width, canvas.height);
            const brHandle = coords[2]; // Bottom-right resize handle
            const rotHandleCenter = { x: (coords[0].x + coords[1].x) / 2, y: (coords[0].y + coords[1].y) / 2 };

            // Check resize handle click
            if (Math.hypot(pos.x - brHandle.x, pos.y - brHandle.y) < HANDLE_SIZE) {
                setInteractionMode('resize-br');
                setStartDragPos(pos);
                setStartOverlay(selectedOverlay);
                return; // Stop further processing
            }

            // Check rotation handle click
            if (Math.hypot(pos.x - rotHandleCenter.x, pos.y - rotHandleCenter.y) < HANDLE_SIZE) {
                setInteractionMode('rotate');
                setStartDragPos(pos);
                setStartOverlay(selectedOverlay);
                return; // Stop further processing
            }
        }

        // If no handles were clicked, check if we're clicking on any overlay to select it
        const overlays = [...(currentClip.overlays || [])].reverse(); // Check from top to bottom
        for (const overlay of overlays) {
            const coords = getTransformedCoords(overlay, canvas.width, canvas.height);
            if (isPointInPolygon(pos, coords)) {
                // Clicked inside an overlay, select it and prepare for moving
                onSelectOverlay(overlay.id);
                setInteractionMode('move');
                setStartDragPos(pos);
                setStartOverlay(overlay);
                return; // Stop after finding the first one
            }
        }

        // If we clicked on the background (not on any overlay), deselect
        onSelectOverlay(null);
        setInteractionMode(null);
    };


    const handleMouseMove = (e: React.MouseEvent) => {
        if (!interactionMode || !startDragPos || !startOverlay) return;

        const pos = getMousePos(e);
        const canvas = canvasRef.current!;
        const dx = pos.x - startDragPos.x;
        const dy = pos.y - startDragPos.y;

        let updatedOverlay: Overlay | null = null;

        if (interactionMode === 'move') {
            updatedOverlay = {
                ...startOverlay,
                x: startOverlay.x + dx / canvas.width,
                y: startOverlay.y + dy / canvas.height,
            };
        } else if (interactionMode === 'rotate') {
             const centerX = startOverlay.x * canvas.width;
             const centerY = startOverlay.y * canvas.height;
             const startAngle = Math.atan2(startDragPos.y - centerY, startDragPos.x - centerX);
             const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
             const angleDiff = (currentAngle - startAngle) * 180 / Math.PI;
             updatedOverlay = {
                 ...startOverlay,
                 rotation: startOverlay.rotation + angleDiff,
             };
        } else if (interactionMode === 'resize-br') {
            const centerX = startOverlay.x * canvas.width;
            const centerY = startOverlay.y * canvas.height;
            const startDist = Math.hypot(startDragPos.x - centerX, startDragPos.y - centerY);
            const currentDist = Math.hypot(pos.x - centerX, pos.y - centerY);
            
            if (startDist > 0) {
                const scaleFactor = currentDist / startDist;
                 updatedOverlay = {
                    ...startOverlay,
                    scale: startOverlay.scale * scaleFactor,
                 };
            }
        }
        
        if (updatedOverlay) {
            onUpdateOverlay(updatedOverlay);
        }
    };

    const handleMouseUp = () => {
        setInteractionMode(null);
        setStartDragPos(null);
        setStartOverlay(null);
    };

    return <canvas 
        ref={canvasRef} 
        width="1280" 
        height="720" 
        className="w-full h-full object-contain rounded-lg cursor-grab"
        style={{ cursor: interactionMode === 'move' ? 'grabbing' : (interactionMode ? 'crosshair' : 'grab') }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    />;
});

Preview.displayName = 'Preview';
export default Preview;