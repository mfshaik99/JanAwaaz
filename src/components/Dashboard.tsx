import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, Clock, MapPin, 
  TrendingUp, FileText, ArrowRight, Loader2, Database
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#991b1b'
};

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    const fetchData = () => {
      fetch('/api/dashboard')
        .then(res => res.json())
        .then(d => {
          setData(d);
          setLoading(false);
        })
        .catch(e => {
          console.error(e);
          setLoading(false);
        });
    };

    fetchData(); // Initial fetch
    
    // Auto-refresh every 10 seconds to make it a "live" dashboard
    const intervalId = setInterval(fetchData, 10000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Aggregating national infrastructure data...</p>
      </div>
    );
  }

  if (!data) return <div>Failed to load data</div>;

  const pieData = Object.entries(data.priorityCounts || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-6 sm:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FileText size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Requests</p>
              <h3 className="text-3xl font-bold text-slate-900">{data.totalRequests}</h3>
            </div>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Critical Priority</p>
              <h3 className="text-3xl font-bold text-slate-900">{data.priorityCounts['Critical'] || 0}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Top Category</p>
              <h3 className="text-xl font-bold text-slate-900 truncate">
                {data.chartData?.sort((a: any, b: any) => b.value - a.value)[0]?.name || 'N/A'}
              </h3>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
          <div className="flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Scale & Deployability</p>
            <div className="flex items-center justify-between">
               <span className="text-sm font-medium text-slate-700">States Reached</span>
               <span className="text-lg font-bold text-slate-900">7/28</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '25%' }}></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-right">Cloud Run Ready for National Scale</p>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Map Section */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              National Demand Hotspots
            </h3>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">Live Data</span>
          </div>
          <div className="flex-1 w-full bg-slate-100 relative z-0">
            <MapContainer 
              center={[22.9734, 78.6569]} 
              zoom={4.5} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url={import.meta.env.VITE_MAPTILER_API_KEY 
                  ? `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY}`
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                attribution={import.meta.env.VITE_MAPTILER_API_KEY
                  ? '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
              />
              {data.requests.map((req: any) => (
                <Marker 
                  key={req.id} 
                  position={[req.lat, req.lng]}
                  icon={createCustomIcon(req.priority)}
                >
                  <Popup>
                    <div className="text-sm min-w-[150px] max-w-[200px]">
                      {req.media && req.mediaType === 'image' && (
                        <img src={req.media} alt="Issue" className="w-full h-24 object-cover rounded-md mb-2" />
                      )}
                      {req.media && req.mediaType === 'video' && (
                        <div className="w-full h-24 bg-slate-200 rounded-md mb-2 flex items-center justify-center text-slate-500">
                          <FileText size={20} />
                        </div>
                      )}
                      <p className="font-bold text-slate-900 mb-1">{req.location}</p>
                      <p className="text-slate-600 mb-1"><span className="font-medium">Category:</span> {req.category}</p>
                      <p className="text-slate-600"><span className="font-medium">Priority:</span> {req.priority}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl shadow-sm border border-slate-800 text-white overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-2 text-indigo-300 mb-2">
              <div className="flex items-center gap-1 bg-indigo-950/50 px-2 py-1 rounded border border-indigo-800/50">
                <CheckCircle size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Gemini AI</span>
              </div>
              <div className="flex items-center gap-1 bg-indigo-950/50 px-2 py-1 rounded border border-indigo-800/50">
                <Database size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Demographics & Indices Linked</span>
              </div>
            </div>
            <h3 className="text-xl font-bold">Public Spending Priorities</h3>
            <p className="text-sm text-slate-400 mt-1">High-priority development projects surfaced by AI</p>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <ul className="space-y-4">
              {data.recommendations.map((rec: string, i: number) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-sm">
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{rec}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Charts & List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Requests by Category</h3>
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Priority Distribution</h3>
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
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
      
      {/* Recent Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Recent Citizen Feedback</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {[...data.requests].reverse().slice(0, 5).map((req: any) => (
            <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors flex gap-6">
              <div className="hidden sm:block flex-shrink-0">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-slate-500">{req.language.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{req.location}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock size={14} /> 
                      {new Date(req.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                      {req.category}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                      req.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                      req.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      req.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {req.priority}
                    </span>
                  </div>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-3">"{req.text}"</p>
                
                {req.summary && req.language !== 'en' && (
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-3">
                    <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                      <CheckCircle size={12} /> AI Translated Summary
                    </p>
                    <p className="text-sm text-blue-900">{req.summary}</p>
                  </div>
                )}
                {req.media && req.mediaType === 'image' && (
                  <img src={req.media} alt="Attached issue" className="mt-3 w-48 h-32 object-cover rounded-lg border border-slate-200" />
                )}
                {req.media && req.mediaType === 'video' && (
                  <video src={req.media} controls className="mt-3 w-48 h-32 object-cover rounded-lg border border-slate-200" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hackathon Tech Stack Footer */}
      <div className="pt-8 pb-4 text-center border-t border-slate-200 mt-8">
        <p className="text-sm text-slate-500 font-medium mb-3">Powered by Hackathon Required Technologies & Alternatives</p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">Gemini AI Studio (Generative AI)</span>
          <span className="px-3 py-1 bg-fuchsia-50 text-fuchsia-700 text-xs font-semibold rounded-full border border-fuchsia-100">Gemini Multimodal Vision</span>
          <span className="px-3 py-1 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full border border-sky-100">Web Speech API (Voice Alternative)</span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">MapTiler/OSM (Geospatial Alternative)</span>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">Cloud Run Deployment</span>
        </div>
      </div>
    </div>
  );
}
