/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts a file to a base64 encoded string.
 */
export function fileToBase64(file: File): Promise<string> {
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
