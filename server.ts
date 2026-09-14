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

// Mock database initialized with some realistic Indian data
const db = {
  requests: [
    { id: 1, text: "The main road connecting our village to the highway is completely washed out after the rains. We cannot transport our crops.", location: "Wayanad, Kerala", lat: 11.6854, lng: 76.1320, category: "Infrastructure", priority: "High", timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), language: "en" },
    { id: 2, text: "There is no drinking water supply in our colony for the past week. Children are falling sick.", location: "Jaipur, Rajasthan", lat: 26.9124, lng: 75.7873, category: "Water & Sanitation", priority: "Critical", timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), language: "hi" },
    { id: 3, text: "Local primary school building has a severely damaged roof. It is unsafe for students.", location: "Patna, Bihar", lat: 25.5941, lng: 85.1376, category: "Education", priority: "High", timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), language: "hi" },
    { id: 4, text: "Power cuts last for 10-12 hours every day, affecting local businesses and students.", location: "Kanpur, Uttar Pradesh", lat: 26.4499, lng: 80.3319, category: "Electricity", priority: "Medium", timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), language: "hi" },
    { id: 5, text: "Primary health clinic lacks basic medicines and doctor is rarely available.", location: "Bastar, Chhattisgarh", lat: 19.2076, lng: 81.9405, category: "Healthcare", priority: "Critical", timestamp: new Date(Date.now() - 86400000 * 10).toISOString(), language: "hi" },
    { id: 6, text: "Farmers are losing crops due to unseasonal pests, we need agricultural advisory support.", location: "Nashik, Maharashtra", lat: 20.0110, lng: 73.7903, category: "Agriculture", priority: "High", timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), language: "mr" },
    { id: 7, text: "Public transport buses are extremely irregular, daily wage workers are suffering.", location: "Bhubaneswar, Odisha", lat: 20.2961, lng: 85.8245, category: "Infrastructure", priority: "Medium", timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), language: "en" },
    { id: 8, text: "The river is heavily polluted by nearby factories, affecting local fishing communities.", location: "Varanasi, Uttar Pradesh", lat: 25.3176, lng: 82.9739, category: "Water & Sanitation", priority: "Critical", timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), language: "hi" },
  ]
};

app.post('/api/requests', async (req, res) => {
  try {
    const { text, language = 'en', lat: userLat, lng: userLng, media, mediaType } = req.body;
    
    if (!text && !media) {
      return res.status(400).json({ error: 'Text or media is required' });
    }

    const gpsContext = (userLat && userLng) 
      ? `The user's exact GPS coordinates are Latitude: ${userLat}, Longitude: ${userLng}. Use these precise coordinates instead of guessing them.` 
      : `Guess the approximate latitude and longitude based on the location mentioned in the text.`;

    const prompt = `Analyze this citizen development request from India. Extract the location (city/district and state). ${gpsContext} Assign a category (Infrastructure, Healthcare, Education, Water & Sanitation, Electricity, Agriculture, Other), and assign a priority (Low, Medium, High, Critical).\n\nRequest: "${text || 'Media attached without text description.'}"`;

    const parts: any[] = [{ text: prompt }];
    if (media && mediaType === 'image') {
      const match = media.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    // Use Gemini to analyze the citizen request
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: parts,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              location: { type: Type.STRING, description: "City/District, State in India" },
              lat: { type: Type.NUMBER, description: "Approximate latitude" },
              lng: { type: Type.NUMBER, description: "Approximate longitude" },
              category: { type: Type.STRING, description: "Category of the request" },
              priority: { type: Type.STRING, description: "Priority level (Low, Medium, High, Critical)" },
              summary: { type: Type.STRING, description: "A 1-sentence English translation/summary of the issue" }
            },
            required: ["location", "lat", "lng", "category", "priority", "summary"]
          }
        }
      });
    } catch (apiError: any) {
      if (apiError?.status === 503) {
        console.warn('Gemini API 503 High Demand, retrying with flash-lite...');
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: parts,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                location: { type: Type.STRING, description: "City/District, State in India" },
                lat: { type: Type.NUMBER, description: "Approximate latitude" },
                lng: { type: Type.NUMBER, description: "Approximate longitude" },
                category: { type: Type.STRING, description: "Category of the request" },
                priority: { type: Type.STRING, description: "Priority level (Low, Medium, High, Critical)" },
                summary: { type: Type.STRING, description: "A 1-sentence English translation/summary of the issue" }
              },
              required: ["location", "lat", "lng", "category", "priority", "summary"]
            }
          }
        });
      } else {
        throw apiError;
      }
    }

    const analysis = JSON.parse(response.text || '{}');
    
    const newRequest = {
      id: Date.now(),
      text,
      language,
      media,
      mediaType,
      timestamp: new Date().toISOString(),
      ...analysis
    };

    db.requests.push(newRequest);
    res.json(newRequest);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.get('/api/dashboard', async (req, res) => {
  // Aggregate data for the dashboard
  const totalRequests = db.requests.length;
  
  const categoryCounts = db.requests.reduce((acc: any, req) => {
    acc[req.category] = (acc[req.category] || 0) + 1;
    return acc;
  }, {});
  
  const priorityCounts = db.requests.reduce((acc: any, req) => {
    acc[req.priority] = (acc[req.priority] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(categoryCounts).map(name => ({
    name,
    value: categoryCounts[name]
  }));

  // Generate strategic recommendations using Gemini
  try {
    const summaryData = JSON.stringify(categoryCounts);
    const recentRequests = JSON.stringify(db.requests.slice(-5).map(r => ({ loc: r.location, cat: r.category, pri: r.priority })));
    
    let aiInsightResponse;
    try {
      const systemPrompt = `You are an AI advisor for JanAwaaz, a National Digital Public Good platform in India. Your objective is to solve the problem of misaligned public spending by aligning citizen feedback with national infrastructure priorities. 
      
Based on this live aggregated citizen feedback data:
Categories: ${summaryData}
Recent Critical Requests: ${recentRequests}

Task: Conceptually combine this citizen demand data with Indian national demographic data, infrastructure indices, and public investment plans. Surface the most critical demand hotspots.
Provide 3 short, actionable, data-driven recommendations for high-priority development projects to national policymakers. Format as a JSON array of strings.`;

      aiInsightResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
    } catch (apiError: any) {
      if (apiError?.status === 503) {
        console.warn('Gemini API 503 High Demand, retrying with flash-lite...');
        aiInsightResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: systemPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        });
      } else {
        throw apiError;
      }
    }
    
    const recommendations = JSON.parse(aiInsightResponse.text || '[]');
    
    res.json({
      totalRequests,
      chartData,
      priorityCounts,
      requests: db.requests,
      recommendations
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.json({
      totalRequests,
      chartData,
      priorityCounts,
      requests: db.requests,
      recommendations: ["Increase budget for critical infrastructure.", "Prioritize rural healthcare facilities.", "Address water sanitation in northern states."]
    });
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
