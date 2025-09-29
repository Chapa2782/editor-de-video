export interface MediaAsset {
    id: string;
    type: 'image';
    data: string; // base64 data URL
    name: string;
}

export interface Overlay {
    id: string;
    data: string; // base64 data URL of the generated element
    x: number; // center x (0 to 1, relative to canvas width)
    y: number; // center y (0 to 1, relative to canvas height)
    scale: number; // multiplier
    rotation: number; // degrees
    width: number; // original width of the image
    height: number; // original height of the image
}

export interface Clip {
    id: string;
    assetId: string;
    duration: number; // in seconds
    audio?: AudioTrack;
    ttsText?: string;
    overlays?: Overlay[];
}

export interface AudioTrack {
    name: string;
    url: string;
    blob: Blob;
}