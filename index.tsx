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
  lowFilterType, midFilterType, highFilterType, lowQContainer, midQContainer, highQContainer
} from './ui-elements';
import { ai, responseSchema, systemInstruction } from './gemini';
import { translations } from './i18n';
import { renderAnalysis, updateSubmitButtonState } from './ui';
import { fileToBase64, getAudioDuration, getMimeType, truncateAudio } from './utils';
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
let lowFilter: BiquadFilterNode | null = null;
let midFilter: BiquadFilterNode | null = null;
let highFilter: BiquadFilterNode | null = null;
let eqFilters: BiquadFilterNode[] = [];
let isPlaying = false;
let animationFrameId: number | null = null;
let startTime = 0;
let startOffset = 0;
// FIX: Use ReturnType<typeof setTimeout> to correctly type the timeout ID for both browser (number) and Node.js (Timeout object) environments.
let scrubTimeoutId: ReturnType<typeof setTimeout> | null = null;

const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>`;
const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg>`;

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
  if (lowFilter) lowFilter.disconnect();
  if (midFilter) midFilter.disconnect();
  if (highFilter) highFilter.disconnect();
  lowFilter = midFilter = highFilter = null;
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
}

function updateStaticEqCurve() {
  if (!audioContext || !eqCurveCanvas || eqFilters.length === 0) return;
  const eqCtx = eqCurveCanvas.getContext('2d');
  if (eqCtx) {
    drawEqCurve(eqFilters, eqCtx, eqCurveCanvas.width, eqCurveCanvas.height, audioContext.sampleRate);
  }
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

  // Create and configure EQ filters
  lowFilter = audioContext.createBiquadFilter();
  lowFilter.type = lowFilterType.value as BiquadFilterType;
  lowFilter.frequency.value = parseFloat(lowFreqInput.value);
  lowFilter.Q.value = parseFloat(lowQSlider.value);
  lowFilter.gain.value = parseFloat(lowGainSlider.value);

  midFilter = audioContext.createBiquadFilter();
  midFilter.type = midFilterType.value as BiquadFilterType;
  midFilter.frequency.value = parseFloat(midFreqInput.value);
  midFilter.Q.value = parseFloat(midQSlider.value);
  midFilter.gain.value = parseFloat(midGainSlider.value);
  
  highFilter = audioContext.createBiquadFilter();
  highFilter.type = highFilterType.value as BiquadFilterType;
  highFilter.frequency.value = parseFloat(highFreqInput.value);
  highFilter.Q.value = parseFloat(highQSlider.value);
  highFilter.gain.value = parseFloat(highGainSlider.value);
  
  eqFilters = [lowFilter, midFilter, highFilter];
  
  // Connect the persistent audio graph. This is only done once.
  lowFilter.connect(midFilter)
    .connect(highFilter);

  // Split the post-EQ signal to the destination and both analysers
  highFilter.connect(audioContext.destination);
  highFilter.connect(analyserNodeSpectrogram);
  highFilter.connect(analyserNodeEq);

  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  updateStaticEqCurve(); // Initial draw
  playPauseButton.disabled = false;
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

  const elapsedTime = audioContext.currentTime - startTime + startOffset;
  const progress = (elapsedTime / audioBuffer.duration) * 100;
  progressBar.style.width = `${Math.min(progress, 100)}%`;

  if (isPlaying) {
    animationFrameId = requestAnimationFrame(renderVisualizations);
  }
}

function playAudio() {
  if (!audioContext || !audioBuffer || isPlaying || !lowFilter) return;

  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;

  // Connect the new source to the start of the persistent filter chain
  sourceNode.connect(lowFilter);

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

function handleEqChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.value;

    // Gain Sliders
    if (target === lowGainSlider && lowFilter) {
        lowFilter.gain.value = parseFloat(value);
        lowGainValue.textContent = `${value} dB`;
    } else if (target === midGainSlider && midFilter) {
        midFilter.gain.value = parseFloat(value);
        midGainValue.textContent = `${value} dB`;
    } else if (target === highGainSlider && highFilter) {
        highFilter.gain.value = parseFloat(value);
        highGainValue.textContent = `${value} dB`;
    }
    // Frequency Sliders
    else if (target === lowFreqInput && lowFilter) {
        const freq = parseFloat(value);
        lowFilter.frequency.value = freq;
        lowFreqValue.textContent = formatFrequency(freq);
    } else if (target === midFreqInput && midFilter) {
        const freq = parseFloat(value);
        midFilter.frequency.value = freq;
        midFreqValue.textContent = formatFrequency(freq);
    } else if (target === highFreqInput && highFilter) {
        const freq = parseFloat(value);
        highFilter.frequency.value = freq;
        highFreqValue.textContent = formatFrequency(freq);
    }
    // Q Sliders
    else if (target === lowQSlider && lowFilter) {
        const q = parseFloat(value);
        lowFilter.Q.value = q;
        lowQValue.textContent = q.toFixed(1);
    } else if (target === midQSlider && midFilter) {
        const q = parseFloat(value);
        midFilter.Q.value = q;
        midQValue.textContent = q.toFixed(1);
    } else if (target === highQSlider && highFilter) {
        const q = parseFloat(value);
        highFilter.Q.value = q;
        highQValue.textContent = q.toFixed(1);
    }
    // Filter Type Selectors
    else if (target === lowFilterType && lowFilter) {
        lowFilter.type = value as BiquadFilterType;
        updateQControlState(value, lowQContainer, lowQSlider);
    } else if (target === midFilterType && midFilter) {
        midFilter.type = value as BiquadFilterType;
        updateQControlState(value, midQContainer, midQSlider);
    } else if (target === highFilterType && highFilter) {
        highFilter.type = value as BiquadFilterType;
        updateQControlState(value, highQContainer, highQSlider);
    }
    
    updateStaticEqCurve();
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
  languageSelector.addEventListener('change', (e) => setLanguage((e.target as HTMLSelectElement).value));
  playPauseButton.addEventListener('click', handlePlayPause);
  timelineContainer.addEventListener('click', handleTimelineScrub);
  
  // EQ Listeners
  lowGainSlider.addEventListener('input', handleEqChange);
  midGainSlider.addEventListener('input', handleEqChange);
  highGainSlider.addEventListener('input', handleEqChange);
  lowFreqInput.addEventListener('input', handleEqChange);
  midFreqInput.addEventListener('input', handleEqChange);
  highFreqInput.addEventListener('input', handleEqChange);
  lowQSlider.addEventListener('input', handleEqChange);
  midQSlider.addEventListener('input', handleEqChange);
  highQSlider.addEventListener('input', handleEqChange);
  lowFilterType.addEventListener('input', handleEqChange);
  midFilterType.addEventListener('input', handleEqChange);
  highFilterType.addEventListener('input', handleEqChange);


  playPauseButton.innerHTML = playIcon;
  playPauseButton.disabled = true;
  updateAllEqDisplays();
  updateAllQControlsState();
  setLanguage(currentLang);
  updateSubmitButtonState(audioFiles); // Initial state
}

main();