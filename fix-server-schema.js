const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Update prompt
content = content.replace(
  'Also provide a recommended development action.\\n\\nRequest:',
  'Also provide a recommended development action. Generate an aiSummary (1-3 sentences) in the same language as the original request, explaining what the community is asking for, what the problem is, and why it matters in simple, citizen-friendly language without technical jargon.\\n\\nRequest:'
);

// Update schema
content = content.replace(
  'summary: { type: Type.STRING, description: "A 1-sentence English summary" },',
  'summary: { type: Type.STRING, description: "A 1-sentence English summary" },\n        aiSummary: { type: Type.STRING, description: "A simple 1-3 sentence citizen-friendly explanation of the request in the original language." },'
);

// Update required fields
content = content.replace(
  'required: ["location", "lat", "lng", "category", "problem", "severity", "urgency", "safetyRisk", "priorityScore", "priority", "summary", "recommendedAction", "translatedText"]',
  'required: ["location", "lat", "lng", "category", "problem", "severity", "urgency", "safetyRisk", "priorityScore", "priority", "summary", "aiSummary", "recommendedAction", "translatedText"]'
);

fs.writeFileSync('server.ts', content);
console.log('Fixed server.ts');
