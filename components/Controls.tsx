import React from 'react';
import { Clip, Overlay } from '../types';
import AIEditor from './AIEditor';
import NarrationTool from './NarrationTool';
import OverlayEditor from './OverlayEditor';

interface ControlsProps {
    selectedClip: Clip | null;
    onUpdateClip: (clip: Clip) => void;
    onAddOverlay: (data: string) => void;
    selectedOverlayId: string | null;
    onUpdateOverlay: (overlay: Overlay) => void;
    onDeleteOverlay: (overlayId: string) => void;
    onExport: () => void;
    isExporting: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
    selectedClip,
    onUpdateClip,
    onAddOverlay,
    selectedOverlayId,
    onUpdateOverlay,
    onDeleteOverlay,
    onExport,
    isExporting,
 }) => {
    
    const selectedOverlay = selectedClip?.overlays?.find(o => o.id === selectedOverlayId) || null;

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-600 pb-2 text-cyan-400">Herramientas</h2>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {selectedOverlay && selectedClip ? (
                    <OverlayEditor
                        key={selectedOverlay.id}
                        overlay={selectedOverlay}
                        onUpdate={onUpdateOverlay}
                        onDelete={() => onDeleteOverlay(selectedOverlay.id)}
                    />
                ) : selectedClip ? (
                   <div className="space-y-6">
                        <AIEditor 
                            key={`ai-${selectedClip.id}`} 
                            onAddOverlay={onAddOverlay}
                        />
                         <div className="border-t border-gray-700"></div>
                        <NarrationTool
                            key={`narration-${selectedClip.id}`}
                            clip={selectedClip}
                            onUpdateClip={onUpdateClip}
                        />
                   </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 text-center">Selecciona un clip de la línea de tiempo para editarlo.</p>
                    </div>
                )}
            </div>
             <button
                onClick={onExport}
                disabled={isExporting}
                className="mt-4 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex-shrink-0"
            >
                {isExporting ? 'Exportando...' : 'Exportar Video'}
            </button>
        </div>
    );
};

export default Controls;