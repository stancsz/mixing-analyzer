/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Maps a value from 0-255 to a color for the spectrogram.
 * @param value The intensity value.
 * @returns An HSL color string.
 */
function getColor(value: number): string {
    const percent = value / 255;
    // Map value to a hue from blue (low) to red (high)
    const hue = (1 - percent) * 240;
    return `hsl(${hue}, 100%, 50%)`;
}

let spectrogramTempCanvas: HTMLCanvasElement | null = null;

/**
 * Draws a scrolling spectrogram (waterfall plot).
 * @param analyser The AnalyserNode providing the data.
 * @param ctx The 2D rendering context of the canvas.
 * @param width The width of the canvas.
 * @param height The height of the canvas.
 */
export function drawSpectrogram(
    analyser: AnalyserNode,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
) {
    if (!spectrogramTempCanvas) {
        spectrogramTempCanvas = document.createElement('canvas');
        spectrogramTempCanvas.width = width;
        spectrogramTempCanvas.height = height;
    }
    const tempCtx = spectrogramTempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;

    // Shift the existing spectrogram to the left
    tempCtx.drawImage(ctx.canvas, 0, 0, width, height);
    ctx.drawImage(spectrogramTempCanvas, -1, 0, width, height);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Draw the new column of pixels on the right
    for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        ctx.fillStyle = getColor(value);
        const y = height - (i / bufferLength) * height;
        ctx.fillRect(width - 1, y, 1, 1);
    }
}


/**
 * Draws the audio waveform on a canvas with a playhead.
 * @param ctx The 2D rendering context of the canvas.
 * @param waveformData An array of peak amplitude values.
 * @param progress The current playback progress (0.0 to 1.0).
 * @param width The width of the canvas.
 * @param height The height of the canvas.
 */
export function drawWaveform(
    ctx: CanvasRenderingContext2D,
    waveformData: Float32Array,
    progress: number,
    width: number,
    height: number
) {
    const styles = getComputedStyle(document.documentElement);
    const playedColor = styles.getPropertyValue('--primary-color').trim();
    const unplayedColor = styles.getPropertyValue('--secondary-color').trim();
    const playheadColor = styles.getPropertyValue('--on-surface-color').trim();
    const backgroundColor = styles.getPropertyValue('--background-color').trim();

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;
    const splitPoint = Math.floor(width * progress);

    // Function to draw one half of the waveform (top or bottom)
    const drawHalf = (color: string, start: number, end: number) => {
        ctx.beginPath();
        ctx.moveTo(start, centerY);
        for (let x = start; x < end; x++) {
            const amp = (waveformData[x] || 0) * centerY;
            ctx.lineTo(x, centerY - amp);
        }
        // Draw bottom half mirrored
        for (let x = end - 1; x >= start; x--) {
            const amp = (waveformData[x] || 0) * centerY;
            ctx.lineTo(x, centerY + amp);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    };

    // Draw played part
    if (splitPoint > 0) {
        drawHalf(playedColor, 0, splitPoint);
    }

    // Draw unplayed part
    if (splitPoint < width) {
        drawHalf(unplayedColor, splitPoint, width);
    }

    // Draw playhead
    if (progress > 0 && progress < 1) {
        ctx.strokeStyle = playheadColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(splitPoint, 0);
        ctx.lineTo(splitPoint, height);
        ctx.stroke();
    }
}


/**
 * Draws the frequency response curve of the EQ filters and an optional real-time spectrum.
 * @param filters An array of BiquadFilterNodes.
 * @param ctx The 2D rendering context of the canvas.
 * @param width The width of the canvas.
 * @param height The height of the canvas.
 * @param sampleRate The sample rate of the audio context.
 * @param analyser Optional AnalyserNode for drawing real-time frequency data.
 */
export function drawEqCurve(
    filters: BiquadFilterNode[],
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sampleRate: number,
    analyser?: AnalyserNode
) {
    // Resolve CSS variables to actual colors for canvas rendering
    const styles = getComputedStyle(document.documentElement);
    const backgroundColor = styles.getPropertyValue('--background-color').trim();
    const primaryColor = styles.getPropertyValue('--primary-color').trim();
    const borderColor = styles.getPropertyValue('--border-color').trim();
    const secondaryColor = styles.getPropertyValue('--secondary-color').trim();

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const minDb = -15;
    const maxDb = 15;
    const dbRange = maxDb - minDb;

    const minFreq = 20;
    const maxFreq = sampleRate / 2; // Nyquist frequency
    
    // --- Draw Grid Lines ---
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = secondaryColor;
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';

    // Horizontal (dB) grid lines
    for (let db = minDb + 3; db < maxDb; db += 3) {
        if (db === 0) continue; // Skip 0 dB line for now
        const y = (1 - (db - minDb) / dbRange) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillText(`${db} dB`, 5, y - 2);
    }
    // 0 dB line
    const y0 = (1 - (0 - minDb) / dbRange) * height;
    ctx.strokeStyle = secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(width, y0);
    ctx.stroke();

    // Vertical (Hz) grid lines
    const freqLines = [100, 1000, 10000];
    freqLines.forEach(freq => {
        const x = (Math.log(freq / minFreq) / Math.log(maxFreq / minFreq)) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
        ctx.fillText(label, x + 5, height - 5);
    });
    
    // --- Draw Static EQ Curve ---
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Generate frequencies on a logarithmic scale
    const frequencies = [];
    for (let i = 0; i < width; i++) {
        const percent = i / width;
        const freq = minFreq * Math.pow(maxFreq / minFreq, percent);
        frequencies.push(freq);
    }
    const freqFloat32Array = new Float32Array(frequencies);

    const magResponse = new Float32Array(frequencies.length);
    const phaseResponse = new Float32Array(frequencies.length);
    const totalMag = new Float32Array(frequencies.length).fill(1);

    // Get response from each filter and multiply them
    filters.forEach(filter => {
        filter.getFrequencyResponse(freqFloat32Array, magResponse, phaseResponse);
        for (let i = 0; i < magResponse.length; i++) {
            totalMag[i] *= magResponse[i];
        }
    });
    
    // Convert magnitude to dB and plot
    for (let i = 0; i < frequencies.length; i++) {
        const db = 20 * Math.log10(totalMag[i]);
        const y = (1 - (db - minDb) / dbRange) * height;

        if (i === 0) {
            ctx.moveTo(i, y);
        } else {
            ctx.lineTo(i, y);
        }
    }
    ctx.stroke();

    // --- Draw Real-time Spectrum Overlay ---
    if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.strokeStyle = 'rgba(255, 159, 64, 0.8)'; // Orange color
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        let hasMoved = false;

        for (let i = 0; i < bufferLength; i++) {
            const freq = i * sampleRate / analyser.fftSize;
            if (freq < minFreq) continue;
            if (freq > maxFreq) break;

            const x = (Math.log(freq / minFreq) / Math.log(maxFreq / minFreq)) * width;

            // `getByteFrequencyData` gives a value from 0-255 that represents
            // the decibel range specified by `analyser.minDecibels` and `analyser.maxDecibels`.
            // We can map this 0-255 value directly to the canvas height to show the spectrum shape.
            const value = dataArray[i];
            const percent = value / 255.0;
            const y = (1 - percent) * height;

            if (!hasMoved) {
                ctx.moveTo(x, y);
                hasMoved = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}