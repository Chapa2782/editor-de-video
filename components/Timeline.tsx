import React from 'react';
import { Clip } from '../types';
import { PlayIcon, PauseIcon } from './icons/PlaybackIcons';

interface TimelineProps {
    clips: Clip[];
    selectedClipId: string | null;
    onSelectClip: (id: string | null) => void;
    onUpdateClip: (clip: Clip) => void;
    playbackTime: number;
    totalDuration: number;
    onSeek: (time: number) => void;
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
    clips,
    selectedClipId,
    onSelectClip,
    onUpdateClip,
    playbackTime,
    totalDuration,
    onSeek,
    isPlaying,
    onPlay,
    onPause,
}) => {
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        onSeek(totalDuration * percentage);
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-md font-semibold mb-3 text-cyan-400">Línea de Tiempo</h3>
            
            <div className="flex items-center space-x-4 mb-4">
                <button onClick={isPlaying ? onPause : onPlay} className="p-2 bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors">
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="text-sm font-mono">
                    {playbackTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
                </div>
            </div>

            {/* Scrubber Bar */}
            <div className="w-full bg-gray-700 h-6 rounded-lg cursor-pointer mb-4" onClick={handleSeek}>
                <div className="bg-gray-600 h-full rounded-lg relative">
                    <div 
                        className="bg-cyan-500 h-full rounded-lg" 
                        style={{ width: `${(totalDuration > 0 ? playbackTime / totalDuration : 0) * 100}%` }}
                    />
                    <div 
                        className="absolute top-0 h-full w-1 bg-red-500 transform -translate-x-1/2"
                        style={{ left: `${(totalDuration > 0 ? playbackTime / totalDuration : 0) * 100}%` }}
                    ></div>
                </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {clips.map(clip => (
                    <div
                        key={clip.id}
                        onClick={() => onSelectClip(clip.id)}
                        className={`p-2 rounded-md cursor-pointer transition-colors ${selectedClipId === clip.id ? 'bg-cyan-800 ring-2 ring-cyan-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Clip (Imagen) {clip.audio ? '🎵' : ''}</span>
                            <div className="flex items-center space-x-2">
                                <label htmlFor={`duration-${clip.id}`} className="text-xs">Duración:</label>
                                <input
                                    type="number"
                                    id={`duration-${clip.id}`}
                                    value={clip.duration}
                                    onChange={(e) => onUpdateClip({ ...clip, duration: Number(e.target.value) })}
                                    className="w-16 bg-gray-900 text-white p-1 rounded-md text-sm text-center"
                                    min="1"
                                    step="0.5"
                                />
                                <span className="text-xs">s</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Timeline;