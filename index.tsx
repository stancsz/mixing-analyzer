/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
// FIX: Import html2canvas to resolve 'Cannot find name' error.
import html2canvas from 'html2canvas';
import {
  downloadButton, eqCurveCanvas, fileInput, fileNameSpan, highGainSlider, highGainValue,
  languageSelector, loader, lowGainSlider, lowGainValue, midGainSlider, midGainValue,
  optionAiCheck, optionDynamicsStereo, optionEffects, optionMetadata,
  optionSpectral, optionTruncate, playPauseButton, progressBar,
  resultText, spectrogramCanvas, submitButton, timelineContainer, visualizerPanel,
  lowFreqInput, midFreqInput, highFreqInput, midQSlider, midQValue, lowFreqValue, midFreqValue, highFreqValue, lowQSlider, highQSlider, lowQValue, highQValue,
  lowFilterType, midFilterType, highFilterType, lowQContainer, midQContainer, highQContainer, downloadProcessedButton,
  compressorEnable, lowMidCrossover, midHighCrossover, lowMidCrossoverValue, midHighCrossoverValue,
  lowGrMeter, midGrMeter, highGrMeter, lowCompThreshold, lowCompRatio, lowCompAttack, lowCompRelease, lowCompMakeup,
  lowCompThresholdValue, lowCompRatioValue, lowCompAttackValue, lowCompReleaseValue, lowCompMakeupValue,
  midCompThreshold, midCompRatio, midCompAttack, midCompRelease, midCompMakeup, midCompThresholdValue,
  midCompRatioValue, midCompAttackValue, midCompReleaseValue, midCompMakeupValue, highCompThreshold,
  highCompRatio, highCompAttack, highCompRelease, highCompMakeup, highCompThresholdValue, highCompRatioValue,
  highCompAttackValue, highCompReleaseValue, highCompMakeupValue, eqResetButton, compressorResetButton
} from './ui-elements';
import { ai, responseSchema, systemInstruction } from './gemini';
import { translations } from './i18n';
import { renderAnalysis, updateSubmitButtonState } from './ui';
import { fileToBase64, getAudioDuration, getMimeType, truncateAudio, encodeWav } from './utils';
import { drawEqCurve, drawSpectrogram } from './visualizer';

// --- App State ---
let audioFiles: File[] = [];
let currentLang = 'en';

// --- Visualizer State ---
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let analyserNodeSpectrogram: AnalyserNode | null = null;
let analyserNodeEq: AnalyserNode | null = null;
let isPlaying = false;
let animationFrameId: number | null = null;
let startTime = 0;
let startOffset = 0;
// EQ Nodes
let lowFilter: BiquadFilterNode | null = null;
let midFilter: BiquadFilterNode | null = null;
let highFilter: BiquadFilterNode | null = null;
let eqFilters: BiquadFilterNode[] = [];
// Compressor Nodes
let compressorWetGain: GainNode | null = null;
let compressorDryGain: GainNode | null = null;
let compressorOutputNode: GainNode | null = null;
let lowSplitFilter: BiquadFilterNode | null = null;
let midSplitFilter: BiquadFilterNode | null = null;
let highSplitFilter: BiquadFilterNode | null = null;
let lowCompressor: DynamicsCompressorNode | null = null;
let midCompressor: DynamicsCompressorNode | null = null;
let highCompressor: DynamicsCompressorNode | null = null;
let lowMakeupGain: GainNode | null = null;
let midMakeupGain: GainNode | null = null;
let highMakeupGain: GainNode | null = null;

// FIX: Use ReturnType<typeof setTimeout> to correctly type the timeout ID for both browser (number) and Node.js (Timeout object) environments.
let scrubTimeoutId: ReturnType<typeof setTimeout> | null = null;

const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>`;
const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg>`;

/**
 * Converts a dB value to a linear gain multiplier.
 */
function dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
}

// --- Visualizer Functions ---

function cleanupVisualizer() {
  if (scrubTimeoutId) {
    clearTimeout(scrubTimeoutId);
    scrubTimeoutId = null;
  }
  if (sourceNode) {
    sourceNode.onended = null;
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (analyserNodeSpectrogram) {
    analyserNodeSpectrogram.disconnect();
    analyserNodeSpectrogram = null;
  }
  if (analyserNodeEq) {
    analyserNodeEq.disconnect();
    analyserNodeEq = null;
  }
  
  // Disconnect all EQ and Compressor nodes
  [
    lowFilter, midFilter, highFilter, compressorWetGain, compressorDryGain, compressorOutputNode,
    lowSplitFilter, midSplitFilter, highSplitFilter, lowCompressor, midCompressor,
    highCompressor, lowMakeupGain, midMakeupGain, highMakeupGain
  ].forEach(node => node?.disconnect());

  lowFilter = midFilter = highFilter = null;
  compressorWetGain = compressorDryGain = compressorOutputNode = lowSplitFilter = midSplitFilter = highSplitFilter = null;
  lowCompressor = midCompressor = highCompressor = null;
  lowMakeupGain = midMakeupGain = highMakeupGain = null;
  eqFilters = [];


  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  audioBuffer = null;
  isPlaying = false;
  startOffset = 0;
  startTime = 0;
  progressBar.style.width = '0%';
  playPauseButton.innerHTML = playIcon;
  playPauseButton.disabled = true;
  downloadProcessedButton.disabled = true;
}

function updateStaticEqCurve() {
  if (!audioContext || !eqCurveCanvas || eqFilters.length === 0) return;
  const eqCtx = eqCurveCanvas.getContext('2d');
  if (eqCtx) {
    drawEqCurve(eqFilters, eqCtx, eqCurveCanvas.width, eqCurveCanvas.height, audioContext.sampleRate);
  }
}

function createCompressorChain(context: AudioContext | OfflineAudioContext) {
    // Crossover filters
    const lowMidFreq = parseFloat(lowMidCrossover.value);
    const midHighFreq = parseFloat(midHighCrossover.value);

    const newLowSplitFilter = context.createBiquadFilter();
    newLowSplitFilter.type = 'lowpass';
    newLowSplitFilter.frequency.value = lowMidFreq;

    const newMidSplitFilter = context.createBiquadFilter();
    newMidSplitFilter.type = 'highpass';
    newMidSplitFilter.frequency.value = lowMidFreq;

    const newHighSplitFilter = context.createBiquadFilter();
    newHighSplitFilter.type = 'highpass';
    newHighSplitFilter.frequency.value = midHighFreq;

    // Compressors
    const newLowCompressor = context.createDynamicsCompressor();
    const newMidCompressor = context.createDynamicsCompressor();
    const newHighCompressor = context.createDynamicsCompressor();
    
    // Makeup Gain
    const newLowMakeupGain = context.createGain();
    const newMidMakeupGain = context.createGain();
    const newHighMakeupGain = context.createGain();

    // Connect the bands
    newLowSplitFilter.connect(newLowCompressor).connect(newLowMakeupGain);
    newMidSplitFilter.connect(newHighSplitFilter).connect(newMidCompressor).connect(newMidMakeupGain);
    newHighSplitFilter.connect(newHighCompressor).connect(newHighMakeupGain);

    return {
        lowSplitFilter: newLowSplitFilter, midSplitFilter: newMidSplitFilter, highSplitFilter: newHighSplitFilter,
        lowCompressor: newLowCompressor, midCompressor: newMidCompressor, highCompressor: newHighCompressor,
        lowMakeupGain: newLowMakeupGain, midMakeupGain: newMidMakeupGain, highMakeupGain: newHighMakeupGain
    };
}


async function setupAudio(file: File) {
  cleanupVisualizer();
  audioContext = new AudioContext();

  // Set canvas dimensions to match display size for crisp rendering
  const eqRect = eqCurveCanvas.getBoundingClientRect();
  eqCurveCanvas.width = eqRect.width;
  eqCurveCanvas.height = eqRect.height;

  const specRect = spectrogramCanvas.getBoundingClientRect();
  spectrogramCanvas.width = specRect.width;
  spectrogramCanvas.height = specRect.height;

  // Create analysers
  analyserNodeEq = audioContext.createAnalyser();
  analyserNodeEq.fftSize = 2048;
  analyserNodeEq.smoothingTimeConstant = 0.8;
  analyserNodeEq.minDecibels = -90;
  analyserNodeEq.maxDecibels = -10;
  
  analyserNodeSpectrogram = audioContext.createAnalyser();
  analyserNodeSpectrogram.fftSize = 512;
  
  // --- Create Compressor Chain ---
  const compNodes = createCompressorChain(audioContext);
  lowSplitFilter = compNodes.lowSplitFilter;
  midSplitFilter = compNodes.midSplitFilter;
  highSplitFilter = compNodes.highSplitFilter;
  lowCompressor = compNodes.lowCompressor;
  midCompressor = compNodes.midCompressor;
  highCompressor = compNodes.highCompressor;
  lowMakeupGain = compNodes.lowMakeupGain;
  midMakeupGain = compNodes.midMakeupGain;
  highMakeupGain = compNodes.highMakeupGain;

  compressorWetGain = audioContext.createGain();
  compressorDryGain = audioContext.createGain();
  compressorOutputNode = audioContext.createGain();
  
  // Connect wet compressor chain inputs
  compressorWetGain.connect(lowSplitFilter);
  compressorWetGain.connect(midSplitFilter);
  
  // Connect compressor chain outputs to the summing bus
  lowMakeupGain.connect(compressorOutputNode);
  midMakeupGain.connect(compressorOutputNode);
  highMakeupGain.connect(compressorOutputNode);


  // --- Create EQ Chain ---
  lowFilter = audioContext.createBiquadFilter();
  midFilter = audioContext.createBiquadFilter();
  highFilter = audioContext.createBiquadFilter();
  eqFilters = [lowFilter, midFilter, highFilter];
  
  // --- Master Audio Graph Connection ---
  // Both the wet (processed) and dry (bypassed) signals connect to the EQ chain.
  compressorOutputNode.connect(lowFilter);
  compressorDryGain.connect(lowFilter);
  
  // The EQ chain itself
  lowFilter.connect(midFilter)
    .connect(highFilter);

  // Post-EQ signal splits to destination and analysers
  highFilter.connect(audioContext.destination);
  highFilter.connect(analyserNodeSpectrogram);
  highFilter.connect(analyserNodeEq);

  // Initialize all values from UI
  updateAllEqValues();
  updateAllCompressorValues();
  updateCompressorBypass();

  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  updateStaticEqCurve(); // Initial draw
  playPauseButton.disabled = false;
  downloadProcessedButton.disabled = false;
}

function renderVisualizations() {
  if (!analyserNodeSpectrogram || !audioContext || !audioBuffer || !analyserNodeEq) return;

  const spectrogramCtx = spectrogramCanvas.getContext('2d');
  const eqCtx = eqCurveCanvas.getContext('2d');

  if (spectrogramCtx) {
    drawSpectrogram(analyserNodeSpectrogram, spectrogramCtx, spectrogramCanvas.width, spectrogramCanvas.height);
  }

  if (eqCtx) {
      drawEqCurve(eqFilters, eqCtx, eqCurveCanvas.width, eqCurveCanvas.height, audioContext.sampleRate, analyserNodeEq);
  }
  
  if (lowCompressor && midCompressor && highCompressor) {
      const lowRed = lowCompressor.reduction;
      const midRed = midCompressor.reduction;
      const highRed = highCompressor.reduction;

      // Max reduction displayed on meter is -30dB
      lowGrMeter.style.height = `${Math.min(100, (lowRed / -30) * 100)}%`;
      midGrMeter.style.height = `${Math.min(100, (midRed / -30) * 100)}%`;
      highGrMeter.style.height = `${Math.min(100, (highRed / -30) * 100)}%`;
  }

  const elapsedTime = audioContext.currentTime - startTime + startOffset;
  const progress = (elapsedTime / audioBuffer.duration) * 100;
  progressBar.style.width = `${Math.min(progress, 100)}%`;

  if (isPlaying) {
    animationFrameId = requestAnimationFrame(renderVisualizations);
  }
}

function playAudio() {
  if (!audioContext || !audioBuffer || isPlaying || !compressorWetGain || !compressorDryGain) return;

  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;

  // Connect the new source to the start of BOTH the wet and dry processing chains.
  // The bypass logic will control which path has its gain up.
  sourceNode.connect(compressorWetGain);
  sourceNode.connect(compressorDryGain);

  const offset = startOffset % audioBuffer.duration;
  sourceNode.start(0, offset);
  
  // This handler is for when the track finishes playing naturally.
  // Manual stops (pause, scrub) should set onended to null before stopping.
  sourceNode.onended = () => {
      if (!isPlaying) return; 

      // Reset state for the next play
      isPlaying = false;
      startOffset = 0;
      if (sourceNode) {
          sourceNode.disconnect();
          sourceNode = null;
      }
      
      // Update UI
      playPauseButton.innerHTML = playIcon;
      progressBar.style.width = '0%';
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      updateStaticEqCurve();
  };

  startTime = audioContext.currentTime;
  isPlaying = true;
  playPauseButton.innerHTML = pauseIcon;
  renderVisualizations();
}

function pauseAudio() {
  if (!isPlaying || !sourceNode || !audioContext) return;

  // Set state before stopping to prevent onended handler issues
  isPlaying = false;
  startOffset += audioContext.currentTime - startTime;
  
  // Clean up the old source node
  sourceNode.onended = null;
  sourceNode.stop();
  sourceNode.disconnect();
  sourceNode = null;
  
  playPauseButton.innerHTML = playIcon;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  updateStaticEqCurve();
}

// --- Event Handlers ---

function handlePlayPause() {
  if (isPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function handleTimelineScrub(event: MouseEvent) {
    if (!audioBuffer || !audioContext) return;

    // Clear any pending scrub-to-play action
    if (scrubTimeoutId) {
        clearTimeout(scrubTimeoutId);
    }
    
    const timeline = timelineContainer;
    const rect = timeline.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, offsetX / timeline.clientWidth));
    
    const newTime = clickRatio * audioBuffer.duration;
    
    // Stop any current playback.
    // We can't use pauseAudio() as it modifies startOffset based on play time.
    if (isPlaying && sourceNode) {
        sourceNode.onended = null; // Prevent onended handler from firing
        sourceNode.stop();
        sourceNode.disconnect();
        sourceNode = null;
    }
    
    // Update state to reflect the pause and the new time.
    isPlaying = false;
    startOffset = newTime;
    progressBar.style.width = `${clickRatio * 100}%`;
    playPauseButton.innerHTML = playIcon;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    updateStaticEqCurve(); // Show the static EQ curve while paused.

    // Schedule playback to resume from the new position.
    scrubTimeoutId = setTimeout(() => {
        playAudio();
        scrubTimeoutId = null;
    }, 200); // A 200ms delay feels natural.
}

async function handleDownloadProcessedAudio() {
    if (!audioBuffer || !audioFiles.length) return;
    
    const t = translations[currentLang];
    const originalText = downloadProcessedButton.textContent;
    downloadProcessedButton.textContent = t.processingMessage || 'Processing...';
    downloadProcessedButton.disabled = true;

    try {
        const offlineCtx = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        // --- Recreate EQ Chain for Offline Context ---
        const offlineLowFilter = offlineCtx.createBiquadFilter();
        const offlineMidFilter = offlineCtx.createBiquadFilter();
        const offlineHighFilter = offlineCtx.createBiquadFilter();

        // Connect EQ chain
        offlineLowFilter.connect(offlineMidFilter).connect(offlineHighFilter).connect(offlineCtx.destination);
        
        // --- Apply all EQ settings ---
        offlineLowFilter.type = lowFilterType.value as BiquadFilterType;
        offlineLowFilter.frequency.value = parseFloat(lowFreqInput.value);
        offlineLowFilter.Q.value = parseFloat(lowQSlider.value);
        offlineLowFilter.gain.value = parseFloat(lowGainSlider.value);
        offlineMidFilter.type = midFilterType.value as BiquadFilterType;
        offlineMidFilter.frequency.value = parseFloat(midFreqInput.value);
        offlineMidFilter.Q.value = parseFloat(midQSlider.value);
        offlineMidFilter.gain.value = parseFloat(midGainSlider.value);
        offlineHighFilter.type = highFilterType.value as BiquadFilterType;
        offlineHighFilter.frequency.value = parseFloat(highFreqInput.value);
        offlineHighFilter.Q.value = parseFloat(highQSlider.value);
        offlineHighFilter.gain.value = parseFloat(highGainSlider.value);


        if (compressorEnable.checked) {
            // --- WET PATH: Recreate Compressor Chain ---
            const compNodes = createCompressorChain(offlineCtx);
            const offlineCompOutput = offlineCtx.createGain();

            // Connect offline compressor chain to its summing bus
            compNodes.lowMakeupGain.connect(offlineCompOutput);
            compNodes.midMakeupGain.connect(offlineCompOutput);
            compNodes.highMakeupGain.connect(offlineCompOutput);

            // Connect source to compressor inputs, and compressor output to EQ input
            source.connect(compNodes.lowSplitFilter);
            source.connect(compNodes.midSplitFilter);
            offlineCompOutput.connect(offlineLowFilter);

            // --- Apply all Compressor settings ---
            const comps = [compNodes.lowCompressor, compNodes.midCompressor, compNodes.highCompressor];
            const thresholds = [lowCompThreshold.value, midCompThreshold.value, highCompThreshold.value];
            const ratios = [lowCompRatio.value, midCompRatio.value, highCompRatio.value];
            const attacks = [lowCompAttack.value, midCompAttack.value, highCompAttack.value];
            const releases = [lowCompRelease.value, midCompRelease.value, highCompRelease.value];
            const makeups = [lowCompMakeup.value, midCompMakeup.value, highCompMakeup.value];
            const makeupNodes = [compNodes.lowMakeupGain, compNodes.midMakeupGain, compNodes.highMakeupGain];

            for (let i = 0; i < 3; i++) {
                comps[i].threshold.value = parseFloat(thresholds[i]);
                comps[i].ratio.value = parseFloat(ratios[i]);
                comps[i].attack.value = parseFloat(attacks[i]);
                comps[i].release.value = parseFloat(releases[i]);
                makeupNodes[i].gain.value = dbToLinear(parseFloat(makeups[i]));
            }
        } else {
            // --- DRY PATH: Bypass compressor, connect source directly to EQ ---
            source.connect(offlineLowFilter);
        }

        source.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = encodeWav(renderedBuffer);

        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const originalName = audioFiles[0].name.split('.').slice(0, -1).join('.');
        a.download = `${originalName || 'audio'}_processed.wav`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

    } catch (error) {
        console.error("Failed to process audio for download:", error);
        alert("Sorry, there was an error processing the audio.");
    } finally {
        downloadProcessedButton.textContent = originalText;
        if (audioBuffer) {
            downloadProcessedButton.disabled = false;
        }
    }
}

function formatFrequency(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}

/**
 * Enables or disables the Q slider based on the filter type.
 */
function updateQControlState(type: string, qContainer: HTMLDivElement, qSlider: HTMLInputElement) {
    const usesQ = ['peaking', 'bandpass', 'notch'].includes(type);
    qSlider.disabled = !usesQ;
    if (usesQ) {
        qContainer.classList.remove('q-disabled');
    } else {
        qContainer.classList.add('q-disabled');
    }
}

function updateCompressorBypass() {
    if (!compressorWetGain || !compressorDryGain || !audioContext) return;
    
    const wetGain = compressorEnable.checked ? 1 : 0;
    const dryGain = compressorEnable.checked ? 0 : 1;
    const now = audioContext.currentTime;

    // Use setValueAtTime for sample-accurate changes to avoid clicks.
    compressorWetGain.gain.setValueAtTime(wetGain, now);
    compressorDryGain.gain.setValueAtTime(dryGain, now);
}

function handleCompressorChange(event: Event) {
    if (!lowCompressor || !midCompressor || !highCompressor || !lowSplitFilter || !midSplitFilter || !highSplitFilter || !lowMakeupGain || !midMakeupGain || !highMakeupGain) return;
    
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    
    // Enable
    if (target === compressorEnable) {
        updateCompressorBypass();
    }
    // Crossovers
    else if (target === lowMidCrossover) {
        lowSplitFilter.frequency.value = value;
        midSplitFilter.frequency.value = value;
        lowMidCrossoverValue.textContent = formatFrequency(value);
    } else if (target === midHighCrossover) {
        highSplitFilter.frequency.value = value;
        // mid band's lowpass is determined by this
        // This simplified model has mid being highpass(low) -> rest. highpass(high) is the high band.
        // A more correct crossover is needed for a sharp mid band.
        // The current wiring is: mid = highpass(low) AND NOT highpass(high). Which is done by `midSplit.connect(highSplit)`.
        midHighCrossoverValue.textContent = formatFrequency(value);
    }
    // Low Band
    else if (target === lowCompThreshold) { lowCompressor.threshold.value = value; lowCompThresholdValue.textContent = `${value} dB`; }
    else if (target === lowCompRatio) { lowCompressor.ratio.value = value; lowCompRatioValue.textContent = `${value.toFixed(1)}:1`; }
    else if (target === lowCompAttack) { lowCompressor.attack.value = value; lowCompAttackValue.textContent = `${(value * 1000).toFixed(0)} ms`; }
    else if (target === lowCompRelease) { lowCompressor.release.value = value; lowCompReleaseValue.textContent = `${(value * 1000).toFixed(0)} ms`; }
    else if (target === lowCompMakeup) { lowMakeupGain.gain.value = dbToLinear(value); lowCompMakeupValue.textContent = `${value} dB`; }
    // Mid Band
    else if (target === midCompThreshold) { midCompressor.threshold.value = value; midCompThresholdValue.textContent = `${value} dB`; }
    else if (target === midCompRatio) { midCompressor.ratio.value = value; midCompRatioValue.textContent = `${value.toFixed(1)}:1`; }
    else if (target === midCompAttack) { midCompressor.attack.value = value; midCompAttackValue.textContent = `${(value * 1000).toFixed(0)} ms`; }
    else if (target === midCompRelease) { midCompressor.release.value = value; midCompReleaseValue.textContent = `${(value * 1000).toFixed(0)} ms`; }
    else if (target === midCompMakeup) { midMakeupGain.gain.value = dbToLinear(value); midCompMakeupValue.textContent = `${value} dB`; }
    // High Band
    else if (target === highCompThreshold) { highCompressor.threshold.value = value; highCompThresholdValue.textContent = `${value} dB`; }
    else if (target === highCompRatio) { highCompressor.ratio.value = value; highCompRatioValue.textContent = `${value.toFixed(1)}:1`; }
    else if (target === highCompAttack) { highCompressor.attack.value = value; highCompAttackValue.textContent = `${(value * 1000).toFixed(0)} ms`; }
    else if (target === highCompRelease) { highCompressor.release.value = value; highCompReleaseValue.textContent = `${(value * 1000).toFixed(0)} ms`; }
    else if (target === highCompMakeup) { highMakeupGain.gain.value = dbToLinear(value); highCompMakeupValue.textContent = `${value} dB`; }
}


function handleEqChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.value;

    // Gain Sliders
    if (target === lowGainSlider && lowFilter) lowFilter.gain.value = parseFloat(value);
    else if (target === midGainSlider && midFilter) midFilter.gain.value = parseFloat(value);
    else if (target === highGainSlider && highFilter) highFilter.gain.value = parseFloat(value);
    // Frequency Sliders
    else if (target === lowFreqInput && lowFilter) lowFilter.frequency.value = parseFloat(value);
    else if (target === midFreqInput && midFilter) midFilter.frequency.value = parseFloat(value);
    else if (target === highFreqInput && highFilter) highFilter.frequency.value = parseFloat(value);
    // Q Sliders
    else if (target === lowQSlider && lowFilter) lowFilter.Q.value = parseFloat(value);
    else if (target === midQSlider && midFilter) midFilter.Q.value = parseFloat(value);
    else if (target === highQSlider && highFilter) highFilter.Q.value = parseFloat(value);
    // Filter Type Selectors
    else if (target === lowFilterType && lowFilter) { lowFilter.type = value as BiquadFilterType; updateQControlState(value, lowQContainer, lowQSlider); }
    else if (target === midFilterType && midFilter) { midFilter.type = value as BiquadFilterType; updateQControlState(value, midQContainer, midQSlider); }
    else if (target === highFilterType && highFilter) { highFilter.type = value as BiquadFilterType; updateQControlState(value, highQContainer, highQSlider); }
    
    updateAllEqDisplays();
    updateStaticEqCurve();
}

function handleEqReset() {
    // Reset sliders and inputs to their HTML default values
    [lowGainSlider, midGainSlider, highGainSlider, lowFreqInput, midFreqInput, highFreqInput, lowQSlider, midQSlider, highQSlider].forEach(slider => {
        slider.value = slider.defaultValue;
    });

    // Reset select elements
    [lowFilterType, midFilterType, highFilterType].forEach(select => {
        const defaultOption = select.querySelector('option[selected]');
        if (defaultOption) {
            select.value = (defaultOption as HTMLOptionElement).value;
        } else if (select.options.length > 0) {
            select.value = select.options[0].value; // Fallback
        }
    });

    updateAllEqValues(); // Apply changes to audio nodes
    updateAllQControlsState(); // Update disabled state of Q sliders
    updateStaticEqCurve(); // Redraw the curve
}

function handleCompressorReset() {
    // Reset all compressor sliders to their HTML default values
    [
        lowMidCrossover, midHighCrossover,
        lowCompThreshold, lowCompRatio, lowCompAttack, lowCompRelease, lowCompMakeup,
        midCompThreshold, midCompRatio, midCompAttack, midCompRelease, midCompMakeup,
        highCompThreshold, highCompRatio, highCompAttack, highCompRelease, highCompMakeup
    ].forEach(slider => {
        slider.value = slider.defaultValue;
    });
    
    // Reset the enable checkbox to its default state
    compressorEnable.checked = compressorEnable.defaultChecked;

    updateAllCompressorValues(); // Apply changes to audio nodes
    updateCompressorBypass(); // Apply the enable/disable state
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  const t = translations[currentLang];
  
  cleanupVisualizer();

  if (files && files.length > 0) {
    audioFiles = Array.from(files);
    fileNameSpan.textContent = audioFiles.length === 1
      ? audioFiles[0].name
      : `${audioFiles.length} files selected`;
    visualizerPanel.hidden = false;
    setupAudio(audioFiles[0]);
  } else {
    audioFiles = [];
    fileNameSpan.textContent = t.noFileSelected;
    visualizerPanel.hidden = true;
  }
  updateSubmitButtonState(audioFiles);
}

async function handleSubmit() {
  submitButton.disabled = true;
  downloadButton.hidden = true;
  loader.hidden = false;
  const t = translations[currentLang];
  resultText.innerHTML = '';

  try {
    if (audioFiles.length === 0) {
        throw new Error("Please select at least one audio file.");
    }
      
    if (audioFiles.length > 10) {
      throw new Error("Analysis is limited to a maximum of 10 files at a time.");
    }
    
    let totalDuration = 0;
    for (const file of audioFiles) {
        totalDuration += await getAudioDuration(file);
    }

    if (totalDuration > 3600) { // 1 hour = 3600 seconds
        throw new Error(`Total audio duration appears to exceed the 1-hour limit. Your files total approximately ${Math.round(totalDuration / 60)} minutes.`);
    }

    const requestedObjects = new Set<string>();
    
    // This logic maps the new consolidated checkboxes to the schema objects
    if (optionMetadata.checked) requestedObjects.add('songMetadata');
    if (optionSpectral.checked) requestedObjects.add('spectralAnalysis');
    if (optionDynamicsStereo.checked) requestedObjects.add('dynamicsAndStereoAnalysis');
    if (optionEffects.checked) requestedObjects.add('effectsAnalysis');
    if (optionAiCheck.checked) requestedObjects.add('aiDetection');
    
    if (requestedObjects.size === 0) {
        throw new Error("Please select at least one analysis option.");
    }

    const parts: any[] = [];
    
    const initialInstruction = `Analyze the following audio file(s). It is a ${audioFiles.length > 1 ? 'set of stems' : 'full mix'}.`;
    parts.push({ text: initialInstruction });

    for (const file of audioFiles) {
        let fileToProcess: File | Blob = file;
        let mimeType = getMimeType(file);
        let fileName = file.name;

        if (optionTruncate.checked) {
            try {
                console.log(`Truncating ${file.name}...`);
                const truncatedBlob = await truncateAudio(file);
                fileToProcess = truncatedBlob;
                mimeType = 'audio/wav'; // The output of truncateAudio is always WAV
                const originalNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                fileName = `${originalNameWithoutExt}_truncated.wav`;
                console.log(`Truncation complete for ${file.name}.`);
            } catch (err) {
                console.error(`Could not truncate audio for ${file.name}. Using the original file.`, err);
                // Fallback to the original file; variables are already set correctly.
            }
        }

        if (audioFiles.length > 1) {
             parts.push({ text: `This part is a stem named "${fileName}":` });
        }
        const base64Audio = await fileToBase64(fileToProcess);
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Audio,
            },
        });
    }

    const finalInstructionParts = [
      `\nYour JSON response MUST contain populated objects for ALL of the following top-level keys. Do not omit any keys from this list:`,
      ...Array.from(requestedObjects).map(key => `- \`${key}\``)
    ];
    const finalInstruction = finalInstructionParts.join('\n');
    parts.push({ text: finalInstruction });

    const contents = { parts };
    const model = 'gemini-2.5-flash';
    
    const languageMap: Record<string, string> = {
      en: 'English',
      zh: 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      ja: 'Japanese',
      ko: 'Korean'
    };
    const languageName = languageMap[currentLang] || 'English';
    const dynamicSystemInstruction = `${systemInstruction}\n\nIMPORTANT: Your entire response, including all analysis and recommendations, must be written in ${languageName}.`;

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: dynamicSystemInstruction,
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema,
        seed: 42,
      },
    });
    
    try {
        const jsonString = response.text.trim();
        const analysisData = JSON.parse(jsonString);
        await renderAnalysis(analysisData, t);
        downloadButton.hidden = false;
    } catch (parseError) {
        console.error("Failed to parse JSON response from AI:", parseError);
        console.error("Raw AI response:", response.text);
        resultText.textContent = 'An error occurred while parsing the AI response. The response may not be valid JSON. Please check the console for details.';
    }

  } catch (error) {
    console.error(error);
    resultText.textContent = `An error occurred: ${error.message}. Please check the console for details and try again.`;
  } finally {
    loader.hidden = true;
    updateSubmitButtonState(audioFiles);
  }
}

async function handleDownload() {
    const originalText = downloadButton.textContent;
    downloadButton.textContent = 'Generating PDF...';
    downloadButton.disabled = true;

    try {
        const reportElement = document.getElementById('result-text');
        if (!reportElement || audioFiles.length === 0) return;

        // Use html2canvas to render the element to a canvas
        const canvas = await html2canvas(reportElement, {
            scale: 2, // Increase scale for better resolution
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        const margin = 15;
        let finalImgWidth = pdfWidth - margin * 2;
        let finalImgHeight = finalImgWidth / ratio;
        
        let heightLeft = finalImgHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, finalImgWidth, finalImgHeight);
        heightLeft -= (pdfHeight - margin * 2);

        while (heightLeft > 0) {
            pdf.addPage();
            position = -pdfHeight + margin * 2 - (finalImgHeight - heightLeft);
            pdf.addImage(imgData, 'PNG', margin, position, finalImgWidth, finalImgHeight);
            heightLeft -= (pdfHeight - margin * 2);
        }

        const filenameBase = audioFiles[0].name.split('.').slice(0, -1).join('.') || 'audio';
        pdf.save(`analysis-report-${filenameBase}.pdf`);
        
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Sorry, there was an error generating the PDF report.");
    } finally {
        downloadButton.textContent = originalText;
        downloadButton.disabled = false;
    }
}


function setLanguage(lang: string) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  const t = translations[lang];

  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.getAttribute('data-i18n-key');
    if (key && t[key]) {
      (el as HTMLElement).innerHTML = t[key];
    }
  });

  if (audioFiles.length === 0) {
    fileNameSpan.textContent = t.noFileSelected;
  }
  
  if (resultText.getAttribute('data-i18n-key') === 'initialResultText' && !resultText.innerHTML.includes('<h2>')) {
    resultText.textContent = t.initialResultText;
  }
}

function updateAllEqDisplays() {
    lowGainValue.textContent = `${lowGainSlider.value} dB`;
    midGainValue.textContent = `${midGainSlider.value} dB`;
    highGainValue.textContent = `${highGainSlider.value} dB`;
    lowFreqValue.textContent = formatFrequency(parseFloat(lowFreqInput.value));
    midFreqValue.textContent = formatFrequency(parseFloat(midFreqInput.value));
    highFreqValue.textContent = formatFrequency(parseFloat(highFreqInput.value));
    lowQValue.textContent = parseFloat(lowQSlider.value).toFixed(1);
    midQValue.textContent = parseFloat(midQSlider.value).toFixed(1);
    highQValue.textContent = parseFloat(highQSlider.value).toFixed(1);
}

function updateAllEqValues() {
    if (!lowFilter || !midFilter || !highFilter) return;
    lowFilter.gain.value = parseFloat(lowGainSlider.value);
    midFilter.gain.value = parseFloat(midGainSlider.value);
    highFilter.gain.value = parseFloat(highGainSlider.value);
    lowFilter.frequency.value = parseFloat(lowFreqInput.value);
    midFilter.frequency.value = parseFloat(midFreqInput.value);
    highFilter.frequency.value = parseFloat(highFreqInput.value);
    lowFilter.Q.value = parseFloat(lowQSlider.value);
    midFilter.Q.value = parseFloat(midQSlider.value);
    highFilter.Q.value = parseFloat(highQSlider.value);
    lowFilter.type = lowFilterType.value as BiquadFilterType;
    midFilter.type = midFilterType.value as BiquadFilterType;
    highFilter.type = highFilterType.value as BiquadFilterType;
    updateAllEqDisplays();
}

function updateAllCompressorDisplays() {
    lowMidCrossoverValue.textContent = formatFrequency(parseFloat(lowMidCrossover.value));
    midHighCrossoverValue.textContent = formatFrequency(parseFloat(midHighCrossover.value));
    
    lowCompThresholdValue.textContent = `${lowCompThreshold.value} dB`;
    lowCompRatioValue.textContent = `${parseFloat(lowCompRatio.value).toFixed(1)}:1`;
    lowCompAttackValue.textContent = `${(parseFloat(lowCompAttack.value) * 1000).toFixed(0)} ms`;
    lowCompReleaseValue.textContent = `${(parseFloat(lowCompRelease.value) * 1000).toFixed(0)} ms`;
    lowCompMakeupValue.textContent = `${lowCompMakeup.value} dB`;

    midCompThresholdValue.textContent = `${midCompThreshold.value} dB`;
    midCompRatioValue.textContent = `${parseFloat(midCompRatio.value).toFixed(1)}:1`;
    midCompAttackValue.textContent = `${(parseFloat(midCompAttack.value) * 1000).toFixed(0)} ms`;
    midCompReleaseValue.textContent = `${(parseFloat(midCompRelease.value) * 1000).toFixed(0)} ms`;
    midCompMakeupValue.textContent = `${midCompMakeup.value} dB`;
    
    highCompThresholdValue.textContent = `${highCompThreshold.value} dB`;
    highCompRatioValue.textContent = `${parseFloat(highCompRatio.value).toFixed(1)}:1`;
    highCompAttackValue.textContent = `${(parseFloat(highCompAttack.value) * 1000).toFixed(0)} ms`;
    highCompReleaseValue.textContent = `${(parseFloat(highCompRelease.value) * 1000).toFixed(0)} ms`;
    highCompMakeupValue.textContent = `${highCompMakeup.value} dB`;
}

function updateAllCompressorValues() {
    if (!lowCompressor || !midCompressor || !highCompressor || !lowSplitFilter || !midSplitFilter || !highSplitFilter || !lowMakeupGain || !midMakeupGain || !highMakeupGain) return;
    
    lowSplitFilter.frequency.value = parseFloat(lowMidCrossover.value);
    midSplitFilter.frequency.value = parseFloat(lowMidCrossover.value);
    highSplitFilter.frequency.value = parseFloat(midHighCrossover.value);
    
    lowCompressor.threshold.value = parseFloat(lowCompThreshold.value);
    lowCompressor.ratio.value = parseFloat(lowCompRatio.value);
    lowCompressor.attack.value = parseFloat(lowCompAttack.value);
    lowCompressor.release.value = parseFloat(lowCompRelease.value);
    lowMakeupGain.gain.value = dbToLinear(parseFloat(lowCompMakeup.value));
    
    midCompressor.threshold.value = parseFloat(midCompThreshold.value);
    midCompressor.ratio.value = parseFloat(midCompRatio.value);
    midCompressor.attack.value = parseFloat(midCompAttack.value);
    midCompressor.release.value = parseFloat(midCompRelease.value);
    midMakeupGain.gain.value = dbToLinear(parseFloat(midCompMakeup.value));

    highCompressor.threshold.value = parseFloat(highCompThreshold.value);
    highCompressor.ratio.value = parseFloat(highCompRatio.value);
    highCompressor.attack.value = parseFloat(highCompAttack.value);
    highCompressor.release.value = parseFloat(highCompRelease.value);
    highMakeupGain.gain.value = dbToLinear(parseFloat(highCompMakeup.value));
    
    updateAllCompressorDisplays();
}


function updateAllQControlsState() {
    updateQControlState(lowFilterType.value, lowQContainer, lowQSlider);
    updateQControlState(midFilterType.value, midQContainer, midQSlider);
    updateQControlState(highFilterType.value, highQContainer, highQSlider);
}

// --- Initialization ---
function main() {
  fileInput.addEventListener('change', handleFileChange);
  submitButton.addEventListener('click', handleSubmit);
  downloadButton.addEventListener('click', handleDownload);
  downloadProcessedButton.addEventListener('click', handleDownloadProcessedAudio);
  languageSelector.addEventListener('change', (e) => setLanguage((e.target as HTMLSelectElement).value));
  playPauseButton.addEventListener('click', handlePlayPause);
  timelineContainer.addEventListener('click', handleTimelineScrub);
  
  // EQ Listeners
  const eqControls = [lowGainSlider, midGainSlider, highGainSlider, lowFreqInput, midFreqInput, highFreqInput, lowQSlider, midQSlider, highQSlider, lowFilterType, midFilterType, highFilterType];
  eqControls.forEach(control => control.addEventListener('input', handleEqChange));
  eqResetButton.addEventListener('click', handleEqReset);

  // Compressor Listeners
  const compControls = [
      compressorEnable, lowMidCrossover, midHighCrossover,
      lowCompThreshold, lowCompRatio, lowCompAttack, lowCompRelease, lowCompMakeup,
      midCompThreshold, midCompRatio, midCompAttack, midCompRelease, midCompMakeup,
      highCompThreshold, highCompRatio, highCompAttack, highCompRelease, highCompMakeup
  ];
  compControls.forEach(control => control.addEventListener('input', handleCompressorChange));
  compressorResetButton.addEventListener('click', handleCompressorReset);

  playPauseButton.innerHTML = playIcon;
  playPauseButton.disabled = true;
  downloadProcessedButton.disabled = true;
  updateAllEqDisplays();
  updateAllCompressorDisplays();
  updateAllQControlsState();
  setLanguage(currentLang);
  updateSubmitButtonState(audioFiles); // Initial state
}

main();