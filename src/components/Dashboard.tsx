import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, Clock, MapPin, 
  TrendingUp, FileText, ArrowRight, Loader2, Database, Sparkles, Send,
  X, Image as ImageIcon, Video
} from 'lucide-react';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';



const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#991b1b'
};

import { DashboardSkeleton } from './ui/DashboardSkeleton';
import '../utils/mapUtils';

export function Dashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const handleStatusChange = async (reqId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'developmentRequests', reqId), { status: newStatus });
      if (selectedRequest && selectedRequest.id === reqId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (e) {
      console.error('Error updating status', e);
      toast.error('Failed to update status');
    }
  };

  // Helper to create custom colored icons based on priority
  const createCustomIcon = (priority: string) => {
    const color = PRIORITY_COLORS[priority] || '#3b82f6';
    const scale = priority === 'Critical' ? 1.2 : 0.9;
    
    const html = `
      <div style="
        background-color: ${color};
        width: ${24 * scale}px;
        height: ${24 * scale}px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `;
    
    return L.divIcon({
      html,
      className: 'custom-leaflet-icon bg-transparent border-0',
      iconSize: [24 * scale, 24 * scale],
      iconAnchor: [12 * scale, 12 * scale],
    });
  };

  useEffect(() => {
    const q = query(collection(db, 'developmentRequests'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(docs);
      
      const totalRequests = docs.length;
      
      const categoryCounts = docs.reduce((acc: any, req: any) => {
        if (req.category) acc[req.category] = (acc[req.category] || 0) + 1;
        return acc;
      }, {});
      
      const priorityCounts = docs.reduce((acc: any, req: any) => {
        if (req.priority) acc[req.priority] = (acc[req.priority] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.keys(categoryCounts).map(name => ({
        name,
        value: categoryCounts[name]
      }));

      // Only fetch recommendations if we have requests
      let recommendations = [];
      if (docs.length > 0) {
        try {
          const recentRequests = docs.slice(0, 5).map((r: any) => ({ loc: r.location?.address || 'Unknown', cat: r.category, pri: r.priority }));
          const res = await fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryCounts, recentRequests })
          });
          if (res.ok) {
            const result = await res.json();
            recommendations = result.recommendations || [];
          }
        } catch (err) {
          console.error("Failed to fetch recommendations", err);
        }
      }

      setData({
        totalRequests,
        chartData,
        priorityCounts,
        recommendations
      });
      setLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  if (!data) return <div>Failed to load data</div>;

  const pieData = Object.entries(data.priorityCounts || {}).map(([name, value]) => ({ name, value }));
  const maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'f4N2cKxH48dlsL409E5g';

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 relative">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 sm:p-6 rounded-3xl google-shadow-sm border border-slate-200 hover:google-shadow-md google-transition-fast" transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><FileText size={28} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Requests</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{data.totalRequests}</h3>
            </div>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease: [0.4, 0, 0.2, 1] }} className="bg-white p-4 sm:p-6 rounded-3xl google-shadow-sm border border-slate-200 hover:google-shadow-md google-transition-fast">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><AlertTriangle size={28} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Critical Priority</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{data.priorityCounts['Critical'] || 0}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: [0.4, 0, 0.2, 1] }} className="bg-white p-4 sm:p-6 rounded-3xl google-shadow-sm border border-slate-200 hover:google-shadow-md google-transition-fast">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100"><TrendingUp size={28} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Top Category</p>
              <h3 className="text-xl font-bold text-slate-900 truncate tracking-tight">
                {data.chartData?.sort((a: any, b: any) => b.value - a.value)[0]?.name || 'N/A'}
              </h3>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease: [0.4, 0, 0.2, 1] }} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-3xl google-shadow-sm border border-indigo-100">
          <div className="flex flex-col justify-center h-full">
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">Live Sync</p>
            <div className="flex items-center justify-between">
               <span className="text-sm font-semibold text-slate-700">Firestore</span>
               <span className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse google-shadow-sm shadow-emerald-500/50"></div> Active
               </span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-4">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        
        {/* Map Section */}
        <div className="xl:col-span-2 bg-white rounded-3xl google-shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <MapPin size={22} />
              </div>
              Demand Hotspots
            </h3>
          </div>
          <div className="flex-1 w-full bg-slate-100 relative z-0">
            <MapContainer 
              center={[22.9734, 78.6569]} 
              zoom={4.5} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url={`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${maptilerApiKey}`}
                attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
              />
              {requests.filter(r => r.location?.lat && r.location?.lng).map((req: any) => (
                <Marker 
                  key={req.id} 
                  position={[req.location.lat, req.location.lng]}
                  icon={createCustomIcon(req.priority)}
                >
                  <Popup>
                    <div className="text-sm min-w-[150px] max-w-[200px]">
                      {req.media && req.media.length > 0 && req.media[0].type === 'image' && (
                        <img src={req.media[0].url} alt="Issue" className="w-full h-24 object-cover rounded-md mb-2" />
                      )}
                      <p className="font-bold text-slate-900 mb-1">{req.location.address || 'Unknown Location'}</p>
                      <p className="text-slate-600 mb-1"><span className="font-medium">Category:</span> {req.category}</p>
                      <p className="text-slate-600"><span className="font-medium">Priority:</span> {req.priority}</p>
                      <button 
                        onClick={() => setSelectedRequest(req)}
                        className="mt-2 text-blue-600 text-xs font-semibold hover:underline"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl google-shadow-sm border border-slate-800 text-white overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-2 text-indigo-300 mb-2">
              <div className="flex items-center gap-1 bg-indigo-950/50 px-2 py-1 rounded border border-indigo-800/50">
                <CheckCircle size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Gemini AI</span>
              </div>
            </div>
            <h3 className="text-xl font-bold">Strategic Priorities</h3>
            <p className="text-sm text-slate-400 mt-1">Data-driven actionable insights</p>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            {data.recommendations && data.recommendations.length > 0 ? (
              <ul className="space-y-4">
                {data.recommendations.map((rec: string, i: number) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                    className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-sm">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{rec}</p>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">Not enough data to generate recommendations yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts & List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl google-shadow-sm border border-slate-200 p-6 h-[350px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Requests by Category</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={120} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-3xl google-shadow-sm border border-slate-200 p-6 h-[350px] flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Priority Distribution</h3>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as string] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
      
      {/* Recent Feed */}
      <div className="bg-white rounded-3xl google-shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Recent Citizen Requests</h3>
        </div>
        <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
          {requests.map((req: any) => (
            <div key={req.id} onClick={() => setSelectedRequest(req)} className="p-4 sm:p-6 hover:bg-slate-50 google-transition-fast flex flex-col sm:flex-row gap-4 cursor-pointer">
              <div className="hidden sm:block flex-shrink-0">
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center">
                  <span className="font-bold text-blue-600">{req.language?.toUpperCase() || 'EN'}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{req.location?.address || 'Unknown Location'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                      <Clock size={14} /> 
                      {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                  <div className="flex gap-2 text-[11px] font-bold uppercase tracking-wider">
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      {req.category}
                    </span>
                    <span className={`px-3 py-1.5 rounded-full border ${
                      req.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                      req.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      req.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {req.priority}
                    </span>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">"{req.originalText || req.translatedText || 'Media attached without text description.'}"</p>
                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {req.media && req.media.length > 0 && (
                    <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100"><ImageIcon size={14} /> {req.media.length} Evidence</span>
                  )}
                  <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Status: {req.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
             transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  Request Details
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    selectedRequest.priority === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' :
                    selectedRequest.priority === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {selectedRequest.priority} Priority
                  </span>
                </h2>
                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 google-transition-fast">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Original Submission ({selectedRequest.language?.toUpperCase() || 'EN'})</h4>
                      <p className="text-slate-900 p-4 bg-slate-50 rounded-xl border border-slate-200 whitespace-pre-wrap">
                        "{selectedRequest.originalText || 'No text provided.'}"
                      </p>
                    </div>

                    {selectedRequest.language !== 'en' && selectedRequest.translatedText && (
                      <div>
                        <h4 className="text-sm font-semibold text-blue-600 flex items-center gap-1 uppercase tracking-wider mb-2">
                          <CheckCircle size={14} /> English Translation
                        </h4>
                        <p className="text-slate-800 p-4 bg-blue-50/50 rounded-xl border border-blue-100 whitespace-pre-wrap">
                          {selectedRequest.translatedText}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-purple-600 flex items-center gap-1 uppercase tracking-wider mb-2">
                        <Sparkles size={14} /> AI Analysis
                      </h4>
                      <div className="bg-purple-50/50 rounded-xl border border-purple-100 p-5 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div><strong>Category:</strong> {selectedRequest.category}</div>
                          <div><strong>Severity:</strong> {selectedRequest.severity}</div>
                          <div><strong>Safety Risk:</strong> {selectedRequest.safetyRisk}</div>
                          <div><strong>Priority Score:</strong> {selectedRequest.priorityScore}/100</div>
                        </div>
                        <div className="pt-3 border-t border-purple-100">
                          <strong>Core Problem:</strong>
                          <p className="mt-1">{selectedRequest.problem}</p>
                        </div>
                        <div className="pt-3 border-t border-purple-100">
                          <strong>Recommended Action:</strong>
                          <p className="mt-1 font-medium text-purple-900">{selectedRequest.recommendedAction}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Citizen Info & Status</h4>
                      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-sm">
                        <p><strong>Name:</strong> {selectedRequest.citizenName || 'Anonymous'}</p>
                        <p><strong>ID:</strong> <span className="font-mono text-xs bg-slate-200 px-1 py-0.5 rounded">{selectedRequest.citizenId}</span></p>
                        <p><strong>Location:</strong> {selectedRequest.location?.address || 'GPS Only'}</p>
                        <p><strong>Submitted:</strong> {selectedRequest.createdAt?.seconds ? new Date(selectedRequest.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}</p>
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                          <strong>Status:</strong>
                          <select 
                            value={selectedRequest.status}
                            onChange={(e) => handleStatusChange(selectedRequest.id, e.target.value)}
                            className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[200px]"
                          >
                            <option value="Submitted">Submitted</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Prioritized">Prioritized</option>
                            <option value="Planned">Planned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Evidence ({selectedRequest.media?.length || 0})</h4>
                      {selectedRequest.media && selectedRequest.media.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {selectedRequest.media.map((m: any, i: number) => (
                            <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 aspect-square bg-slate-100">
                              {m.type === 'image' ? (
                                <img src={m.url} alt="Evidence" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
                                  <Video size={40} className="mb-2" />
                                  <span className="text-sm font-medium bg-white/80 px-2 py-1 rounded">Play Video</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 google-transition-fast"></div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon size={48} className="mb-2 opacity-50" />
                          <p className="text-sm font-medium">No evidence attached.</p>
                        </div>
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
