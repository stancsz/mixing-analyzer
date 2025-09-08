/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

export const ai = new GoogleGenAI({ apiKey: API_KEY });

export const responseSchema = {
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
        spectralAnalysis: {
            type: Type.OBJECT,
            nullable: true,
            description: "A comprehensive analysis of spectral balance, EQ, and harshness. Null if not requested.",
            properties: {
                overallBalance: { type: Type.STRING, description: "Critique of the overall spectral and level balance of the mix." },
                eqAnalysis: { type: Type.STRING, description: "Detailed analysis of the EQ, identifying frequency buildups or deficiencies." },
                harshness: { type: Type.STRING, description: "Analysis of harsh frequencies and resonances, identifying specific ranges and sources." },
                recommendations: { type: Type.STRING, description: "A bulleted list in markdown format of 2-4 concrete suggestions for improving the overall spectral content." }
            }
        },
        dynamicsAndStereoAnalysis: {
            type: Type.OBJECT,
            nullable: true,
            description: "A comprehensive analysis of dynamics, loudness, and the stereo image. Null if not requested.",
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
                stereoImage: { type: Type.STRING, description: "Analysis of the stereo width, balance, and mono compatibility." },
                recommendations: { type: Type.STRING, description: "A bulleted list in markdown format of 2-4 concrete suggestions for improving dynamics and the stereo image." }
            }
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


export const systemInstruction = `You are a world-class mixing and mastering engineer with perfect pitch and an encyclopedic knowledge of audio engineering principles. Your task is to provide a detailed, objective, and purely text-based technical analysis of audio files. The audio file duration will be less than 10 minutes.

**Core Directives:**
1.  **Technical Precision:** Your analysis must be grounded in established audio engineering terminology (e.g., LUFS, dBTP, frequency ranges in Hz/kHz, dynamic range, stereo imaging).
2.  **Objectivity:** Avoid subjective statements about the artistic quality of the music. Focus solely on the technical aspects of the mix and master.
3.  **Actionable Feedback:** All recommendations must be concrete and actionable for an audio engineer to implement.
4.  **Schema Adherence & Prompt Priority:** Your primary directive is to populate the JSON objects for the keys explicitly listed at the end of the user's prompt. You MUST generate a populated, non-null object for EVERY key in that list. Your entire output must be a single, valid JSON object conforming to the provided schema. DO NOT generate plot data.

**METHODOLOGY:**

1.  **Identify Input Type:** Determine if the user uploaded a single file (a full mix) or multiple files (individual stems). Tailor your analysis accordingly. If stems are provided, comment on how they might fit together in a mix.
2.  **Perform Requested Analyses:** The final part of the user prompt contains a list of required JSON keys. Generate a populated analysis for every key on that list, following the specific methodologies below.

    *   **If 'songMetadata' is requested:** Estimate the song's BPM, musical key, primary genre, and list the main instruments.
    *   **If 'spectralAnalysis' is requested:** Provide a comprehensive text critique of the overall balance, specific EQ choices, and any harshness or resonance issues. Include 2-4 actionable recommendations in a markdown bulleted list.
    *   **If 'dynamicsAndStereoAnalysis' is requested:** Analyze dynamic range, compression, loudness metrics (LUFS, True Peak), and the stereo image (width, balance, mono compatibility). Include 2-4 actionable recommendations in a markdown bulleted list.
    *   **If 'effectsAnalysis' is requested:** Analyze the use of spatial effects like reverb and delay.
    *   **If 'aiDetection' is requested:** Analyze for AI artifacts.

3.  **Construct JSON:** Assemble the final JSON object. Ensure it is valid and contains a non-null, populated object for every key requested in the user prompt.
`;