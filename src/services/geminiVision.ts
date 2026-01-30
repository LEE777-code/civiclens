import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_VISION_MODEL || 'gemini-1.5-flash';

if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not set. Please add it to your .env file.");
}

const ai = new GoogleGenerativeAI(API_KEY || '');

// System Instruction from user snippet
const SYSTEM_INSTRUCTION_DESC = `You are an assistant that analyzes civic infrastructure issues from images. Your job is to examine the image and produce a short, clear description of the visible problem for a public civic report.

Follow these rules:
1. Write only 1–2 sentences.
2. Focus on the core civic issue (pothole, garbage overflow, drainage problem, broken streetlight, structural hazard, road damage, water stagnation, etc.).
3. Avoid assumptions about location unless visually clear.
4. Do not mention the camera, angle, or colors unless important to the issue.
5. Keep the description simple enough for any citizen or municipal worker to understand.

Output Format:
Description: <your short description here>`;

/**
 * Generate a description using Gemini with specific System Instructions
 */
export async function generateImageDescription(imageData: string | File): Promise<string> {
    try {
        let base64Content: string;
        let mimeType: string = "image/jpeg";

        if (imageData instanceof File) {
            // Convert File to base64
            const buffer = await imageData.arrayBuffer();
            base64Content = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            mimeType = imageData.type;
        } else {
            // Handle data URL string
            const split = imageData.split(',');
            base64Content = split[1];
            const mimeMatch = split[0].match(/:(.*?);/);
            if (mimeMatch) mimeType = mimeMatch[1];
        }

        const response = await ai.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: SYSTEM_INSTRUCTION_DESC,
        }).generateContent({
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Content,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: "Analyze this image for civic infrastructure issues."
                    },
                ],
            }],
        });

        const text = response.response.text();
        return text.replace(/^Description:\s*/i, '').trim();

    } catch (error: any) {
        console.error("Gemini API Error (Description):", error);
        throw new Error(error.message || "Failed to generate description");
    }
}

/**
 * Generate a Title
 */
export async function generateImageTitle(imageData: string | File): Promise<string> {
    try {
        let base64Content: string;
        let mimeType: string = "image/jpeg";

        if (imageData instanceof File) {
            const buffer = await imageData.arrayBuffer();
            base64Content = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            mimeType = imageData.type;
        } else {
            const split = imageData.split(',');
            base64Content = split[1];
            const mimeMatch = split[0].match(/:(.*?);/);
            if (mimeMatch) mimeType = mimeMatch[1];
        }

        const response = await ai.getGenerativeModel({ model: MODEL_NAME }).generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { data: base64Content, mimeType: mimeType } },
                    { text: "Suggest a brief, clear title (max 8 words) for this civic issue. Output ONLY the title." }
                ]
            }]
        });

        const text = response.response.text();
        return text ? text.trim() : "Report Issue";
    } catch (error) {
        console.error("Gemini API Error (Title):", error);
        return "Report Issue";
    }
}

/**
 * Suggest a Category
 */
export async function suggestCategory(imageData: string | File): Promise<string> {
    try {
        let base64Content: string;
        let mimeType: string = "image/jpeg";

        if (imageData instanceof File) {
            const buffer = await imageData.arrayBuffer();
            base64Content = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            mimeType = imageData.type;
        } else {
            const split = imageData.split(',');
            base64Content = split[1];
            const mimeMatch = split[0].match(/:(.*?);/);
            if (mimeMatch) mimeType = mimeMatch[1];
        }

        const prompt = `Categorize this civic issue into ONE of: Road Issues, Garbage & Cleanliness, Water / Drainage, Streetlight / Electricity, Public Safety, Public Facilities, Parks & Environment, Other. Output ONLY the category name.`;

        const response = await ai.getGenerativeModel({ model: MODEL_NAME }).generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { data: base64Content, mimeType: mimeType } },
                    { text: prompt }
                ]
            }]
        });

        const text = response.response.text();
        const categoryText = text ? text.trim() : "Other";

        // Simple validation
        const valid = ["Road Issues", "Garbage & Cleanliness", "Water", "Drainage", "Streetlight", "Electricity", "Public Safety", "Public Facilities", "Parks", "Environment"];
        if (valid.some(v => categoryText.includes(v))) return categoryText;
        return "Other";

    } catch (error) {
        console.error("Gemini API Error (Category):", error);
        return "Other";
    }
}
