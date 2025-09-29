import React, { useState, useRef, useEffect } from 'react';
import { Clip, AudioTrack } from '../types';

interface NarrationToolProps {
    clip: Clip;
    onUpdateClip: (clip: Clip) => void;
}

enum RecordingState {
    Idle,
    Recording,
}

const NarrationTool: React.FC<NarrationToolProps> = ({ clip, onUpdateClip }) => {
    const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.Idle);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState<boolean>(true);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [script, setScript] = useState(clip.ttsText || '');
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
    const [isTTSAvailable, setIsTTSAvailable] = useState<boolean>(true);
    
    // --- Feature Detection ---
    useEffect(() => {
        const checkMicrophone = async () => {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const hasMicrophone = devices.some(device => device.kind === 'audioinput');
                    setIsMicrophoneAvailable(hasMicrophone);
                    if (!hasMicrophone) {
                        setError("No se detectó ningún micrófono. Usa la opción de Voz de IA.");
                    }
                } else {
                     setIsMicrophoneAvailable(false);
                     setError("Tu navegador no soporta la detección de dispositivos de audio.");
                }
            } catch (err) {
                console.error("Error checking for microphone:", err);
                setIsMicrophoneAvailable(true); 
            }
        };
        checkMicrophone();

        const ttsSupported = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
        const displayMediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
        setIsTTSAvailable(ttsSupported && displayMediaSupported);

    }, []);

    // --- Voice Loading for TTS ---
    useEffect(() => {
        if (!isTTSAvailable) return;

        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                const spanishVoices = availableVoices.filter(v => v.lang.startsWith('es'));
                const voicesToSet = spanishVoices.length > 0 ? spanishVoices : availableVoices;
                setVoices(voicesToSet);
                const defaultVoice = voicesToSet.find(v => v.lang === 'es-ES') || voicesToSet[0];
                if (defaultVoice) {
                    setSelectedVoiceURI(defaultVoice.voiceURI);
                }
            }
        };

        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
        return () => {
            speechSynthesis.onvoiceschanged = null;
        };
    }, [isTTSAvailable]);


    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
            }
        };
    }, [stream]);

    const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setScript(e.target.value);
        onUpdateClip({ ...clip, ttsText: e.target.value });
    };

    // --- Microphone Recording Logic ---
    const startRecording = async () => {
        if (!isMicrophoneAvailable) return;
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(mediaStream);
            const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const newAudioTrack: AudioTrack = { name: `Narración ${clip.id}`, url: audioUrl, blob: audioBlob };
                onUpdateClip({ ...clip, audio: newAudioTrack });
                audioChunksRef.current = [];
                setRecordingState(RecordingState.Idle);
                mediaStream.getTracks().forEach(track => track.stop());
                setStream(null);
            };
            audioChunksRef.current = [];
            mediaRecorder.start();
            setRecordingState(RecordingState.Recording);
        } catch (err) {
            console.error("Error al acceder al micrófono:", err);
            setError("No se pudo acceder al micrófono. Revisa los permisos.");
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current && recordingState === RecordingState.Recording) {
            mediaRecorderRef.current.stop();
        }
    };

    // --- TTS Generation Logic ---
    const handleGenerateTTS = async () => {
        if (!script || isGeneratingTTS || !isTTSAvailable) return;
        setIsGeneratingTTS(true);
        setError(null);

        let capturedStream: MediaStream | null = null;
        try {
            capturedStream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: true,
            });

            const recorder = new MediaRecorder(capturedStream, { mimeType: 'audio/webm' });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                if (audioBlob.size > 0) {
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const newAudioTrack: AudioTrack = { name: `Narración TTS ${clip.id}`, url: audioUrl, blob: audioBlob };
                    onUpdateClip({ ...clip, audio: newAudioTrack });
                }
                capturedStream?.getTracks().forEach(track => track.stop());
                setIsGeneratingTTS(false);
            };
            
            const utterance = new SpeechSynthesisUtterance(script);
            const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
            if (selectedVoice) utterance.voice = selectedVoice;
            
            utterance.onend = () => recorder.stop();
            utterance.onerror = (e) => {
                setError(`Error de síntesis de voz: ${e.error}`);
                recorder.stop();
            };

            recorder.start();
            speechSynthesis.speak(utterance);

        } catch (err) {
            console.error("Error generando audio TTS:", err);
            let friendlyError = "Ocurrió un error al generar el audio.";
            if (err instanceof DOMException) {
                 if (err.name === 'NotAllowedError') {
                    friendlyError = "Permiso denegado. Se necesita permiso para capturar el audio de la pestaña para generar la voz.";
                } else if (err.name === 'NotSupportedError') {
                    friendlyError = "La captura de audio para TTS no es compatible con tu navegador o entorno actual.";
                } else if (err.message.includes("permissions policy")) {
                    friendlyError = "La captura de audio del navegador no está permitida por políticas de seguridad en este entorno.";
                }
            }
            setError(friendlyError);
            capturedStream?.getTracks().forEach(track => track.stop());
            setIsGeneratingTTS(false);
        }
    };

    const deleteRecording = () => {
        const { audio, ...clipWithoutAudio } = clip;
        onUpdateClip(clipWithoutAudio);
        setError(isMicrophoneAvailable ? null : "No se detectó ningún micrófono. Usa la opción de Voz de IA.");
    }
    
    return (
        <div className="space-y-4">
            <h3 className="text-md font-semibold text-gray-300">Herramienta de Narración</h3>
             <textarea
                placeholder="Escribe tu guion aquí..."
                className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                value={script}
                onChange={handleScriptChange}
            />

            {clip.audio && (
                 <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">Narración actual:</p>
                    <audio src={clip.audio.url} controls className="w-full" />
                    <button onClick={deleteRecording} className="w-full mt-2 bg-red-600 hover:bg-red-500 text-white text-sm py-1 rounded">
                        Eliminar Audio
                    </button>
                </div>
            )}

            {/* --- Recording UI --- */}
            <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-center text-gray-400">Opción 1: Grabar tu Voz</p>
                 <div className="flex items-center justify-center space-x-4">
                     <button
                        onClick={startRecording}
                        disabled={!isMicrophoneAvailable || recordingState === RecordingState.Recording || !!clip.audio}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                        <span>Grabar</span>
                    </button>
                     <button
                        onClick={stopRecording}
                        disabled={recordingState !== RecordingState.Recording}
                        className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                         <div className="w-3 h-3 bg-white"></div>
                         <span>Detener</span>
                     </button>
                </div>
                 {recordingState === RecordingState.Recording && (
                    <p className="text-center text-red-400 animate-pulse text-sm">Grabando...</p>
                )}
            </div>

            {/* --- TTS UI --- */}
            <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
                 <p className="text-sm font-semibold text-center text-gray-400">Opción 2: Usar Voz de IA (TTS)</p>
                 {isTTSAvailable ? (
                     <>
                        <select
                            value={selectedVoiceURI}
                            onChange={(e) => setSelectedVoiceURI(e.target.value)}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                            disabled={voices.length === 0 || isGeneratingTTS}
                        >
                            {voices.map(voice => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleGenerateTTS}
                            disabled={!script || !!clip.audio || isGeneratingTTS}
                            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isGeneratingTTS ? 'Generando...' : 'Generar y Adjuntar Audio'}
                        </button>
                        {isGeneratingTTS && <p className="text-xs text-center text-teal-400">Se necesita permiso para capturar audio de la pestaña...</p>}
                     </>
                 ) : (
                    <div className="text-center p-2 rounded-md bg-yellow-900/50">
                        <p className="text-sm text-yellow-400">
                            La generación de Voz con IA no es compatible con este navegador.
                        </p>
                    </div>
                 )}
            </div>
            
            {error && <p className="text-sm text-red-500 mt-2 text-center">{error}</p>}
        </div>
    );
};

export default NarrationTool;
