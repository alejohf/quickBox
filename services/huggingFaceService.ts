// IMPORTANT: INSTRUCTIONS FOR THE HUGGING FACE API KEY
// 1. Go to https://huggingface.co/join to create a free account.
// 2. After signing in, go to your profile, then click 'Settings', then 'Access Tokens'.
// 3. Create a new token (a 'read' role is sufficient).
// 4. Copy the token and paste it below, replacing the placeholder text.

// WARNING: For a real production app, never expose API keys on the frontend.
// This key should be stored in a secure backend or environment variable.
const HUGGING_FACE_API_KEY = "PASTE_YOUR_HUGGING_FACE_API_KEY_HERE";

const API_BASE_URL = "https://api-inference.huggingface.co/models/";

/**
 * Generates audio from text using the Hugging Face Inference API.
 * @param text The text to synthesize.
 * @param model The Hugging Face model to use (e.g., 'facebook/mms-tts-spa').
 * @returns A Blob containing the raw audio data.
 */
export const generateHuggingFaceAudio = async (text: string, model: string): Promise<Blob> => {
  if (!HUGGING_FACE_API_KEY || HUGGING_FACE_API_KEY === "PASTE_YOUR_HUGGING_FACE_API_KEY_HERE") {
    throw new Error("Hugging Face API key is missing. Please add it to `services/huggingFaceService.ts`.");
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Hugging Face API Error Response:", errorBody);
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    // The API returns the raw audio file as a blob
    const audioBlob = await response.blob();
    return audioBlob;

  } catch (error) {
    console.error("Failed to generate Hugging Face audio:", error);
    throw error; // Re-throw to be handled by the calling function
  }
};
