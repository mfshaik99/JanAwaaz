import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  AlertTriangle, AlertCircle, CheckCircle, Clock, MapPin, 
  TrendingUp, FileText, ArrowRight, Loader2, Database, Sparkles,
  X, Image as ImageIcon, Video, Volume2, ShieldAlert, Filter, Search,
  ExternalLink, User, Phone, Mail, CheckCircle2, ChevronRight, Copy, Check, RefreshCw
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { DashboardSkeleton } from './ui/DashboardSkeleton';
import { ProgressiveImage, ProgressiveVideo } from './ui/ProgressiveMedia';
import { extractMediaUrls, warmupMediaUrls } from '../utils/mediaCache';
import '../utils/mapUtils';

const AUTHORIZED_ADMIN_EMAILS = [
  'mfshaik99@gmail.com',
  'chirudeepartham@gmail.com',
  'maazeem206@gmail.com'
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#991b1b'
};

const STATUS_OPTIONS = [
  'processing',
  'submitted',
  'Under Review',
  'Prioritized',
  'Planned',
  'In Progress',
  'Solved / Completed'
];

export function Dashboard() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);
  const hasFetchedRecommendationsRef = React.useRef(false);

  // Official citizen response drafting state
  const [draftingResponse, setDraftingResponse] = useState(false);
  const [officialDraft, setOfficialDraft] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Check admin authorization
  const isAuthorizedAdmin = user?.email && AUTHORIZED_ADMIN_EMAILS.includes(user.email.toLowerCase());

  const fetchRecommendations = async (docsToAnalyze: any[]) => {
    if (!docsToAnalyze || docsToAnalyze.length === 0) return;
    setIsFetchingRecommendations(true);
    try {
      const categoryCounts = docsToAnalyze.reduce((acc: any, req: any) => {
        if (req.category) acc[req.category] = (acc[req.category] || 0) + 1;
        return acc;
      }, {});

      const recentRequests = docsToAnalyze.slice(0, 5).map((r: any) => ({
        loc: r.location?.address || 'Unknown',
        cat: r.category,
        pri: r.priority
      }));

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryCounts, recentRequests })
      });
      if (res.ok) {
        const result = await res.json();
        setRecommendations(result.recommendations || []);
      }
    } catch (err) {
      console.error("Failed to fetch recommendations", err);
    } finally {
      setIsFetchingRecommendations(false);
    }
  };

  const handleDraftResponse = async (req: any) => {
    setDraftingResponse(true);
    setOfficialDraft(null);
    setCopiedDraft(false);
    try {
      const res = await fetch('/api/draft-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueText: req.description || req.originalText || req.problem,
          category: req.category || 'Infrastructure',
          priority: req.priority || 'Medium',
          location: req.location?.address || 'Local Ward'
        })
      });
      const data = await res.json();
      if (data.draftText) {
        setOfficialDraft(data.draftText);
        toast.success('AI response draft generated');
      } else {
        toast.error('Failed to generate draft response');
      }
    } catch (err) {
      console.error('Error drafting response:', err);
      toast.error('Error contacting AI response service');
    } finally {
      setDraftingResponse(false);
    }
  };

  const handleCopyDraft = () => {
    if (!officialDraft) return;
    navigator.clipboard.writeText(officialDraft);
    setCopiedDraft(true);
    toast.success('Draft response copied to clipboard');
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  const handleStatusChange = async (reqId: string, newStatus: string) => {
    if (!isAuthorizedAdmin) {
      toast.error('Only authorized administrators can update request status');
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'developmentRequests', reqId), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Request status updated to "${newStatus}"`);
      if (selectedRequest && selectedRequest.id === reqId) {
        setSelectedRequest((prev: any) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e: any) {
      console.error('Error updating status', e);
      toast.error(e.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Helper to create custom colored icons based on priority
  const createCustomIcon = (priority: string) => {
    const color = PRIORITY_COLORS[priority] || '#3b82f6';
    const scale = priority === 'Critical' ? 1.3 : priority === 'High' ? 1.1 : 0.9;
    
    const html = `
      <div style="
        background-color: ${color};
        width: ${22 * scale}px;
        height: ${22 * scale}px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.35);
      "></div>
    `;
    
    return L.divIcon({
      html,
      className: 'custom-leaflet-icon bg-transparent border-0',
      iconSize: [22 * scale, 22 * scale],
      iconAnchor: [11 * scale, 11 * scale],
    });
  };

  useEffect(() => {
    // Listen to canonical collection 'developmentRequests' in real-time
    const unsubscribe = onSnapshot(collection(db, 'developmentRequests'), async (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Client-side sort ensures newly created documents show up instantly at the very top
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : Date.now());
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : Date.now());
        return timeB - timeA;
      });
      setRequests(docs);
      // Non-blocking warmup of media URLs in background without downloading blobs
      warmupMediaUrls(docs);

      // Keep selectedRequest updated in real-time when background media or AI completes
      setSelectedRequest(prev => {
        if (!prev) return null;
        const updated = docs.find((d: any) => (d.id === prev.id || d.requestId === prev.requestId));
        return updated || prev;
      });
      
      // Compute categories and recommendations once initial data arrives
      if (docs.length > 0 && !hasFetchedRecommendationsRef.current) {
        hasFetchedRecommendationsRef.current = true;
        fetchRecommendations(docs);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error in Policymaker Dashboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtered requests for the dashboard
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch = 
        !searchQuery ||
        req.requestId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.originalText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.translatedText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.problem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.location?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.citizenName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' || 
        req.status === statusFilter ||
        (statusFilter === 'Solved / Completed' && (req.status === 'Solved' || req.status === 'Completed' || req.status === 'Solved / Completed')) ||
        (statusFilter === 'Under Review' && (req.status === 'Under Review' || req.status === 'Submitted'));

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  // Accurate counts derived directly from actual database records
  const totalRequests = requests.length;
  const underReviewCount = requests.filter(r => r.status === 'Under Review' || r.status === 'Submitted').length;
  const prioritizedCount = requests.filter(r => r.status === 'Prioritized').length;
  const plannedCount = requests.filter(r => r.status === 'Planned').length;
  const inProgressCount = requests.filter(r => r.status === 'In Progress').length;
  const solvedCount = requests.filter(r => r.status === 'Solved' || r.status === 'Completed' || r.status === 'Solved / Completed').length;

  const categoryCounts = useMemo(() => {
    return requests.reduce((acc: any, req: any) => {
      const cat = req.category || 'General';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const priorityCounts = useMemo(() => {
    return requests.reduce((acc: any, req: any) => {
      const pri = req.priority || 'Medium';
      acc[pri] = (acc[pri] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const chartData = useMemo(() => {
    return Object.keys(categoryCounts).map(name => ({
      name,
      value: categoryCounts[name]
    }));
  }, [categoryCounts]);

  const pieData = useMemo(() => {
    return Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));
  }, [priorityCounts]);

  // Fast extracted photo and video URLs for selectedRequest
  const { photos: selectedPhotos, videos: selectedVideos, voiceUrl: selectedVoiceUrl } = useMemo(() => {
    return extractMediaUrls(selectedRequest);
  }, [selectedRequest]);

  const maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'f4N2cKxH48dlsL409E5g';

  // Authorization Guard UI
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 google-shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Policymaker Dashboard Login</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Access to the real-time Policymaker Dashboard is restricted to authorized government officials and municipal administrators.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-full text-sm hover:bg-blue-700 google-transition google-shadow-sm"
          >
            Log In with Authorized Account
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 google-shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authorized Access Only</h2>
          <p className="text-slate-600 mb-2 text-sm">
            Your current account (<span className="font-semibold text-slate-800">{user.email}</span>) does not have municipal administrator permissions.
          </p>
          <p className="text-slate-500 mb-6 text-xs">
            Only authorized policymakers (<span className="font-mono">mfshaik99@gmail.com</span>, <span className="font-mono">chirudeepartham@gmail.com</span>, <span className="font-mono">maazeem206@gmail.com</span>) can view and modify citizen grievances.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-bold rounded-full text-sm hover:bg-blue-700 google-transition"
            >
              Return to Citizen Portal
            </Link>
            <Link
              to="/my-requests"
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-full text-sm hover:bg-slate-200 google-transition border border-slate-200"
            >
              View My Requests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 relative font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 google-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Live Database Connected
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Firestore: <span className="font-mono text-slate-700">developmentRequests</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Policymaker Infrastructure Intelligence Dashboard
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time citizen grievances intake, automated priority scoring, and lifecycle resolution tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Logged In As</p>
            <p className="text-xs font-bold text-slate-900">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Real-time Status Metric Cards (Requirement 3: Total, Under Review, Prioritized, Planned, In Progress, Solved / Completed) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Requests */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 google-shadow-sm hover:google-shadow-md google-transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText size={16} /></div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{totalRequests}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">All real requests</p>
        </div>

        {/* Under Review */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 google-shadow-sm hover:google-shadow-md google-transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Under Review</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl"><Clock size={16} /></div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{underReviewCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">New grievances</p>
        </div>

        {/* Prioritized */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 google-shadow-sm hover:google-shadow-md google-transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Prioritized</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={16} /></div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-amber-600">{prioritizedCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">High priority pool</p>
        </div>

        {/* Planned */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 google-shadow-sm hover:google-shadow-md google-transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Planned</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Sparkles size={16} /></div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-600">{plannedCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Budget allocated</p>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 google-shadow-sm hover:google-shadow-md google-transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={16} /></div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-600">{inProgressCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Work underway</p>
        </div>

        {/* Solved / Completed */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 google-shadow-sm hover:google-shadow-md google-transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Solved</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={16} /></div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-emerald-600">{solvedCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Completed projects</p>
        </div>
      </div>

      {/* Main Grid: Real Requests Map & AI Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Real Requests Location Map */}
        <div className="xl:col-span-2 bg-white rounded-3xl google-shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[480px]">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <MapPin size={18} />
              </div>
              Real Citizen Hotspots Map
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {requests.filter(r => (r.location?.lat || r.location?.latitude)).length} Geo-tagged Requests
            </span>
          </div>
          <div className="flex-1 w-full bg-slate-100 relative z-0">
            <MapContainer 
              center={[17.3850, 78.4867]} 
              zoom={5} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url={`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${maptilerApiKey}`}
                attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
              />
              {requests
                .filter(r => (r.location?.lat || r.location?.latitude) && (r.location?.lng || r.location?.longitude))
                .map((req: any) => {
                  const lat = req.location.lat || req.location.latitude;
                  const lng = req.location.lng || req.location.longitude;
                  return (
                    <Marker 
                      key={req.id || req.requestId} 
                      position={[lat, lng]}
                      icon={createCustomIcon(req.priority || 'Medium')}
                    >
                      <Popup>
                        <div className="text-xs min-w-[180px] max-w-[220px] p-1 font-sans">
                          {(() => {
                            const markerMedia = extractMediaUrls(req);
                            const markerPhoto = markerMedia.photos[0];
                            if (!markerPhoto) return null;
                            return (
                              <div className="w-full h-24 mb-2 rounded-lg overflow-hidden">
                                <ProgressiveImage
                                  src={markerPhoto}
                                  alt="Evidence"
                                  showOverlay={false}
                                  loading="lazy"
                                  className="w-full h-24 object-cover"
                                  containerClassName="aspect-auto h-24"
                                />
                              </div>
                            );
                          })()}
                          <p className="font-bold text-slate-900 mb-1">{req.category || 'Infrastructure'}</p>
                          <p className="text-slate-600 mb-1 line-clamp-2">"{req.originalText || req.problem}"</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                            <span className="font-semibold text-blue-600">{req.status}</span>
                            <button 
                              onClick={() => setSelectedRequest(req)}
                              className="text-xs font-bold text-slate-900 hover:text-blue-600 underline"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>

        {/* Gemini AI Strategic Priorities */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-3xl google-shadow-sm border border-slate-800 text-white overflow-hidden flex flex-col h-[480px]">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 mb-1">
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} /> Gemini Intelligence
                </span>
              </div>
              <h3 className="text-xl font-bold">Policy & Budget Priorities</h3>
              <p className="text-xs text-slate-400 mt-1">Autonomous analysis of community demand</p>
            </div>
            <button
              onClick={() => fetchRecommendations(requests)}
              disabled={isFetchingRecommendations}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition flex items-center justify-center disabled:opacity-50"
              title="Refresh AI Policy Priorities"
            >
              <RefreshCw size={16} className={isFetchingRecommendations ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="p-5 flex-1 overflow-y-auto space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((rec: string, i: number) => (
                <div key={i} className="flex gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs leading-relaxed text-slate-200">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                    {i + 1}
                  </div>
                  <p>{rec}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                Analyzing incoming citizen requests to formulate executive infrastructure recommendations...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="bg-white rounded-3xl google-shadow-sm border border-slate-200 p-6 h-[340px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Demand by Sector</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={110} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-3xl google-shadow-sm border border-slate-200 p-6 h-[340px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Priority Distribution</h3>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as string] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0'}} />
                <Legend verticalAlign="bottom" height={32} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Citizen Requests Feed & Status Management Table */}
      <div className="bg-white rounded-[2rem] google-shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Citizen Development Requests</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredRequests.length} of {totalRequests} total requests
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white rounded-full border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white rounded-full border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="processing">Processing</option>
              <option value="submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Prioritized">Prioritized</option>
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Solved / Completed">Solved / Completed</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No citizen requests match the selected search or status criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => {
              const dateStr = req.createdAt?.seconds 
                ? new Date(req.createdAt.seconds * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Just now';

              return (
                <div 
                  key={req.id || req.requestId} 
                  onClick={() => setSelectedRequest(req)}
                  className="p-5 sm:p-6 hover:bg-slate-50/80 google-transition cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                        #{req.requestId ? req.requestId.slice(0, 8) : req.id?.slice(0, 8)}
                      </span>
                      <span className="px-3 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider border border-blue-100">
                        {req.category || 'General'}
                      </span>
                      <span className={`px-3 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider border ${
                        req.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                        req.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        req.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {req.priority || 'Medium'} {req.priorityScore ? `(${req.priorityScore})` : ''}
                      </span>

                      {/* Request Lifecycle Status Badge */}
                      {req.status === 'processing' ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">
                          <Loader2 size={11} className="animate-spin" /> Processing
                        </span>
                      ) : req.status === 'submitted' ? (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                          Submitted
                        </span>
                      ) : null}

                      {/* AI Intelligence Processing Badge */}
                      {req.aiStatus === 'pending' ? (
                        <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200 flex items-center gap-1">
                          <Sparkles size={11} className="animate-pulse text-purple-600" /> AI: Analyzing...
                        </span>
                      ) : req.aiStatus === 'completed' ? (
                        <span className="px-2.5 py-0.5 bg-purple-50/60 text-purple-700 text-xs font-bold rounded-full border border-purple-200 flex items-center gap-1">
                          <Sparkles size={11} className="text-purple-600" /> AI: Ready
                        </span>
                      ) : req.aiStatus === 'failed' ? (
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                          AI: Manual
                        </span>
                      ) : null}

                      {/* Media Upload Status Badge */}
                      {req.mediaStatus === 'uploading' ? (
                        <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 text-xs font-bold rounded-full border border-sky-200 flex items-center gap-1">
                          <Loader2 size={11} className="animate-spin text-sky-600" /> Media: Uploading...
                        </span>
                      ) : req.mediaStatus === 'partial' ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                          Media: Partial
                        </span>
                      ) : req.mediaStatus === 'failed' ? (
                        <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200">
                          Media: Failed
                        </span>
                      ) : null}

                      <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto lg:ml-0">
                        <Clock size={13} /> {dateStr}
                      </span>
                    </div>

                    <p className="text-slate-900 font-semibold text-base group-hover:text-blue-600 google-transition-fast">
                      "{req.originalText || req.problem || 'Citizen request submitted'}"
                    </p>

                    {req.aiSummary && (
                      <p className="text-slate-500 text-xs line-clamp-2">
                        <span className="font-bold text-blue-600">AI Summary:</span> {req.aiSummary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
                      {req.location && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin size={13} className="text-slate-400" />
                          {req.location.address || `${req.location.lat?.toFixed(4)}, ${req.location.lng?.toFixed(4)}`}
                        </span>
                      )}
                      {req.citizenName && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <User size={13} /> {req.citizenName}
                        </span>
                      )}
                      {(() => {
                        const cardMedia = extractMediaUrls(req);
                        return (
                          <>
                            {cardMedia.photos.length > 0 && (
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                <ImageIcon size={13} /> {cardMedia.photos.length} {cardMedia.photos.length === 1 ? 'Photo' : 'Photos'}
                              </span>
                            )}
                            {cardMedia.videos.length > 0 && (
                              <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                <Video size={13} /> {cardMedia.videos.length} {cardMedia.videos.length === 1 ? 'Video' : 'Videos'}
                              </span>
                            )}
                            {(req.voiceUrl || cardMedia.voiceUrl) && (
                              <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                <Volume2 size={13} /> Voice Note
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={req.status || 'Under Review'}
                      onChange={(e) => handleStatusChange(req.id, e.target.value)}
                      disabled={isUpdatingStatus}
                      className="bg-white border border-slate-300 rounded-full px-4 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer google-shadow-sm hover:border-slate-400"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(req);
                        setOfficialDraft(null);
                        setCopiedDraft(false);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-100 google-transition-fast"
                      title="Open details"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200/70 px-3 py-1 rounded-xl">
                    #{selectedRequest.requestId || selectedRequest.id}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedRequest.category} Request Details
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    selectedRequest.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                    selectedRequest.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {selectedRequest.priority} Priority
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedRequest(null);
                    setOfficialDraft(null);
                    setCopiedDraft(false);
                  }} 
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 google-transition-fast"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                {/* Official Status Update Controls */}
                <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
                      Official Lifecycle Status
                    </h4>
                    <p className="text-xs text-blue-700">
                      Changes here save to Firestore and update the citizen's My Requests view in real-time.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Set Status:</span>
                    <select
                      value={selectedRequest.status || 'Under Review'}
                      onChange={(e) => handleStatusChange(selectedRequest.id, e.target.value)}
                      disabled={isUpdatingStatus}
                      className="bg-white border border-blue-300 rounded-full px-4 py-2 text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Citizen Request, Translations & AI Analysis */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Original Citizen Submission ({selectedRequest.language?.toUpperCase() || 'EN'})
                      </h4>
                      <p className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 text-base leading-relaxed whitespace-pre-wrap">
                        "{selectedRequest.originalText || selectedRequest.problem || 'No description text provided.'}"
                      </p>
                    </div>

                    {selectedRequest.language !== 'en' && selectedRequest.translatedText && (
                      <div>
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle size={14} /> English Translation
                        </h4>
                        <p className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-slate-800 text-sm whitespace-pre-wrap">
                          {selectedRequest.translatedText}
                        </p>
                      </div>
                    )}

                    {/* AI Status Indicator */}
                    {selectedRequest.aiStatus === 'pending' && (
                      <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-2 text-purple-800 text-xs font-semibold">
                        <Loader2 size={16} className="animate-spin text-purple-600" />
                        Gemini AI intelligence assessment is running in the background...
                      </div>
                    )}

                    {selectedRequest.aiSummary && (
                      <div>
                        <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Sparkles size={14} /> AI Synthesized Summary
                        </h4>
                        <p className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-slate-800 text-sm leading-relaxed">
                          {selectedRequest.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* AI Structured Analysis */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Gemini AI Structured Assessment
                      </h4>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div><span className="text-slate-500">Category:</span> <strong className="text-slate-800">{selectedRequest.category}</strong></div>
                          <div><span className="text-slate-500">Severity:</span> <strong className="text-slate-800">{selectedRequest.severity || selectedRequest.aiAnalysis?.severity || 'Medium'}</strong></div>
                          <div><span className="text-slate-500">Urgency:</span> <strong className="text-slate-800">{selectedRequest.urgency || selectedRequest.aiAnalysis?.urgency || 'Medium'}</strong></div>
                          <div><span className="text-slate-500">Safety Risk:</span> <strong className="text-slate-800">{selectedRequest.safetyRisk || selectedRequest.aiAnalysis?.safetyRisk || 'Low'}</strong></div>
                          <div><span className="text-slate-500">Priority Score:</span> <strong className="text-slate-800">{selectedRequest.priorityScore || 60}/100</strong></div>
                          <div><span className="text-slate-500">Submission Date:</span> <strong className="text-slate-800">{selectedRequest.createdAt?.seconds ? new Date(selectedRequest.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</strong></div>
                        </div>

                        {(selectedRequest.recommendedAction || selectedRequest.aiAnalysis?.recommendedAction) && (
                          <div className="pt-3 border-t border-slate-200">
                            <span className="text-slate-500 font-medium">Recommended Municipal Action:</span>
                            <p className="mt-1 font-semibold text-slate-800">
                              {selectedRequest.recommendedAction || selectedRequest.aiAnalysis?.recommendedAction}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Citizen Profile, Location & Real Media Evidence */}
                  <div className="space-y-6">
                    {/* Citizen Info */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Citizen Contact Information
                      </h4>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <User size={14} className="text-slate-400" />
                          <span className="font-semibold">{selectedRequest.citizenName || 'Citizen'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail size={14} className="text-slate-400" />
                          <span>{selectedRequest.citizenContact || 'No direct contact'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <MapPin size={14} className="text-slate-400" />
                          <span>{selectedRequest.location?.address || 'GPS Coordinates Attached'}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Official Citizen Response Generator */}
                    <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                          <Sparkles size={14} className="text-indigo-600" /> Official Response Assistant
                        </div>
                        {!officialDraft && (
                          <button
                            type="button"
                            onClick={() => handleDraftResponse(selectedRequest)}
                            disabled={draftingResponse}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {draftingResponse ? (
                              <>
                                <Loader2 size={12} className="animate-spin" /> Drafting...
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} /> Draft AI Response
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {officialDraft ? (
                        <div className="space-y-2 mt-2">
                          <div className="p-3.5 bg-white rounded-xl border border-indigo-100 text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {officialDraft}
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleDraftResponse(selectedRequest)}
                              disabled={draftingResponse}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1"
                            >
                              <RefreshCw size={11} className={draftingResponse ? 'animate-spin' : ''} /> Re-generate
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyDraft}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5"
                            >
                              {copiedDraft ? (
                                <>
                                  <Check size={13} className="text-emerald-300" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={13} /> Copy Response
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-indigo-950/70">
                          Click above to formulate an empathetic, clear, and official governmental status update to communicate directly with the citizen.
                        </p>
                      )}
                    </div>

                    {/* Voice Recording */}
                    {(selectedRequest.voiceUrl || selectedVoiceUrl) && (
                      <div>
                        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Volume2 size={16} /> Submitted Voice Recording
                        </h4>
                        <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                          <audio controls src={selectedRequest.voiceUrl || selectedVoiceUrl} className="w-full" />
                        </div>
                      </div>
                    )}

                    {/* Media Evidence (Photos & Videos) */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Submitted Media Evidence</span>
                        {selectedRequest.mediaStatus === 'uploading' && (
                          <span className="text-[11px] font-bold text-sky-600 flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" /> Uploading in background
                          </span>
                        )}
                      </h4>

                      {selectedRequest.mediaStatus === 'partial' && (
                        <div className="p-3 mb-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                          <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                          <span>Some media files uploaded successfully, while others encountered connectivity issues.</span>
                        </div>
                      )}

                      {selectedRequest.mediaStatus === 'failed' && (
                        <div className="p-3 mb-3 bg-red-50 rounded-xl border border-red-200 text-red-800 text-xs">
                          Media upload encountered network issues. Citizen description and location remain fully recorded.
                        </div>
                      )}

                      {(selectedPhotos.length > 0 || selectedVideos.length > 0) ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedPhotos.map((photoUrl: string, i: number) => (
                              <ProgressiveImage
                                key={`${photoUrl}-${i}`}
                                src={photoUrl}
                                alt={`Evidence ${i + 1}`}
                              />
                            ))}

                            {selectedVideos.map((videoUrl: string, i: number) => (
                              <ProgressiveVideo
                                key={`${videoUrl}-${i}`}
                                src={videoUrl}
                              />
                            ))}
                          </div>

                          {selectedRequest.mediaStatus === 'uploading' && (
                            <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 flex items-center gap-2 text-sky-700 text-xs font-medium">
                              <Loader2 size={14} className="animate-spin text-sky-600 flex-shrink-0" />
                              <span>Additional media is uploading in background and will appear progressively here.</span>
                            </div>
                          )}
                        </div>
                      ) : selectedRequest.mediaStatus === 'uploading' ? (
                        <div className="p-5 bg-sky-50 rounded-2xl border border-sky-100 flex items-center gap-3 text-sky-800 text-xs font-medium">
                          <Loader2 size={18} className="animate-spin text-sky-600 flex-shrink-0" />
                          <span>Photos / videos are currently uploading in background. They will automatically appear here once complete.</span>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs italic p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          No photo or video evidence was attached to this request.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
