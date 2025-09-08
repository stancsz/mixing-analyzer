/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
// FIX: Import html2canvas to resolve 'Cannot find name' error.
import html2canvas from 'html2canvas';
import {
  downloadButton, fileInput, fileNameSpan, languageSelector, loader,
  optionAiCheck, optionDynamicsStereo, optionEffects, optionMetadata,
  optionSpectral, resultText, submitButton
} from './ui-elements';
import { ai, responseSchema, systemInstruction } from './gemini';
import { translations } from './i18n';
import { renderAnalysis, updateSubmitButtonState } from './ui';
import { fileToBase64, getAudioDuration, getMimeType } from './utils';

// --- App State ---
let audioFiles: File[] = [];
let currentLang = 'en';

// --- Event Handlers ---

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  const t = translations[currentLang];
  if (files && files.length > 0) {
    audioFiles = Array.from(files);
    fileNameSpan.textContent = audioFiles.length === 1
      ? audioFiles[0].name
      : `${audioFiles.length} files selected`;
  } else {
    audioFiles = [];
    fileNameSpan.textContent = t.noFileSelected;
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
        if (audioFiles.length > 1) {
             parts.push({ text: `This part is a stem named "${file.name}":` });
        }
        const base64Audio = await fileToBase64(file);
        parts.push({
            inlineData: {
                mimeType: getMimeType(file),
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

// --- Initialization ---
function main() {
  fileInput.addEventListener('change', handleFileChange);
  submitButton.addEventListener('click', handleSubmit);
  downloadButton.addEventListener('click', handleDownload);
  languageSelector.addEventListener('change', (e) => setLanguage((e.target as HTMLSelectElement).value));
  setLanguage(currentLang);
  updateSubmitButtonState(audioFiles); // Initial state
}

main();