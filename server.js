
/**
 * PRODUCTION BACKEND SERVER
 * 
 * To use this:
 * 1. Create a new folder/repo for your backend.
 * 2. Copy this file into it as 'index.js'.
 * 3. Run `npm init -y` and `npm install express cors dotenv @google/genai`.
 * 4. Set your API_KEY in a .env file or cloud environment variables.
 * 5. Deploy to Cloud Run / Heroku / Render.
 * 6. Point your Frontend to this URL using REACT_APP_BACKEND_URL.
 */

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();

// Allow requests from your frontend domain
app.use(cors({
  origin: process.env.FRONTEND_URL || '*' // Lock this down in production!
}));

// Increase payload limit for base64 images
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 8080;
const MODEL_NAME = 'gemini-3-pro-image-preview';

// Initialize Gemini
// IMPORTANT: server-side we strictly use process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.post('/api/generate', async (req, res) => {
  try {
    const { image, prompt, aspectRatio, upscale } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({ message: "Missing image or prompt" });
    }

    // --- MONETIZATION CHECKPOINT ---
    // 1. Get User ID from request headers (if using Auth)
    // 2. Check database if User has Credits
    // 3. If no credits, return res.status(402).json({ message: "Payment required" });
    // -------------------------------

    // Strip base64 prefix if present
    const base64Data = image.split(',')[1] || image;
    const mimeType = image.match(/:(.*?);/)?.[1] || 'image/png';

    console.log(`Processing request: ${upscale} - ${aspectRatio}`);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || '1:1',
          imageSize: upscale || '1K',
        },
      },
    });

    let generatedImage = null;
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImage = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImage) {
      throw new Error("Failed to generate image");
    }

    // --- SUCCESS HANDLER ---
    // Deduct 1 Credit from User Database
    // -----------------------

    res.json({ imageUrl: generatedImage });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ 
      message: error.message || "Internal Server Error",
      details: error.toString() 
    });
  }
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
