/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


Chart.register(annotationPlugin);


const API_KEY = process.env.API_KEY;

// --- DOM Elements ---
const languageSelector = document.getElementById('language-selector') as HTMLSelectElement;
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const fileNameSpan = document.getElementById('file-name') as HTMLSpanElement;
const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const resultText = document.getElementById('result-text') as HTMLDivElement;
const optionHarshness = document.getElementById('option-harshness') as HTMLInputElement;
const optionEqPlot = document.getElementById('option-eq-plot') as HTMLInputElement;
const optionSpectrogram = document.getElementById('option-spectrogram') as HTMLInputElement;
const optionAiCheck = document.getElementById('option-ai-check') as HTMLInputElement;
const optionEffects = document.getElementById('option-effects') as HTMLInputElement;
const optionMetadata = document.getElementById('option-metadata') as HTMLInputElement;
const optionBalanceEq = document.getElementById('option-balance-eq') as HTMLInputElement;
const optionDynamics = document.getElementById('option-dynamics') as HTMLInputElement;
const optionStereo = document.getElementById('option-stereo') as HTMLInputElement;


// --- App State ---
let audioFiles: File[] = [];
let currentLang = 'en';


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
    optionHarshness: 'Harshness & Resonance Analysis',
    optionEqPlot: 'EQ Curve & Frequency Plot',
    optionSpectrogram: 'Spectrogram Plot',
    optionEffects: 'Reverb & Delay Analysis',
    optionMetadata: 'Song Key, BPM, & Genre ID',
    optionAiCheck: 'AI Generation Check',
    optionBalanceEq: 'Overall Balance & EQ',
    optionDynamics: 'Dynamics & Loudness',
    optionStereo: 'Stereo Image Analysis',
    initialResultText: 'Your audio analysis will appear here.',
    harshnessAnalysisTitle: 'Harshness & Resonance Analysis',
    effectsAnalysisTitle: 'Effects (Reverb & Delay) Analysis',
    metadataTitle: 'Song Metadata',
    aiDetectionTitle: 'AI Generation Analysis',
    eqPlotTitle: 'EQ Curve Analysis',
    spectrogramTitle: 'Spectrogram Analysis',
    actionableRecommendationsTitle: 'Actionable Recommendations',
    balanceEqTitle: 'Overall Balance & EQ Analysis',
    dynamicsLoudnessTitle: 'Dynamics & Loudness Analysis',
    stereoImageTitle: 'Stereo Image Analysis',
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
    optionHarshness: '刺耳声和谐振分析',
    optionEqPlot: 'EQ曲线和频率图',
    optionSpectrogram: '频谱图',
    optionEffects: '混响和延迟分析',
    optionMetadata: '歌曲调性、BPM和流派识别',
    optionAiCheck: 'AI生成检测',
    optionBalanceEq: '整体平衡与EQ',
    optionDynamics: '动态与响度',
    optionStereo: '立体声声像分析',
    initialResultText: '您的音频分析将显示在此处。',
    harshnessAnalysisTitle: '刺耳声和谐振分析',
    effectsAnalysisTitle: '效果（混响和延迟）分析',
    metadataTitle: '歌曲元数据',
    aiDetectionTitle: 'AI生成分析',
    eqPlotTitle: 'EQ曲线分析',
    spectrogramTitle: '频谱图分析',
    actionableRecommendationsTitle: '可操作的建议',
    balanceEqTitle: '整体平衡与EQ分析',
    dynamicsLoudnessTitle: '动态与响度分析',
    stereoImageTitle: '立体声声像分析',
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
    optionHarshness: 'ハーシュネス＆レゾナンス分析',
    optionEqPlot: 'EQカーブと周波数プロット',
    optionSpectrogram: 'スペクトログラムプロット',
    optionEffects: 'リバーブ＆ディレイ分析',
    optionMetadata: '曲のキー、BPM、ジャンルの特定',
    optionAiCheck: 'AI 生成チェック',
    optionBalanceEq: '全体的なバランスとEQ',
    optionDynamics: 'ダイナミクスとラウドネス',
    optionStereo: 'ステレオイメージ分析',
    initialResultText: 'オーディオ分析はここに表示されます。',
    harshnessAnalysisTitle: 'ハーシュネス＆レゾナンス分析',
    effectsAnalysisTitle: 'エフェクト（リバーブ＆ディレイ）分析',
    metadataTitle: '曲のメタデータ',
    aiDetectionTitle: 'AI 生成分析',
    eqPlotTitle: 'EQカーブ分析',
    spectrogramTitle: 'スペクトログラム分析',
    actionableRecommendationsTitle: '実行可能な推奨事項',
    balanceEqTitle: '全体的なバランスとEQ分析',
    dynamicsLoudnessTitle: 'ダイナミクスとラウドネス分析',
    stereoImageTitle: 'ステレオイメージ分析',
  },
};

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
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
        eqCurveAnalysis: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing data for an EQ plot, identified problem areas, and actionable recommendations. Null if not requested.",
            properties: {
                plotData: {
                    type: Type.ARRAY,
                    description: "An array of 100-150 points for a plot.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            frequency: { type: Type.NUMBER, description: "Frequency in Hz (e.g., 20, 100, 1000, 20000)." },
                            level: { type: Type.NUMBER, description: "Relative level in dB, from roughly -60dB to 0dB." }
                        },
                        required: ["frequency", "level"]
                    }
                },
                problematicAreas: {
                    type: Type.ARRAY,
                    description: "An array identifying problematic frequency ranges to be highlighted.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            startHz: { type: Type.NUMBER, description: "The starting frequency of the problematic range." },
                            endHz: { type: Type.NUMBER, description: "The ending frequency of the problematic range." },
                            severity: { type: Type.STRING, description: "Severity of the issue. Can be 'warning' (for orange) or 'critical' (for red)." },
                            description: { type: Type.STRING, description: "A brief description of the issue (e.g., 'Muddy buildup', 'Harsh sibilance')." }
                        },
                        required: ["startHz", "endHz", "severity", "description"]
                    }
                },
                recommendations: {
                    type: Type.ARRAY,
                    description: "A structured list of actionable recommendations.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            tool: { type: Type.STRING, description: "The recommended tool (e.g., 'EQ', 'Compressor', 'Filter', 'De-esser')." },
                            action: { type: Type.STRING, description: "The action to perform (e.g., 'Cut', 'Boost', 'Apply High-Pass', 'Tame')." },
                            frequencyRange: { type: Type.STRING, description: "The target frequency or range (e.g., 'at 3.5kHz', 'below 80Hz', '5-8kHz')." },
                            details: { type: Type.STRING, description: "Specific parameters for the action (e.g., 'Apply a narrow Q cut of -3dB', 'Set ratio to 4:1 with a fast attack')." }
                        },
                        required: ["tool", "action", "frequencyRange", "details"]
                    }
                }
            }
        },
        spectrogramAnalysis: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing data for a spectrogram plot and analysis of time-frequency events. Null if not requested.",
            properties: {
                plotData: {
                    type: Type.ARRAY,
                    description: "A sparse array of data points for a heatmap spectrogram. Each point represents a cell with significant energy in the time-frequency grid.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            time: { type: Type.NUMBER, description: "Time offset in seconds (x-axis)." },
                            frequency: { type: Type.NUMBER, description: "Frequency in Hz (y-axis)." },
                            intensity: { type: Type.NUMBER, description: "Intensity or dB level for that cell, from roughly -72dB to 0dB." }
                        },
                        required: ["time", "frequency", "intensity"]
                    }
                },
                problematicAreas: {
                    type: Type.ARRAY,
                    description: "An array identifying problematic rectangular areas on the spectrogram.",
                    items: {
                         type: Type.OBJECT,
                         properties: {
                            startTime: { type: Type.NUMBER, description: "Start time of the issue in seconds." },
                            endTime: { type: Type.NUMBER, description: "End time of the issue in seconds." },
                            startHz: { type: Type.NUMBER, description: "Start frequency of the issue in Hz." },
                            endHz: { type: Type.NUMBER, description: "End frequency of the issue in Hz." },
                            severity: { type: Type.STRING, description: "Severity: 'warning' or 'critical'." },
                            description: { type: Type.STRING, description: "Description of the issue (e.g., 'Sibilant burst', 'Low-frequency hum')." }
                         },
                         required: ["startTime", "endTime", "startHz", "endHz", "severity", "description"]
                    }
                },
                recommendations: {
                    type: Type.ARRAY,
                    description: "A structured list of recommendations to fix spectral issues identified in the spectrogram.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            tool: { type: Type.STRING, description: "e.g., 'Dynamic EQ', 'Multi-band Compressor', 'Transient Shaper', 'De-esser'." },
                            action: { type: Type.STRING, description: "e.g., 'Apply Notch Filter', 'Compress', 'Reduce Attack'." },
                            timeRange: { type: Type.STRING, description: "The target time range (e.g., 'at 1:15', 'throughout the chorus')." },
                            frequencyRange: { type: Type.STRING, description: "The target frequency range (e.g., 'around 6kHz', '100-250Hz')." },
                            details: { type: Type.STRING, description: "Specific parameters (e.g., 'Trigger a -6dB cut with a fast attack/release when the signal at 6kHz exceeds -18dB')." }
                        },
                        required: ["tool", "action", "timeRange", "frequencyRange", "details"]
                    }
                }
            }
        },
        balanceAndEqFeedback: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing feedback on the overall spectral balance and EQ choices. Null if not requested.",
            properties: {
                overallBalance: { type: Type.STRING, description: "Critique of the overall spectral and level balance of the mix." },
                eqAnalysis: { type: Type.STRING, description: "Detailed analysis of the EQ, identifying frequency buildups or deficiencies." },
                recommendations: { type: Type.STRING, description: "A bulleted list in markdown format of 2-3 concrete suggestions for improving balance and EQ." }
            }
        },
        dynamicsAndLoudnessFeedback: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing feedback on dynamics and loudness. Null if not requested.",
            properties: {
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
                recommendations: { type: Type.STRING, description: "A bulleted list in markdown format of 2-3 concrete suggestions for improving dynamics and loudness." }
            }
        },
        stereoImageFeedback: {
            type: Type.OBJECT,
            nullable: true,
            description: "An object containing feedback on the stereo image. Null if not requested.",
            properties: {
                stereoImage: { type: Type.STRING, description: "Analysis of the stereo width, balance, and mono compatibility." },
                recommendations: { type: Type.STRING, description: "A bulleted list in markdown format of 2-3 concrete suggestions for improving the stereo image." }
            }
        },
        harshnessAnalysis: {
            type: Type.OBJECT,
            nullable: true,
            description: "A text-based analysis of harsh frequencies and resonances. Null if not requested.",
            properties: {
                problematicFrequencyRanges: { type: Type.STRING, description: "A summary of specific frequency ranges that sound harsh or resonant (e.g., '2-4kHz', 'around 500Hz')." },
                analysis: { type: Type.STRING, description: "Detailed text analysis of why the track sounds harsh, identifying the likely source instruments." }
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


const systemInstruction = `You are a world-class mixing and mastering engineer with perfect pitch and an encyclopedic knowledge of audio engineering principles. Your task is to provide a detailed, objective, and technical analysis of audio files. The audio file duration will be less than 10 minutes.

**Core Directives:**
1.  **Technical Precision:** Your analysis must be grounded in established audio engineering terminology (e.g., LUFS, dBTP, frequency ranges in Hz/kHz, dynamic range, stereo imaging).
2.  **Objectivity:** Avoid subjective statements about the artistic quality of the music. Focus solely on the technical aspects of the mix and master.
3.  **Actionable Feedback:** All recommendations must be concrete and actionable for an audio engineer to implement.
4.  **Schema Adherence & Prompt Priority:** Your primary directive is to populate the JSON objects for the keys explicitly listed at the end of the user's prompt. You MUST generate a populated, non-null object for EVERY key in that list. Your entire output must be a single, valid JSON object conforming to the provided schema.

**METHODOLOGY:**

1.  **Identify Input Type:** Determine if the user uploaded a single file (a full mix) or multiple files (individual stems). Tailor your analysis accordingly. If stems are provided, comment on how they might fit together in a mix.
2.  **Perform Requested Analyses:** The final part of the user prompt contains a list of required JSON keys. Generate a populated analysis for every key on that list, following the specific methodologies below.

    *   **If 'songMetadata' is requested:** Estimate the song's BPM, musical key, primary genre, and list the main instruments.
    *   **If 'eqCurveAnalysis' is requested:** You MUST populate the 'plotData', 'problematicAreas', and 'recommendations' fields to generate an EQ plot with highlighted problem areas and actionable suggestions.
    *   **If 'spectrogramAnalysis' is requested:**
        *   You must populate all fields within the 'spectrogramAnalysis' object.
        *   Generate 'plotData': Create a sparse set of data points (time, frequency, intensity) representing significant energy events.
        *   Generate 'problematicAreas': Identify 2-5 rectangular regions with issues like harsh transients or continuous hums.
        *   Generate 'recommendations': Create a structured list of actionable steps using tools like Dynamic EQ or multi-band compressors.
    *   **If 'balanceAndEqFeedback' is requested:** Provide a text-based critique of the overall balance and specific EQ choices, along with 2-3 actionable recommendations.
    *   **If 'dynamicsAndLoudnessFeedback' is requested:** Analyze dynamic range, compression, and loudness metrics (LUFS, True Peak), and provide 2-3 actionable recommendations.
    *   **If 'stereoImageFeedback' is requested:** Analyze stereo width, balance, and mono compatibility, and provide 2-3 actionable recommendations.
    *   **If 'harshnessAnalysis' is requested:** Provide a text-only analysis of harshness and resonance in the 'problematicFrequencyRanges' and 'analysis' fields. Do not generate plot data here.
    *   **If 'effectsAnalysis' is requested:** Analyze the use of spatial effects.
    *   **If 'aiDetection' is requested:** Analyze for AI artifacts.

3.  **Construct JSON:** Assemble the final JSON object. Ensure it is valid and contains a non-null, populated object for every key requested in the user prompt.
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

  // The order of these 'if' blocks now matches the checkbox order in index.html
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

  if (analysisData.eqCurveAnalysis) {
      const d = analysisData.eqCurveAnalysis;
      finalHtml += `<h2>${t.eqPlotTitle}</h2>`;
      finalHtml += `<div class="plot-container"><canvas id="eq-plot-canvas"></canvas></div>`;
      finalHtml += `<h3>${t.actionableRecommendationsTitle}</h3>`;
      finalHtml += `<ul class="recommendations-list">`;
      for (const rec of d.recommendations) {
          finalHtml += `<li class="recommendation-item">
              <strong>${rec.tool}: ${rec.action} at ${rec.frequencyRange}</strong>
              <p>${rec.details}</p>
          </li>`;
      }
      finalHtml += `</ul>`;
  }

  if (analysisData.spectrogramAnalysis) {
      const d = analysisData.spectrogramAnalysis;
      finalHtml += `<h2>${t.spectrogramTitle}</h2>`;
      finalHtml += `<div class="plot-container"><canvas id="spectrogram-plot-canvas"></canvas></div>`;
      if (d.recommendations && d.recommendations.length > 0) {
          finalHtml += `<h3>${t.actionableRecommendationsTitle}</h3>`;
          finalHtml += `<ul class="recommendations-list">`;
          for (const rec of d.recommendations) {
              finalHtml += `<li class="recommendation-item">
                  <strong>${rec.tool}: ${rec.action} at ${rec.timeRange}, ${rec.frequencyRange}</strong>
                  <p>${rec.details}</p>
              </li>`;
          }
          finalHtml += `</ul>`;
      }
  }

  if (analysisData.balanceAndEqFeedback) {
    const d = analysisData.balanceAndEqFeedback;
    finalHtml += `<h2>${t.balanceEqTitle}</h2>`;
    finalHtml += `<h4>Overall Balance</h4><p>${d.overallBalance}</p>`;
    finalHtml += `<h4>EQ Analysis</h4><p>${d.eqAnalysis}</p>`;
    finalHtml += `<h4>Recommendations</h4>${await marked.parse(d.recommendations)}`;
  }

  if (analysisData.dynamicsAndLoudnessFeedback) {
    const d = analysisData.dynamicsAndLoudnessFeedback;
    finalHtml += `<h2>${t.dynamicsLoudnessTitle}</h2>`;
    finalHtml += `<h4>Dynamics Analysis</h4><p>${d.dynamicsAnalysis}</p>`;
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
  
  if (analysisData.stereoImageFeedback) {
    const d = analysisData.stereoImageFeedback;
    finalHtml += `<h2>${t.stereoImageTitle}</h2>`;
    finalHtml += `<h4>Stereo Image</h4><p>${d.stereoImage}</p>`;
    finalHtml += `<h4>Recommendations</h4>${await marked.parse(d.recommendations)}`;
  }

  if (analysisData.harshnessAnalysis) {
    const d = analysisData.harshnessAnalysis;
    finalHtml += `<h2>${t.harshnessAnalysisTitle}</h2>`;
    finalHtml += `<h4>Problematic Frequency Ranges</h4><p><code>${d.problematicFrequencyRanges}</code></p>`;
    finalHtml += `<h4>Analysis</h4><p>${d.analysis}</p>`;
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

  // Render canvas plots after innerHTML is set
  if (analysisData.eqCurveAnalysis) {
      const canvas = document.getElementById('eq-plot-canvas') as HTMLCanvasElement;
      if (canvas) {
          renderEqPlot(canvas, analysisData.eqCurveAnalysis);
      }
  }
  if (analysisData.spectrogramAnalysis) {
      const canvas = document.getElementById('spectrogram-plot-canvas') as HTMLCanvasElement;
      if (canvas) {
          renderSpectrogramPlot(canvas, analysisData.spectrogramAnalysis);
      }
  }
}

function renderEqPlot(canvas: HTMLCanvasElement, data: any) {
    const { plotData, problematicAreas } = data;

    const annotations = problematicAreas.map((area: any) => ({
        type: 'box',
        xMin: area.startHz,
        xMax: area.endHz,
        backgroundColor: area.severity === 'critical' ? 'rgba(255, 77, 77, 0.2)' : 'rgba(255, 165, 0, 0.2)',
        borderColor: area.severity === 'critical' ? 'rgba(255, 77, 77, 0.4)' : 'rgba(255, 165, 0, 0.4)',
        borderWidth: 1,
        label: {
            content: area.description,
            display: true,
            position: 'start',
            color: '#333',
            font: {
                size: 10
            }
        }
    }));
    
    new Chart(canvas, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Frequency Spectrum',
                data: plotData.map((p: any) => ({ x: p.frequency, y: p.level })),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    type: 'logarithmic',
                    title: { display: true, text: 'Frequency (Hz)' },
                    min: 20,
                    max: 20000,
                    ticks: {
                        callback: (value: number) => {
                            const val = Number(value);
                            if (val === 100 || val === 1000 || val === 10000) return `${val / 1000}k`;
                            if ([20, 50, 200, 500, 2000, 5000, 20000].includes(val)) return val >= 1000 ? `${val / 1000}k` : val;
                            return '';
                        },
                        autoSkip: false,
                    }
                },
                y: {
                    title: { display: true, text: 'Level (dB)' },
                    min: -60,
                    max: 0,
                }
            },
            plugins: {
                legend: { display: false },
                annotation: {
                    annotations
                }
            }
        }
    });
}

function renderSpectrogramPlot(canvas: HTMLCanvasElement, data: any) {
    const { plotData, problematicAreas } = data;
    const minIntensity = -72;
    const maxIntensity = 0;

    // A simple color scale from dark blue to bright yellow
    const getColor = (value: number) => {
        const ratio = Math.max(0, Math.min(1, (value - minIntensity) / (maxIntensity - minIntensity)));
        const r = Math.round(255 * Math.sqrt(ratio));
        const g = Math.round(255 * (ratio ** 3));
        const b = Math.round(255 * Math.sin(ratio * Math.PI * 0.5) ** 2 - r/2);
        return `rgba(${r}, ${g}, ${Math.max(0, b)}, 0.8)`;
    };

    const annotations = problematicAreas.map((area: any) => ({
        type: 'box',
        xMin: area.startTime,
        xMax: area.endTime,
        yMin: area.startHz,
        yMax: area.endHz,
        backgroundColor: area.severity === 'critical' ? 'rgba(255, 77, 77, 0.25)' : 'rgba(255, 165, 0, 0.25)',
        borderColor: area.severity === 'critical' ? 'rgba(255, 77, 77, 0.6)' : 'rgba(255, 165, 0, 0.6)',
        borderWidth: 1.5,
    }));
    
    new Chart(canvas, {
        type: 'scatter',
        data: {
            datasets: [{
                data: plotData.map((p: any) => ({ x: p.time, y: p.frequency })),
                pointBackgroundColor: plotData.map((p: any) => getColor(p.intensity)),
                pointRadius: 3,
                pointStyle: 'rect',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Time (s)' },
                    min: 0,
                },
                y: {
                    type: 'logarithmic',
                    title: { display: true, text: 'Frequency (Hz)' },
                    min: 20,
                    max: 20000,
                     ticks: {
                        callback: (value: number) => {
                            const val = Number(value);
                            if (val === 100 || val === 1000 || val === 10000) return `${val / 1000}k`;
                            if ([20, 50, 200, 500, 2000, 5000, 20000].includes(val)) return val >= 1000 ? `${val / 1000}k` : val;
                            return '';
                        },
                        autoSkip: false,
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                annotation: {
                    annotations
                }
            }
        }
    });
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
    
    // This logic is now a clean 1-to-1 mapping of checkbox to schema object
    if (optionMetadata.checked) requestedObjects.add('songMetadata');
    if (optionEqPlot.checked) requestedObjects.add('eqCurveAnalysis');
    if (optionSpectrogram.checked) requestedObjects.add('spectrogramAnalysis');
    if (optionBalanceEq.checked) requestedObjects.add('balanceAndEqFeedback');
    if (optionDynamics.checked) requestedObjects.add('dynamicsAndLoudnessFeedback');
    if (optionStereo.checked) requestedObjects.add('stereoImageFeedback');
    if (optionHarshness.checked) requestedObjects.add('harshnessAnalysis');
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

async function handleDownload() {
    const originalText = downloadButton.textContent;
    downloadButton.textContent = 'Generating PDF...';
    downloadButton.disabled = true;

    try {
        const reportElement = document.getElementById('result-text');
        if (!reportElement || audioFiles.length === 0) return;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const filenameBase = audioFiles[0].name.split('.').slice(0, -1).join('.') || 'audio';
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        // Calculate the width of the content area in the PDF
        const contentWidth = pdfWidth - margin * 2;
        // Get the actual width of the source HTML element
        const sourceWidth = reportElement.offsetWidth;
        
        // This explicitly controls the scaling by telling the library the exact source
        // width (windowWidth) and the desired target width in the PDF (width).
        // This fixes the issue where automatic scaling was miscalculating font sizes.
        await pdf.html(reportElement, {
            callback: function (doc) {
                doc.save(`analysis-report-${filenameBase}.pdf`);
            },
            margin: margin,
            autoPaging: 'text',
            width: contentWidth,
            windowWidth: sourceWidth,
            html2canvas: {
                scale: 0.25, // Increased scale renders at higher res, making the final PDF content smaller.
                useCORS: true,
                logging: false,
            }
        });
        
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
}

main();