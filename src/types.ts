export interface UserProfile {
  role: 'admin' | 'citizen';
  name?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
}

export interface MediaItem {
  file: File;
  preview?: string;
  previewUrl: string;
  type: 'image' | 'video';
}

export interface LocationData {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  readableLocation?: string;
}

export interface DevelopmentRequestDoc {
  id?: string;
  requestId: string;
  citizenId: string;
  userId?: string;
  citizenName: string;
  citizenContact: string;
  language: string;
  description?: string;
  originalText: string;
  translatedText?: string;
  category: string;
  problem: string;
  severity: string;
  urgency: string;
  safetyRisk: string;
  location?: LocationData | null;
  latitude?: number | null;
  longitude?: number | null;
  photos: string[];
  videos: string[];
  voiceUrl?: string | null;
  media: Array<{ url: string; type: string; name?: string }>;
  mediaUrls?: string[];
  aiSummary: string;
  aiStatus?: 'pending' | 'completed' | 'failed';
  mediaStatus?: 'none' | 'uploading' | 'completed' | 'partial' | 'failed';
  aiAnalysis?: {
    category?: string;
    problem?: string;
    severity?: string;
    urgency?: string;
    safetyRisk?: string;
    priorityScore?: number;
    recommendedAction?: string;
  };
  priorityScore: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'processing' | 'Processing' | 'submitted' | 'Submitted' | 'Under Review' | 'Prioritized' | 'Planned' | 'In Progress' | 'Solved / Completed' | 'Completed' | 'Solved';
  createdAt: any;
  updatedAt?: any;
}

export interface JanAwaazRequest extends Partial<DevelopmentRequestDoc> {
  userId?: string;
  description?: string;
}

