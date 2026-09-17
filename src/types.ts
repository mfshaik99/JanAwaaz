export interface UserProfile {
  role: 'admin' | 'citizen';
  name?: string;
  phone?: string;
}

export interface MediaItem {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export interface JanAwaazRequest {
  id?: string;
  userId?: string;
  category: string;
  description: string;
  media: Array<{ url: string, type: string, path: string }>;
  location: LocationData;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'New' | 'In Progress' | 'Resolved' | 'Rejected';
  aiSummary?: string;
  aiDemandEstimate?: string;
  createdAt: string;
}
