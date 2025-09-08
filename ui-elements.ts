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