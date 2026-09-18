export interface DemoRequest {
  id: string;
  category: string;
  location: string;
  lat: number;
  lng: number;
  request: string;
  aiSummary: string;
  demand: string;
  status: string;
  photo: string;
  markerColor: string;
  emoji: string;
}

export interface DemoSolvedIssue {
  id: string;
  category: string;
  location: string;
  status: string;
  emoji: string;
  beforeImage: string;
  afterImage: string;
  request: string;
  aiSummary: string;
  description: string;
  result: string;
  impact?: string;
}

export const DEMO_REQUESTS: DemoRequest[] = [
  {
    id: 'demo-1',
    category: 'Roads',
    location: 'Hyderabad, Telangana',
    lat: 17.3850,
    lng: 78.4867,
    request: 'Road surface is badly damaged and needs repair.',
    aiSummary: 'Residents are requesting repair of a damaged road with potholes that is affecting daily travel in the area.',
    demand: 'High',
    status: 'Under Review',
    photo: '/images/road_damage.jpg',
    markerColor: '#ef4444',
    emoji: '🛣️'
  },
  {
    id: 'demo-2',
    category: 'Water',
    location: 'Warangal, Telangana',
    lat: 17.9689,
    lng: 79.5941,
    request: 'Residents need better access to clean drinking water.',
    aiSummary: 'The community is asking for improved water infrastructure to ensure everyone has reliable access to safe and clean drinking water.',
    demand: 'High',
    status: 'Under Review',
    photo: '/images/drinking_water.jpg',
    markerColor: '#3b82f6',
    emoji: '💧'
  },
  {
    id: 'demo-3',
    category: 'Healthcare',
    location: 'Vijayawada, Andhra Pradesh',
    lat: 16.5062,
    lng: 80.6480,
    request: 'Primary health center lacks adequate medical supplies and emergency staff.',
    aiSummary: 'Residents report that the local clinic lacks essential supplies and emergency staff, causing hardships for seeking immediate medical attention.',
    demand: 'High',
    status: 'Under Review',
    photo: '/images/healthcare.jpg',
    markerColor: '#10b981',
    emoji: '🏥'
  },
  {
    id: 'demo-4',
    category: 'Lighting',
    location: 'Nizamabad, Telangana',
    lat: 18.6725,
    lng: 78.0941,
    request: 'Street lights on the main road are broken, making it unsafe at night.',
    aiSummary: 'Citizens highlight frequent darkness on transit routes due to non-functional street lights, creating safety hazards for pedestrians.',
    demand: 'Medium',
    status: 'Under Review',
    photo: '/images/street_lighting.jpg',
    markerColor: '#8b5cf6',
    emoji: '💡'
  }
];

export const DEMO_SOLVED_ISSUES: DemoSolvedIssue[] = [
  {
    id: 'solved-1',
    category: 'Roads',
    location: 'Hyderabad, Telangana',
    status: 'Solved',
    emoji: '🛣️',
    beforeImage: '/images/road_before.jpg',
    afterImage: '/images/road_after.jpg',
    request: 'Road surface was badly damaged with deep potholes causing accidents and transit delays.',
    aiSummary: 'Citizens requested immediate road resurfacing and stormwater drainage along the major transit corridor.',
    description: 'Over 2.5 km of damaged arterial road was fully resurfaced with high-durability bitumen, pedestrian walkways, and rainwater drainage.',
    result: 'Completed in 45 days • 2.5 km resurfaced',
    impact: 'Reduced transit time by 35% and completely eliminated waterlogging hazards during monsoons.'
  },
  {
    id: 'solved-2',
    category: 'Street Lighting',
    location: 'Warangal, Telangana',
    status: 'Solved',
    emoji: '💡',
    beforeImage: '/images/light_before.jpg',
    afterImage: '/images/light_after.jpg',
    request: 'Non-functional street lights left main market roads dark and unsafe for women and evening commuters.',
    aiSummary: 'Residents petitioned for urgent street illumination to restore nighttime security and pedestrian safety.',
    description: 'Installed 120 smart LED streetlights with automated twilight sensors along the market and commercial transit corridor.',
    result: '120 LED lights installed • 40% energy saved',
    impact: '100% illumination coverage ensuring safe night transit for 15,000+ daily pedestrians.'
  },
  {
    id: 'solved-3',
    category: 'Water',
    location: 'Guntur, Andhra Pradesh',
    status: 'Solved',
    emoji: '💧',
    beforeImage: '/images/water_before.jpg',
    afterImage: '/images/water_after.jpg',
    request: 'Broken community water pipelines and defunct filtration units left residents without reliable potable water.',
    aiSummary: 'Community members requested immediate overhaul of clean water infrastructure and community tap points.',
    description: 'Modernized the community water distribution center with multi-stage RO filtration and 24x7 automated tap stations.',
    result: 'Potable water restored • 8,500+ households served',
    impact: 'Direct access to clean, certified drinking water within 200m for all local residents.'
  }
];
