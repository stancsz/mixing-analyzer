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
export const waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
export const spectrogramCanvas = document.getElementById('spectrogram-canvas') as HTMLCanvasElement;
export const eqCurveCanvas = document.getElementById('eq-curve-canvas') as HTMLCanvasElement;
export const downloadProcessedButton = document.getElementById('download-processed-button') as HTMLButtonElement;

// EQ Controls
export const eqResetButton = document.getElementById('eq-reset-button') as HTMLButtonElement;
export const eqPresetsSelect = document.getElementById('eq-presets-select') as HTMLSelectElement;
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

// Compressor Controls
export const compressorResetButton = document.getElementById('compressor-reset-button') as HTMLButtonElement;
export const compressorEnable = document.getElementById('compressor-enable') as HTMLInputElement;
export const lowMidCrossover = document.getElementById('low-mid-crossover') as HTMLInputElement;
export const midHighCrossover = document.getElementById('mid-high-crossover') as HTMLInputElement;
export const lowMidCrossoverValue = document.getElementById('low-mid-crossover-value') as HTMLSpanElement;
export const midHighCrossoverValue = document.getElementById('mid-high-crossover-value') as HTMLSpanElement;

export const lowGrMeter = document.getElementById('low-gr-meter') as HTMLDivElement;
export const midGrMeter = document.getElementById('mid-gr-meter') as HTMLDivElement;
export const highGrMeter = document.getElementById('high-gr-meter') as HTMLDivElement;

export const lowCompThreshold = document.getElementById('low-comp-threshold') as HTMLInputElement;
export const lowCompRatio = document.getElementById('low-comp-ratio') as HTMLInputElement;
export const lowCompAttack = document.getElementById('low-comp-attack') as HTMLInputElement;
export const lowCompRelease = document.getElementById('low-comp-release') as HTMLInputElement;
export const lowCompMakeup = document.getElementById('low-comp-makeup') as HTMLInputElement;
export const lowCompThresholdValue = document.getElementById('low-comp-threshold-value') as HTMLSpanElement;
export const lowCompRatioValue = document.getElementById('low-comp-ratio-value') as HTMLSpanElement;
export const lowCompAttackValue = document.getElementById('low-comp-attack-value') as HTMLSpanElement;
export const lowCompReleaseValue = document.getElementById('low-comp-release-value') as HTMLSpanElement;
export const lowCompMakeupValue = document.getElementById('low-comp-makeup-value') as HTMLSpanElement;

export const midCompThreshold = document.getElementById('mid-comp-threshold') as HTMLInputElement;
export const midCompRatio = document.getElementById('mid-comp-ratio') as HTMLInputElement;
export const midCompAttack = document.getElementById('mid-comp-attack') as HTMLInputElement;
export const midCompRelease = document.getElementById('mid-comp-release') as HTMLInputElement;
export const midCompMakeup = document.getElementById('mid-comp-makeup') as HTMLInputElement;
export const midCompThresholdValue = document.getElementById('mid-comp-threshold-value') as HTMLSpanElement;
export const midCompRatioValue = document.getElementById('mid-comp-ratio-value') as HTMLSpanElement;
export const midCompAttackValue = document.getElementById('mid-comp-attack-value') as HTMLSpanElement;
export const midCompReleaseValue = document.getElementById('mid-comp-release-value') as HTMLSpanElement;
export const midCompMakeupValue = document.getElementById('mid-comp-makeup-value') as HTMLSpanElement;

export const highCompThreshold = document.getElementById('high-comp-threshold') as HTMLInputElement;
export const highCompRatio = document.getElementById('high-comp-ratio') as HTMLInputElement;
export const highCompAttack = document.getElementById('high-comp-attack') as HTMLInputElement;
export const highCompRelease = document.getElementById('high-comp-release') as HTMLInputElement;
export const highCompMakeup = document.getElementById('high-comp-makeup') as HTMLInputElement;
export const highCompThresholdValue = document.getElementById('high-comp-threshold-value') as HTMLSpanElement;
export const highCompRatioValue = document.getElementById('high-comp-ratio-value') as HTMLSpanElement;
export const highCompAttackValue = document.getElementById('high-comp-attack-value') as HTMLSpanElement;
export const highCompReleaseValue = document.getElementById('high-comp-release-value') as HTMLSpanElement;
export const highCompMakeupValue = document.getElementById('high-comp-makeup-value') as HTMLSpanElement;