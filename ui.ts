/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { resultText, submitButton } from './ui-elements';


/**
 * Updates the state of the submit button based on whether files are selected.
 */
export function updateSubmitButtonState(audioFiles: File[]) {
  submitButton.disabled = true;
}

/**
 * Renders the analysis from a structured JSON object into the main output panel.
 */
export async function renderAnalysis(analysisData: any, t: Record<string, string>) {
  let finalHtml = '';

  // The order of these 'if' blocks now matches the new checkbox order
  if (analysisData.songMetadata) {
    const d = analysisData.songMetadata;
    finalHtml += `<h2>${t.metadataTitle}</h2>`;
    let metadataHtml = '<ul>';
    if (d.bpm) metadataHtml += `<li><strong>BPM:</strong> ${d.bpm}</li>`;
    if (d.key) metadataHtml += `<li><strong>Key:</strong> ${d.key}</li>`;
    if (d.genre) metadataHtml += `<li><strong>Genre:</strong> ${d.genre}</li>`;
    metadataHtml += '</ul>';
    finalHtml += metadataHtml;
  }

  if (analysisData.spectralAnalysis) {
    const d = analysisData.spectralAnalysis;
    finalHtml += `<h2>${t.spectralAnalysisTitle}</h2>`;
    if (d.overallBalance) finalHtml += `<h4>Overall Balance</h4><p>${d.overallBalance}</p>`;
    if (d.eqAnalysis) finalHtml += `<h4>EQ Analysis</h4><p>${d.eqAnalysis}</p>`;
    if (d.harshness) finalHtml += `<h4>Harshness & Resonance</h4><p>${d.harshness}</p>`;
    if (d.recommendations) finalHtml += `<h4>Recommendations</h4>${await marked.parse(d.recommendations)}`;
  }

  if (analysisData.dynamicsAndStereoAnalysis) {
    const d = analysisData.dynamicsAndStereoAnalysis;
    finalHtml += `<h2>${t.dynamicsStereoAnalysisTitle}</h2>`;
    if (d.dynamicsAnalysis) finalHtml += `<h4>Dynamics Analysis</h4><p>${d.dynamicsAnalysis}</p>`;
    if (d.loudness) {
      finalHtml += `<h4>Loudness</h4>
        <p>
          <strong>Integrated LUFS:</strong> ${d.loudness.integratedLUFS} LUFS<br>
          <strong>Short-Term LUFS:</strong> ${d.loudness.shortTermLUFS} LUFS<br>
          <strong>True Peak:</strong> ${d.loudness.truePeak} dBTP
        </p>
        <p><em>${d.loudness.lufsRecommendation}</em></p>`;
    }
    if (d.stereoImage) finalHtml += `<h4>Stereo Image</h4><p>${d.stereoImage}</p>`;
    if (d.recommendations) finalHtml += `<h4>Recommendations</h4>${await marked.parse(d.recommendations)}`;
  }

  if (analysisData.effectsAnalysis) {
    const d = analysisData.effectsAnalysis;
    finalHtml += `<h2>${t.effectsAnalysisTitle}</h2>`;
    if (d.reverbAnalysis) finalHtml += `<h4>Reverb</h4><p>${d.reverbAnalysis}</p>`;
    if (d.delayAnalysis) finalHtml += `<h4>Delay</h4><p>${d.delayAnalysis}</p>`;
  }

  if (analysisData.aiDetection) {
    const d = analysisData.aiDetection;
    finalHtml += `<h2>${t.aiDetectionTitle}</h2>`;
    const confidencePercent = (d.confidence * 100).toFixed(1);
    finalHtml += `<h4>Result</h4><p><strong>AI Generated:</strong> ${d.isAiGenerated ? 'Yes' : 'No'} (${confidencePercent}% confidence)</p>`;
    if (d.justification) finalHtml += `<h4>Justification</h4><p>${d.justification}</p>`;
  }
  
  resultText.innerHTML = DOMPurify.sanitize(finalHtml);
}