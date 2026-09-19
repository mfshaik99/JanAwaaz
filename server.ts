import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { text, lat: userLat, lng: userLng, imageBase64 } = req.body;
    
    if (!text && !imageBase64) {
      return res.status(400).json({ error: 'Text or media is required' });
    }

    const gpsContext = (userLat && userLng) 
      ? `The user's exact GPS coordinates are Latitude: ${userLat}, Longitude: ${userLng}. Use these precise coordinates instead of guessing them.` 
      : `Guess the approximate latitude and longitude based on the location mentioned in the text.`;

    const prompt = `Analyze this citizen development request from India. Extract the location (city/district and state). ${gpsContext} Assign a category (Infrastructure, Healthcare, Education, Water & Sanitation, Electricity, Agriculture, Other). Assess the problem, severity, urgency, safety risk, and priority score (0-100). Also provide a recommended development action.\n\nRequest: "${text || 'See attached image'}"`;

    const parts: any[] = [{ text: prompt }];
    if (imageBase64) {
      const match = imageBase64.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: "City/District, State in India" },
        lat: { type: Type.NUMBER, description: "Approximate latitude" },
        lng: { type: Type.NUMBER, description: "Approximate longitude" },
        category: { type: Type.STRING, description: "Category of the request" },
        problem: { type: Type.STRING, description: "Short description of the core problem" },
        severity: { type: Type.STRING, description: "Severity level (Low, Medium, High, Critical)" },
        urgency: { type: Type.STRING, description: "Urgency level (Low, Medium, High, Critical)" },
        safetyRisk: { type: Type.STRING, description: "Safety Risk (Low, Medium, High)" },
        priorityScore: { type: Type.NUMBER, description: "Priority score from 0 to 100" },
        priority: { type: Type.STRING, description: "Overall priority (Low, Medium, High, Critical)" },
        summary: { type: Type.STRING, description: "A 1-sentence English summary" },
        aiSummary: { type: Type.STRING, description: "A simple 1-3 sentence citizen-friendly explanation of the request in the original language." },
        recommendedAction: { type: Type.STRING, description: "Recommended development action for policymakers" },
        translatedText: { type: Type.STRING, description: "Full English translation of the request if not in English, otherwise same as original" }
      },
      required: ["location", "lat", "lng", "category", "problem", "severity", "urgency", "safetyRisk", "priorityScore", "priority", "summary", "aiSummary", "recommendedAction", "translatedText"]
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: parts,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
    } catch (apiError: any) {
      if (apiError?.status === 503 || apiError?.status === 429) {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: parts,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        });
      } else {
        throw apiError;
      }
    }

    let rawText = response.text;
    if (typeof rawText === 'function') {
      rawText = rawText.call(response);
    }
    const aiData = JSON.parse(rawText || '{}');
    res.json(aiData);

  } catch (error) {
    console.error('Error analyzing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/enhance', async (req, res) => {
  try {
    const { text, language } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a helpful AI assistant for Indian citizens. Rewrite the following citizen grievance/request to be clear, detailed, formal, and highly actionable for government policymakers. Do not change the original intent. If the original text is in English, write in English. If it is in another language, write in that language.\n\nOriginal Text: "${text}"`,
      });
    } catch (apiError: any) {
      if (apiError?.status === 503 || apiError?.status === 429) {
        console.warn(`Gemini API ${apiError.status}, retrying with flash-lite...`);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `You are a helpful AI assistant for Indian citizens. Rewrite the following citizen grievance/request to be clear, detailed, formal, and highly actionable for government policymakers. Do not change the original intent. If the original text is in English, write in English. If it is in another language, write in that language.\n\nOriginal Text: "${text}"`,
        });
      } else {
        throw apiError;
      }
    }
    
    let enhancedText = typeof response.text === 'function' ? (response.text as any)() : response.text;
    res.json({ enhancedText });
  } catch (error) {
    console.error('Error enhancing text:', error);
    res.status(500).json({ error: 'Failed to enhance text' });
  }
});

app.post('/api/draft-response', async (req, res) => {
  try {
    const { issueText, category, priority, location } = req.body;
    
    const prompt = `You are drafting an official response from a local government policymaker to a citizen regarding their reported issue.
    
Issue Details:
- Location: ${location}
- Category: ${category}
- Priority: ${priority}
- Citizen's description: "${issueText}"

Draft a short, empathetic, and professional official response (max 3-4 sentences). It should acknowledge the issue, assure them it has been logged into the system, and state that the relevant department will investigate. Write in English.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
    } catch (apiError: any) {
      if (apiError?.status === 503 || apiError?.status === 429) {
        console.warn(`Gemini API ${apiError.status}, retrying with flash-lite...`);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
      } else {
        throw apiError;
      }
    }
    
    let draftText = typeof response.text === 'function' ? (response.text as any)() : response.text;
    res.json({ draftText });
  } catch (error) {
    console.error('Error drafting response:', error);
    res.status(500).json({ error: 'Failed to draft response' });
  }
});

app.post('/api/recommendations', async (req, res) => {
  try {
    const { categoryCounts, recentRequests } = req.body;
    
    const summaryData = JSON.stringify(categoryCounts);
    const recentData = JSON.stringify(recentRequests);
    
    const systemPrompt = `You are an AI advisor for JanAwaaz, a National Digital Public Good platform in India. Your objective is to solve the problem of misaligned public spending by aligning citizen feedback with national infrastructure priorities. 
      
Based on this live aggregated citizen feedback data:
Categories: ${summaryData}
Recent Critical Requests: ${recentData}

Task: Conceptually combine this citizen demand data with Indian national demographic data, infrastructure indices, and public investment plans. Surface the most critical demand hotspots.
Provide 3 short, actionable, data-driven recommendations for high-priority development projects to national policymakers. Format as a JSON array of strings.`;

    const schema = {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    };

    let aiInsightResponse;
    try {
      aiInsightResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
    } catch (apiError: any) {
      if (apiError?.status === 503 || apiError?.status === 429) {
        aiInsightResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: systemPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        });
      } else {
        throw apiError;
      }
    }
    
    let rawText = aiInsightResponse.text;
    if (typeof rawText === 'function') {
      rawText = rawText.call(aiInsightResponse);
    }
    const recommendations = JSON.parse(rawText || '[]');
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
