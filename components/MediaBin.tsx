import React, { useRef } from 'react';
import { MediaAsset } from '../types';

interface MediaBinProps {
    assets: MediaAsset[];
    onAddImage: (files: FileList) => void;
    onAddToTimeline: (asset: MediaAsset) => void;
}

const MediaBin: React.FC<MediaBinProps> = ({ assets, onAddImage, onAddToTimeline }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onAddImage(e.target.files);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-600 pb-2 text-cyan-400">Archivos Multimedia</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {assets.map(asset => (
                    <div key={asset.id} className="bg-gray-700 p-2 rounded-md flex items-center justify-between hover:bg-gray-600 transition-colors">
                        <div className="flex items-center space-x-2 truncate">
                            <img src={asset.data} alt={asset.name} className="w-10 h-10 object-cover rounded" />
                            <span className="text-sm truncate">{asset.name}</span>
                        </div>
                        <button
                            onClick={() => onAddToTimeline(asset)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-full transition-transform transform hover:scale-110"
                            title="Añadir a la línea de tiempo"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
            <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Subir Imágenes
            </button>
        </div>
    );
};

export default MediaBin;