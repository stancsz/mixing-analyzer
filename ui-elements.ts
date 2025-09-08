/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// This module centralizes all DOM element selections.

export const languageSelector = document.getElementById('language-selector') as HTMLSelectElement;
export const fileInput = document.getElementById('file-upload') as HTMLInputElement;
export const fileNameSpan = document.getElementById('file-name') as HTMLSpanElement;
export const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
export const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
export const loader = document.getElementById('loader') as HTMLDivElement;
export const resultText = document.getElementById('result-text') as HTMLDivElement;
export const optionTruncate = document.getElementById('option-truncate') as HTMLInputElement;
export const optionMetadata = document.getElementById('option-metadata') as HTMLInputElement;
export const optionSpectral = document.getElementById('option-spectral') as HTMLInputElement;
export const optionDynamicsStereo = document.getElementById('option-dynamics-stereo') as HTMLInputElement;
export const optionEffects = document.getElementById('option-effects') as HTMLInputElement;
export const optionAiCheck = document.getElementById('option-ai-check') as HTMLInputElement;
export const visualizerPanel = document.getElementById('visualizer-panel') as HTMLDivElement;
export const playPauseButton = document.getElementById('play-pause-button') as HTMLButtonElement;
export const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
export const timelineContainer = document.getElementById('timeline-container') as HTMLDivElement;
export const spectrogramCanvas = document.getElementById('spectrogram-canvas') as HTMLCanvasElement;
export const eqCurveCanvas = document.getElementById('eq-curve-canvas') as HTMLCanvasElement;
export const downloadProcessedButton = document.getElementById('download-processed-button') as HTMLButtonElement;

// EQ Controls
export const lowGainSlider = document.getElementById('low-gain') as HTMLInputElement;
export const midGainSlider = document.getElementById('mid-gain') as HTMLInputElement;
export const highGainSlider = document.getElementById('high-gain') as HTMLInputElement;
export const lowGainValue = document.getElementById('low-gain-value') as HTMLSpanElement;
export const midGainValue = document.getElementById('mid-gain-value') as HTMLSpanElement;
export const highGainValue = document.getElementById('high-gain-value') as HTMLSpanElement;

export const lowFreqInput = document.getElementById('low-freq') as HTMLInputElement;
export const midFreqInput = document.getElementById('mid-freq') as HTMLInputElement;
export const highFreqInput = document.getElementById('high-freq') as HTMLInputElement;
export const lowFreqValue = document.getElementById('low-freq-value') as HTMLSpanElement;
export const midFreqValue = document.getElementById('mid-freq-value') as HTMLSpanElement;
export const highFreqValue = document.getElementById('high-freq-value') as HTMLSpanElement;

export const lowQSlider = document.getElementById('low-q') as HTMLInputElement;
export const midQSlider = document.getElementById('mid-q') as HTMLInputElement;
export const highQSlider = document.getElementById('high-q') as HTMLInputElement;
export const lowQValue = document.getElementById('low-q-value') as HTMLSpanElement;
export const midQValue = document.getElementById('mid-q-value') as HTMLSpanElement;
export const highQValue = document.getElementById('high-q-value') as HTMLSpanElement;
export const lowQContainer = document.getElementById('low-q-container') as HTMLDivElement;
export const midQContainer = document.getElementById('mid-q-container') as HTMLDivElement;
export const highQContainer = document.getElementById('high-q-container') as HTMLDivElement;


export const lowFilterType = document.getElementById('low-filter-type') as HTMLSelectElement;
export const midFilterType = document.getElementById('mid-filter-type') as HTMLSelectElement;
export const highFilterType = document.getElementById('high-filter-type') as HTMLSelectElement;