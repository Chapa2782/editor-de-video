import React from 'react';
import { Overlay } from '../types';

interface OverlayEditorProps {
    overlay: Overlay;
    onUpdate: (overlay: Overlay) => void;
    onDelete: () => void;
}

const OverlayEditor: React.FC<OverlayEditorProps> = ({ overlay, onUpdate, onDelete }) => {
    
    const handleValueChange = (field: keyof Overlay, value: number) => {
        onUpdate({ ...overlay, [field]: value });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-md font-semibold text-gray-300">Editor de Elemento</h3>
            
            <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden bg-black p-2 flex items-center justify-center">
                 <img src={overlay.data} alt="Selected Overlay" className="max-w-full max-h-full object-contain" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <label htmlFor="overlay-x" className="block text-xs font-medium text-gray-400">Posición X</label>
                    <input
                        type="number"
                        id="overlay-x"
                        value={overlay.x.toFixed(3)}
                        onChange={(e) => handleValueChange('x', parseFloat(e.target.value))}
                        className="w-full mt-1 bg-gray-900 p-2 rounded-md border border-gray-600"
                        step="0.01"
                    />
                </div>
                 <div>
                    <label htmlFor="overlay-y" className="block text-xs font-medium text-gray-400">Posición Y</label>
                    <input
                        type="number"
                        id="overlay-y"
                        value={overlay.y.toFixed(3)}
                        onChange={(e) => handleValueChange('y', parseFloat(e.target.value))}
                        className="w-full mt-1 bg-gray-900 p-2 rounded-md border border-gray-600"
                        step="0.01"
                    />
                </div>
                 <div>
                    <label htmlFor="overlay-scale" className="block text-xs font-medium text-gray-400">Escala</label>
                    <input
                        type="number"
                        id="overlay-scale"
                        value={overlay.scale.toFixed(3)}
                        onChange={(e) => handleValueChange('scale', parseFloat(e.target.value))}
                        className="w-full mt-1 bg-gray-900 p-2 rounded-md border border-gray-600"
                        step="0.01"
                        min="0"
                    />
                </div>
                 <div>
                    <label htmlFor="overlay-rotation" className="block text-xs font-medium text-gray-400">Rotación (°)</label>
                    <input
                        type="number"
                        id="overlay-rotation"
                        value={Math.round(overlay.rotation)}
                        onChange={(e) => handleValueChange('rotation', parseInt(e.target.value, 10))}
                        className="w-full mt-1 bg-gray-900 p-2 rounded-md border border-gray-600"
                        step="1"
                    />
                </div>
            </div>
            
            <button
                onClick={onDelete}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Eliminar Elemento
            </button>
        </div>
    );
};

export default OverlayEditor;