import React, { useState } from 'react';
import { generateOverlayWithGemini } from '../services/geminiService';

interface AIEditorProps {
    onAddOverlay: (overlayData: string) => void;
}

const AIEditor: React.FC<AIEditorProps> = ({ onAddOverlay }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError(null);
        try {
            const newImageData = await generateOverlayWithGemini(prompt);
            if (newImageData) {
                onAddOverlay(newImageData);
                setPrompt('');
            } else {
                setError("No se pudo obtener el elemento de la IA. Por favor, inténtalo de nuevo.");
            }
        } catch (err) {
            setError("Ocurrió un error al generar el elemento.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-md font-semibold text-gray-300">Añadir Elemento con IA</h3>
            <p className="text-xs text-gray-400">Genera un elemento (ej: "un sombrero de fiesta") con fondo transparente y añádelo a la imagen como una capa editable.</p>
           
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: 'un gato con gafas de sol'"
                className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                disabled={isLoading}
            />
            <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando...
                    </div>
                ) : 'Generar y Añadir Elemento'}
            </button>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
    );
};

export default AIEditor;