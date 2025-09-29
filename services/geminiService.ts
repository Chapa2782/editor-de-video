import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateOverlayWithGemini(prompt: string): Promise<string | null> {
    try {
        const fullPrompt = `Generate an image of: "${prompt}". The object must have a transparent background. Only output the object itself.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        text: fullPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const newMimeType = part.inlineData.mimeType;
                const newBase64Data = part.inlineData.data;
                // Ensure the MIME type is image/png for transparency
                if (newMimeType !== 'image/png') {
                     console.warn(`AI generated a non-PNG image (${newMimeType}), transparency may be lost.`);
                }
                return `data:${newMimeType};base64,${newBase64Data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating overlay with Gemini:", error);
        throw error;
    }
}
