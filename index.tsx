/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const API_KEY = process.env.API_KEY;

// --- DOM Elements ---
const languageSelector = document.getElementById('language-selector') as HTMLSelectElement;
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const fileNameSpan = document.getElementById('file-name') as HTMLSpanElement;
const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const resultText = document.getElementById('result-text') as HTMLDivElement;
const optionMixing = document.getElementById('option-mixing') as HTMLInputElement;
const optionHarshness = document.getElementById('option-harshness') as HTMLInputElement;
const optionAiCheck = document.getElementById('option-ai-check') as HTMLInputElement;
const optionEffects = document.getElementById('option-effects') as HTMLInputElement;
const optionMetadata = document.getElementById('option-metadata') as HTMLInputElement;


// --- App State ---
let audioFiles: File[] = [];
let currentLang = 'en';
let markdownReportContent = '';


// --- i18n ---
const translations = {
  en: {
    appTitle: 'Mixing Analyzer',
    appDescription: 'An AI-powered mixing analyzer for audio engineers, producers, and music professionals.',
    languageLabel: 'Language',
    uploadLabel: '&#127925; Choose Track or Stems',
    noFileSelected: 'No file(s) selected',
    submitButton: 'Analyze Audio',
    downloadButton: 'Download Report',
    analysisOptionsTitle: 'Analysis Options',
    optionMixing: 'Mixing & Mastering Feedback',
    optionHarshness: 'Harshness & Resonance Analysis',
    optionEffects: 'Reverb & Delay Analysis',
    optionMetadata: 'Song Key, BPM, & Genre ID',
    optionAiCheck: 'AI Generation Check',
    initialResultText: 'Your audio analysis will appear here.',
    mixingFeedbackTitle: 'Mixing & Mastering Feedback',
    harshnessAnalysisTitle: 'Harshness & Resonance Analysis',
    effectsAnalysisTitle: 'Effects (Reverb & Delay) Analysis',
    metadataTitle: 'Song Metadata',
    aiDetectionTitle: 'AI Generation Analysis',
  },
  zh: {
    appTitle: '混音分析器',
    appDescription: '一款为音频工程师、制作人和音乐专业人士打造的AI驱动的混音分析工具。',
    languageLabel: '语言',
    uploadLabel: '&#127925; 选择音轨或分轨',
    noFileSelected: '未选择文件',
    submitButton: '分析音频',
    downloadButton: '下载报告',
    analysisOptionsTitle: '分析选项',
    optionMixing: '混音和母带处理反馈',
    optionHarshness: '刺耳声和谐振分析',
    optionEffects: '混响和延迟分析',
    optionMetadata: '歌曲调性、BPM和流派识别',
    optionAiCheck: 'AI生成检测',
    initialResultText: '您的音频分析将显示在此处。',
    mixingFeedbackTitle: '混音和母带处理反馈',
    harshnessAnalysisTitle: '刺耳声和谐振分析',
    effectsAnalysisTitle: '效果（混响和延迟）分析',
    metadataTitle: '歌曲元数据',
    aiDetectionTitle: 'AI生成分析',
  },
  ja: {
    appTitle: 'ミキシングアナライザー',
    appDescription: 'オーディオエンジニア、プロデューサー、音楽専門家のためのAI搭載ミキシングアナライザーです。',
    languageLabel: '言語',
    uploadLabel: '&#127925; トラックまたはステムを選択',
    noFileSelected: 'ファイルが選択されていません',
    submitButton: 'オーディオを分析',
    downloadButton: 'レポートをダウンロード',
    analysisOptionsTitle: '分析オプション',
    optionMixing: 'ミキシング＆マスタリングのフィードバック',
    optionHarshness: 'ハーシュネス＆レゾナンス分析',
    optionEffects: 'リバーブ＆ディレイ分析',
    optionMetadata: '曲のキー、BPM、ジャンルの特定',
    optionAiCheck: 'AI 生成チェック',
    initialResultText: 'オーディオ分析はここに表示されます。',
    mixingFeedbackTitle: 'ミキシング＆マスタリングのフィードバック',
    harshnessAnalysisTitle: 'ハーシュネス＆レゾナンス分析',
    effectsAnalysisTitle: 'エフェクト（リバーブ＆ディレイ）分析',
    metadataTitle: '曲のメタデータ',
    aiDetectionTitle: 'AI 生成分析',
  },
};

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        mixingFeedback: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing detailed feedback on the mix and master. This should be null if not requested.",
            properties: {
                overallBalance: { type: Type.STRING, description: "Critique of the overall spectral and level balance of the mix." },
                eqAnalysis: { type: Type.STRING, description: "Analysis of the EQ, identifying frequency buildups or deficiencies." },
                dynamicsAnalysis: { type: Type.STRING, description: "Assessment of dynamic range, compression, and transient impact." },
                loudness: {
                    type: Type.OBJECT,
                    description: "Loudness metrics for the track.",
                    properties: {
                        integratedLUFS: { type: Type.NUMBER, description: "Estimated Integrated Loudness in LUFS." },
                        shortTermLUFS: { type: Type.NUMBER, description: "Estimated Short-Term Loudness in LUFS." },
                        truePeak: { type: Type.NUMBER, description: "Estimated True Peak level in dBTP." },
                        lufsRecommendation: { type: Type.STRING, description: "A recommendation for target loudness based on the material." }
                    },
                    required: ["integratedLUFS", "shortTermLUFS", "truePeak", "lufsRecommendation"]
                },
                stereoImage: { type: Type.STRING, description: "Analysis of the stereo width, balance, and mono compatibility." },
                recommendations: { type: Type.STRING, description: "A bulleted list in markdown format of 3-5 concrete, actionable suggestions for improving the mix." }
            },
        },
        harshnessAnalysis: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing analysis of harsh frequencies. This should be null if not requested.",
            properties: {
                problematicFrequencyRanges: { type: Type.STRING, description: "Specific frequency ranges that sound harsh or resonant (e.g., '2-4kHz', 'around 500Hz')." },
                analysis: { type: Type.STRING, description: "Detailed analysis of why the track sounds harsh, identifying the likely source instruments." },
                recommendations: { type: Type.STRING, description: "A bulleted list in markdown format of specific recommendations (e.g., dynamic EQ cuts) to fix the issues." }
            },
        },
        effectsAnalysis: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing analysis of reverb and delay. This should be null if not requested.",
            properties: {
                reverbAnalysis: { type: Type.STRING, description: "Analysis of the reverb, including its size, decay time, and appropriateness for the mix." },
                delayAnalysis: { type: Type.STRING, description: "Analysis of the delay, including its timing, feedback, and stereo placement." },
            },
        },
        songMetadata: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing metadata about the song. This should be null if not requested.",
            properties: {
                bpm: { type: Type.NUMBER, description: "The estimated beats per minute (BPM) of the song." },
                key: { type: Type.STRING, description: "The estimated musical key of the song (e.g., 'C Major', 'A Minor')." },
                genre: { type: Type.STRING, description: "The estimated genre of the song (e.g., 'Pop', 'Rock', 'EDM')." },
                instruments: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of instruments identified in the track." }
            },
        },
        aiDetection: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing the AI generation analysis. This should be null if not requested.",
            properties: {
                isAiGenerated: { type: Type.BOOLEAN, description: "True if AI generation is detected, false otherwise." },
                confidence: { type: Type.NUMBER, description: "Confidence score for the detection, from 0.0 to 1.0." },
                justification: { type: Type.STRING, description: "An explanation for the detection result, citing specific sonic artifacts or characteristics." }
            },
        }
    }
};


const systemInstruction = `You are a world-class mixing and mastering engineer with perfect pitch and an encyclopedic knowledge of audio engineering principles. Your task is to provide a detailed, objective, and technical analysis of audio files. The audio file duration will be less than 10 minutes. Your output MUST be a single, valid JSON object conforming to the provided schema.

**Core Directives:**
1.  **Technical Precision:** Your analysis must be grounded in established audio engineering terminology (e.g., LUFS, dBTP, frequency ranges in Hz/kHz, dynamic range, stereo imaging).
2.  **Objectivity:** Avoid subjective statements about the artistic quality of the music. Focus solely on the technical aspects of the mix and master.
3.  **Actionable Feedback:** All recommendations must be concrete and actionable for an audio engineer to implement.
4.  **Schema Adherence:** Generate only the JSON fields requested by the user in the prompt. If a specific analysis was not requested, its corresponding JSON object must be null.

**METHODOLOGY:**

1.  **Identify Input Type:** Determine if the user uploaded a single file (a full mix) or multiple files (individual stems). Tailor your analysis accordingly. If stems are provided, comment on how they might fit together in a mix.
2.  **Perform Requested Analyses:** Based on the user's prompt, execute the following analyses:

    *   **If Mixing & Mastering Feedback is requested:** Analyze EQ, dynamics, loudness, stereo image, and provide recommendations.
    *   **If Harshness & Resonance Analysis is requested:** Pinpoint problematic frequencies, analyze the cause, and provide specific recommendations.
    *   **If Reverb & Delay Analysis is requested:** Analyze the use of spatial effects. For reverb, comment on its size, decay, and mix appropriateness. For delay, comment on its timing and placement.
    *   **If Song Key, BPM, & Genre ID is requested:** Estimate the song's BPM, musical key, primary genre, and list the main instruments you can identify.
    *   **If AI Generation Check is requested:** Analyze for AI artifacts, provide a boolean result, confidence score, and justification.

3.  **Construct JSON:** Assemble the final JSON object, ensuring it strictly conforms to the schema and only contains data for the requested analyses. Your entire output must be the JSON object and nothing else.
`;

// --- Utility Functions ---
/**
 * Converts a file to a base64 encoded string.
 */
function fileToBase64(file: File): Promise<string> {
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
function getMimeType(file: File): string {
    if (file.type) {
        return file.type;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'flac': return 'audio/flac';
        case 'wav': return 'audio/wav';
        case 'mp3': return 'audio/mpeg';
        default: return 'application/octet-stream'; // A generic fallback
    }
}

/**
 * Gets the duration of an audio file in seconds.
 * This is a best-effort check and returns 0 if duration can't be determined.
 */
function getAudioDuration(file: File): Promise<number> {
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


/**
 * Updates the state of the submit button.
 */
function updateSubmitButtonState() {
  submitButton.disabled = audioFiles.length === 0;
}

/**
 * Renders the analysis from a structured JSON object into the main output panel.
 */
async function renderAnalysis(analysisData: any, t: Record<string, string>) {
  let finalHtml = '';

  if (analysisData.songMetadata) {
    const d = analysisData.songMetadata;
    finalHtml += `<h2>${t.metadataTitle}</h2>`;
    let metadataHtml = '<ul>';
    if (d.bpm) metadataHtml += `<li><strong>BPM:</strong> ${d.bpm}</li>`;
    if (d.key) metadataHtml += `<li><strong>Key:</strong> ${d.key}</li>`;
    if (d.genre) metadataHtml += `<li><strong>Genre:</strong> ${d.genre}</li>`;
    if (d.instruments && d.instruments.length > 0) {
      metadataHtml += `<li><strong>Instruments:</strong> ${d.instruments.join(', ')}</li>`;
    }
    metadataHtml += '</ul>';
    finalHtml += metadataHtml;
  }

  if (analysisData.mixingFeedback) {
    const d = analysisData.mixingFeedback;
    finalHtml += `<h2>${t.mixingFeedbackTitle}</h2>`;
    finalHtml += `<h4>Overall Balance</h4><p>${d.overallBalance}</p>`;
    finalHtml += `<h4>EQ Analysis</h4><p>${d.eqAnalysis}</p>`;
    finalHtml += `<h4>Dynamics Analysis</h4><p>${d.dynamicsAnalysis}</p>`;
    finalHtml += `<h4>Stereo Image</h4><p>${d.stereoImage}</p>`;
    if (d.loudness) {
      finalHtml += `<h4>Loudness</h4>
        <p>
          <strong>Integrated LUFS:</strong> ${d.loudness.integratedLUFS} LUFS<br>
          <strong>Short-Term LUFS:</strong> ${d.loudness.shortTermLUFS} LUFS<br>
          <strong>True Peak:</strong> ${d.loudness.truePeak} dBTP
        </p>
        <p><em>${d.loudness.lufsRecommendation}</em></p>`;
    }
    finalHtml += `<h4>Recommendations</h4>${await marked.parse(d.recommendations)}`;
  }

  if (analysisData.harshnessAnalysis) {
    const d = analysisData.harshnessAnalysis;
    finalHtml += `<h2>${t.harshnessAnalysisTitle}</h2>`;
    finalHtml += `<h4>Problematic Frequency Ranges</h4><p><code>${d.problematicFrequencyRanges}</code></p>`;
    finalHtml += `<h4>Analysis</h4><p>${d.analysis}</p>`;
    finalHtml += `<h4>Recommendations</h4>${await marked.parse(d.recommendations)}`;
  }
  
  if (analysisData.effectsAnalysis) {
    const d = analysisData.effectsAnalysis;
    finalHtml += `<h2>${t.effectsAnalysisTitle}</h2>`;
    finalHtml += `<h4>Reverb</h4><p>${d.reverbAnalysis}</p>`;
    finalHtml += `<h4>Delay</h4><p>${d.delayAnalysis}</p>`;
  }

  if (analysisData.aiDetection) {
    const d = analysisData.aiDetection;
    finalHtml += `<h2>${t.aiDetectionTitle}</h2>`;
    const confidencePercent = (d.confidence * 100).toFixed(1);
    finalHtml += `<h4>Result</h4><p><strong>AI Generated:</strong> ${d.isAiGenerated ? 'Yes' : 'No'} (${confidencePercent}% confidence)</p>`;
    finalHtml += `<h4>Justification</h4><p>${d.justification}</p>`;
  }
  
  resultText.innerHTML = DOMPurify.sanitize(finalHtml);
}

function generateMarkdownReport(analysisData: any, t: Record<string, string>): string {
    let md = `# ${t.appTitle} Report\n\n`;
    md += `**Files Analyzed:** ${audioFiles.map(f => f.name).join(', ')}\n`;
    md += `**Analysis Date:** ${new Date().toLocaleString()}\n\n`;

    if (analysisData.songMetadata) {
        const d = analysisData.songMetadata;
        md += `## ${t.metadataTitle}\n\n`;
        if (d.bpm) md += `- **BPM:** ${d.bpm}\n`;
        if (d.key) md += `- **Key:** ${d.key}\n`;
        if (d.genre) md += `- **Genre:** ${d.genre}\n`;
        if (d.instruments && d.instruments.length > 0) {
            md += `- **Instruments:** ${d.instruments.join(', ')}\n`;
        }
        md += `\n`;
    }

    if (analysisData.mixingFeedback) {
        const d = analysisData.mixingFeedback;
        md += `## ${t.mixingFeedbackTitle}\n\n`;
        md += `### Overall Balance\n${d.overallBalance}\n\n`;
        md += `### EQ Analysis\n${d.eqAnalysis}\n\n`;
        md += `### Dynamics Analysis\n${d.dynamicsAnalysis}\n\n`;
        md += `### Stereo Image\n${d.stereoImage}\n\n`;
        if (d.loudness) {
            md += `### Loudness\n- **Integrated LUFS:** ${d.loudness.integratedLUFS} LUFS\n- **Short-Term LUFS:** ${d.loudness.shortTermLUFS} LUFS\n- **True Peak:** ${d.loudness.truePeak} dBTP\n\n*${d.loudness.lufsRecommendation}*\n\n`;
        }
        md += `### Recommendations\n${d.recommendations}\n\n`;
    }

    if (analysisData.harshnessAnalysis) {
        const d = analysisData.harshnessAnalysis;
        md += `## ${t.harshnessAnalysisTitle}\n\n`;
        md += `### Problematic Frequency Ranges\n\`${d.problematicFrequencyRanges}\`\n\n`;
        md += `### Analysis\n${d.analysis}\n\n`;
        md += `### Recommendations\n${d.recommendations}\n\n`;
    }
    
    if (analysisData.effectsAnalysis) {
        const d = analysisData.effectsAnalysis;
        md += `## ${t.effectsAnalysisTitle}\n\n`;
        md += `### Reverb\n${d.reverbAnalysis}\n\n`;
        md += `### Delay\n${d.delayAnalysis}\n\n`;
    }

    if (analysisData.aiDetection) {
        const d = analysisData.aiDetection;
        md += `## ${t.aiDetectionTitle}\n\n`;
        const confidencePercent = (d.confidence * 100).toFixed(1);
        md += `### Result\n**AI Generated:** ${d.isAiGenerated ? 'Yes' : 'No'} (${confidencePercent}% confidence)\n\n`;
        md += `### Justification\n${d.justification}\n\n`;
    }
    
    return md;
}


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
  updateSubmitButtonState();
}

async function handleSubmit() {
  submitButton.disabled = true;
  downloadButton.hidden = true;
  loader.hidden = false;
  const t = translations[currentLang];
  resultText.innerHTML = '';
  markdownReportContent = '';

  try {
    if (audioFiles.length === 0) {
        throw new Error("Please select at least one audio file.");
    }
      
    // Client-side checks for better UX
    if (audioFiles.length > 10) {
      throw new Error("Analysis is limited to a maximum of 10 files at a time.");
    }
    
    let totalDuration = 0;
    // This is a best-effort check. Browser might not be able to read all audio formats Gemini can.
    for (const file of audioFiles) {
        totalDuration += await getAudioDuration(file);
    }

    if (totalDuration > 3600) { // 1 hour = 3600 seconds
        throw new Error(`Total audio duration appears to exceed the 1-hour limit. Your files total approximately ${Math.round(totalDuration / 60)} minutes.`);
    }

    const requestedAnalyses = [];
    if (optionMixing.checked) requestedAnalyses.push("Mixing & Mastering Feedback");
    if (optionHarshness.checked) requestedAnalyses.push("Harshness & Resonance Analysis");
    if (optionAiCheck.checked) requestedAnalyses.push("AI Generation Check");
    if (optionEffects.checked) requestedAnalyses.push("Reverb & Delay Analysis");
    if (optionMetadata.checked) requestedAnalyses.push("Song Key, BPM, & Genre ID");

    
    if (requestedAnalyses.length === 0) {
        throw new Error("Please select at least one analysis option.");
    }
    
    const parts: any[] = [];
    const promptHeader = `Analyze the following audio file(s). It is a ${audioFiles.length > 1 ? 'set of stems' : 'full mix'}. Please provide the following analyses: ${requestedAnalyses.join(', ')}.`;
    parts.push({ text: promptHeader });

    for (const file of audioFiles) {
        // For multiple files, explicitly introduce each one to the model.
        if (audioFiles.length > 1) {
            parts.push({ text: `This is a stem named "${file.name}":` });
        }
        const base64Audio = await fileToBase64(file);
        parts.push({
            inlineData: {
                mimeType: getMimeType(file),
                data: base64Audio,
            },
        });
    }

    const contents = { parts };
    const model = 'gemini-2.5-flash';
    
    const languageMap: Record<string, string> = { en: 'English', zh: 'Chinese (Simplified)', ja: 'Japanese' };
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
        markdownReportContent = generateMarkdownReport(analysisData, t);
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
    updateSubmitButtonState();
  }
}

function handleDownload() {
    if (!markdownReportContent || audioFiles.length === 0) return;

    const blob = new Blob([markdownReportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filenameBase = audioFiles[0].name.split('.').slice(0, -1).join('.');
    a.download = `analysis-report-${filenameBase}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
}

main();