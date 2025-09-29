import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Clip, MediaAsset, Overlay } from './types';
import Header from './components/Header';
import MediaBin from './components/MediaBin';
import Preview from './components/Preview';
import Timeline from './components/Timeline';
import Controls from './components/Controls';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
    const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
    const [clips, setClips] = useState<Clip[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    const [playbackTime, setPlaybackTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    
    const previewRef = useRef<HTMLCanvasElement>(null);

    const totalDuration = clips.reduce((acc, clip) => acc + clip.duration, 0);

    const handleSelectClip = (id: string | null) => {
        setSelectedClipId(id);
        setSelectedOverlayId(null); // Deselect overlay when clip changes
    }

    const handleAddImage = (files: FileList) => {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setMediaAssets(prev => [
                        ...prev, 
                        { id: uuidv4(), type: 'image', data: e.target?.result as string, name: file.name }
                    ]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const addClip = (asset: MediaAsset) => {
        const newClip: Clip = {
            id: uuidv4(),
            assetId: asset.id,
            duration: 5, // Default duration in seconds
            overlays: []
        };
        setClips(prev => [...prev, newClip]);
    };
    
    const updateClip = (updatedClip: Clip) => {
        setClips(clips.map(c => c.id === updatedClip.id ? updatedClip : c));
    };
    
    const addOverlayToClip = (clipId: string, overlayData: string) => {
        const img = new Image();
        img.onload = () => {
            const newOverlay: Overlay = {
                id: uuidv4(),
                data: overlayData,
                x: 0.5,
                y: 0.5,
                scale: 0.25,
                rotation: 0,
                width: img.width,
                height: img.height,
            };
            setClips(prevClips => prevClips.map(clip => {
                if (clip.id === clipId) {
                    return {
                        ...clip,
                        overlays: [...(clip.overlays || []), newOverlay]
                    };
                }
                return clip;
            }));
        };
        img.src = overlayData;
    };

    const updateOverlay = (clipId: string, updatedOverlay: Overlay) => {
        setClips(prevClips => prevClips.map(clip => {
            if (clip.id === clipId) {
                return {
                    ...clip,
                    overlays: (clip.overlays || []).map(o => o.id === updatedOverlay.id ? updatedOverlay : o)
                };
            }
            return clip;
        }));
    };

    const deleteOverlay = (clipId: string, overlayId: string) => {
        setClips(prevClips => prevClips.map(clip => {
            if (clip.id === clipId) {
                return {
                    ...clip,
                    overlays: (clip.overlays || []).filter(o => o.id !== overlayId)
                };
            }
            return clip;
        }));
        setSelectedOverlayId(null);
    };

    const play = useCallback(() => {
        if (clips.length === 0) return;
        setSelectedOverlayId(null);
        setIsPlaying(true);
    }, [clips.length]);

    const pause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        if (isPlaying) {
            const startTime = performance.now() - playbackTime * 1000;
            const animate = () => {
                const elapsed = (performance.now() - startTime) / 1000;
                setPlaybackTime(elapsed);
                if (elapsed >= totalDuration) {
                    setPlaybackTime(totalDuration);
                    pause();
                } else {
                    animationFrameId = requestAnimationFrame(animate);
                }
            };
            animationFrameId = requestAnimationFrame(animate);
        } else {
            setPlaybackTime(prev => prev);
        }
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, totalDuration, pause, playbackTime]);
    
    const handleSeek = (time: number) => {
        const newTime = Math.max(0, Math.min(time, totalDuration));
        if(isPlaying) pause();
        setPlaybackTime(newTime);
    };

    const handleExport = async () => {
        if (!previewRef.current || clips.length === 0) {
            alert("Por favor, añade algunos clips a la línea de tiempo antes de exportar.");
            return;
        }
        setIsExporting(true);
        setSelectedOverlayId(null);
        
        let mixedAudioTrack: MediaStreamTrack | null = null;
        const audioContext = new AudioContext();
        
        try {
            const audioClips = clips.filter(c => c.audio);
            if (audioClips.length > 0) {
                const destination = audioContext.createMediaStreamDestination();
                let startTime = 0;
                for (const clip of clips) {
                    if (clip.audio) {
                        const arrayBuffer = await clip.audio.blob.arrayBuffer();
                        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                        const source = audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(destination);
                        source.start(startTime);
                    }
                    startTime += clip.duration;
                }
                mixedAudioTrack = destination.stream.getAudioTracks()[0];
            }

            const canvas = previewRef.current;
            const videoStream = canvas.captureStream(30);
            const outputStream = new MediaStream(videoStream.getVideoTracks());
            if (mixedAudioTrack) {
                outputStream.addTrack(mixedAudioTrack);
            }

            const recorder = new MediaRecorder(outputStream, { mimeType: 'video/webm; codecs=vp9,opus' });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'video-editado-con-ia.webm';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setIsExporting(false);
                if (mixedAudioTrack) mixedAudioTrack.stop();
                audioContext.close();
                setPlaybackTime(0);
            };

            recorder.start();
            
            handleSeek(0);
            let elapsed = 0;
            const frameInterval = 1000 / 30; // 30 fps
            const renderLoop = setInterval(() => {
                elapsed += frameInterval / 1000;
                setPlaybackTime(elapsed);
                if (elapsed >= totalDuration) {
                    clearInterval(renderLoop);
                    recorder.stop();
                }
            }, frameInterval);

        } catch (e) {
            console.error("Error durante la exportación:", e);
            alert("Ocurrió un error durante la exportación. Por favor, revisa la consola para más detalles.");
            setIsExporting(false);
            audioContext.close();
        }
    };

    const selectedClip = clips.find(c => c.id === selectedClipId) || null;
    
    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <div className="w-1/4 flex flex-col p-4 space-y-4 border-r border-gray-700">
                    <MediaBin assets={mediaAssets} onAddImage={handleAddImage} onAddToTimeline={addClip} />
                </div>
                <div className="flex-1 flex flex-col p-4">
                    <div className="flex-1 bg-black rounded-lg mb-4 flex items-center justify-center">
                       <Preview
                          ref={previewRef}
                          clips={clips}
                          mediaAssets={mediaAssets}
                          playbackTime={playbackTime}
                          selectedClipId={selectedClipId}
                          selectedOverlayId={selectedOverlayId}
                          onSelectOverlay={setSelectedOverlayId}
                          onUpdateOverlay={(overlay) => selectedClipId && updateOverlay(selectedClipId, overlay)}
                          isPlaying={isPlaying}
                       />
                    </div>
                    <Timeline
                        clips={clips}
                        selectedClipId={selectedClipId}
                        onSelectClip={handleSelectClip}
                        onUpdateClip={updateClip}
                        playbackTime={playbackTime}
                        totalDuration={totalDuration}
                        onSeek={handleSeek}
                        isPlaying={isPlaying}
                        onPlay={play}
                        onPause={pause}
                    />
                </div>
                <div className="w-1/4 flex flex-col p-4 space-y-4 border-l border-gray-700">
                    <Controls 
                        selectedClip={selectedClip}
                        onUpdateClip={updateClip}
                        onAddOverlay={(data) => selectedClip && addOverlayToClip(selectedClip.id, data)}
                        selectedOverlayId={selectedOverlayId}
                        onUpdateOverlay={(overlay) => selectedClip && updateOverlay(selectedClip.id, overlay)}
                        onDeleteOverlay={(overlayId) => selectedClip && deleteOverlay(selectedClip.id, overlayId)}
                        onExport={handleExport}
                        isExporting={isExporting}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;