/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const TRUNCATE_DURATION = 45; // seconds

/**
 * Encodes an AudioBuffer into a WAV file Blob.
 */
// FIX: Export the 'encodeWav' function so it can be imported in index.tsx.
export function encodeWav(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result: Float32Array;
    if (numberOfChannels === 2) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        result = new Float32Array(left.length + right.length);
        for (let i = 0, j = 0; i < left.length; i++) {
            result[j++] = left[i];
            result[j++] = right[i];
        }
    } else {
        result = audioBuffer.getChannelData(0);
    }

    const dataLength = result.length * (bitDepth / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    let offset = 0;
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataLength, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, format, true); offset += 2;
    view.setUint16(offset, numberOfChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numberOfChannels * (bitDepth / 8), true); offset += 4; // byteRate
    view.setUint16(offset, numberOfChannels * (bitDepth / 8), true); offset += 2; // blockAlign
    view.setUint16(offset, bitDepth, true); offset += 2;
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataLength, true); offset += 4;

    const pcm = new Int16Array(result.length);
    for (let i = 0; i < result.length; i++) {
        const s = Math.max(-1, Math.min(1, result[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    for (let i = 0; i < pcm.length; i++, offset += 2) {
        view.setInt16(offset, pcm[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
}


/**
 * Truncates an audio file to the first 45 seconds using the Web Audio API.
 * @param file The audio file to process.
 * @returns A promise that resolves with a Blob of the truncated audio in WAV format.
 */
export async function truncateAudio(file: File): Promise<Blob> {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = Math.min(originalAudioBuffer.duration, TRUNCATE_DURATION);
    const frameCount = Math.floor(duration * originalAudioBuffer.sampleRate);
    
    if (frameCount <= 0) {
        // Return empty blob if duration is zero or negative
        return new Blob([], { type: 'audio/wav' });
    }

    const offlineContext = new OfflineAudioContext(
        originalAudioBuffer.numberOfChannels,
        frameCount,
        originalAudioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = originalAudioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const truncatedAudioBuffer = await offlineContext.startRendering();
    const wavBlob = encodeWav(truncatedAudioBuffer);
    return wavBlob;
}


/**
 * Converts a file or blob to a base64 encoded string.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Robustly gets the MIME type of a file.
 */
export function getMimeType(file: File): string {
    if (file.type && file.type !== 'application/octet-stream') {
        return file.type;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'flac': return 'audio/flac';
        case 'wav': return 'audio/wav';
        case 'mp3': return 'audio/mpeg';
        default: return 'application/octet-stream';
    }
}


/**
 * Gets the duration of an audio file in seconds.
 * This is a best-effort check and returns 0 if duration can't be determined.
 */
export function getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
        try {
            const audio = new Audio();
            const objectUrl = URL.createObjectURL(file);
            audio.addEventListener('loadedmetadata', () => {
                URL.revokeObjectURL(objectUrl);
                resolve(audio.duration);
            });
            audio.addEventListener('error', (e) => {
                URL.revokeObjectURL(objectUrl);
                console.warn(`Could not determine duration for file ${file.name}. This might happen if the browser doesn't support the audio format, but the AI might still process it.`, e);
                resolve(0); // Resolve with 0, don't block the request
            });
            audio.src = objectUrl;
        } catch (error) {
            console.warn(`Error creating Audio object for duration check on ${file.name}:`, error);
            resolve(0);
        }
    });
}