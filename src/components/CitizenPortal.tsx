import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mic, Bot, Search, Target, MapPin, Navigation, ArrowRight, Loader2, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_REQUESTS, DEMO_SOLVED_ISSUES } from '../data/mockData';
import { createCustomIcon, MapUpdater } from '../utils/mapUtils';



export function CitizenPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [selectedDemoRequest, setSelectedDemoRequest] = useState<any | null>(null);
  const maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'f4N2cKxH48dlsL409E5g'; // Keep default key if env is empty

  useEffect(() => {
    let watchId: number;
    if (locationStatus === 'locating' || locationStatus === 'success') {
      if (!navigator.geolocation) {
        setLocationStatus('error');
        return;
      }
      
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('success');
        },
        (error) => {
          console.error(error);
          setLocationStatus('error');
        },
        { enableHighAccuracy: true }
      );
    }
    
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationStatus]);

  const getLocation = () => {
    setLocationStatus('locating');
  };

  const handleShareClick = () => {
    navigate(user ? '/submit' : '/login');
  };

  const scrollToMap = () => {
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 font-sans pb-0">
      
      {/* 1. Opening Screen (Hero) */}
      <section className="bg-white px-4 py-16 sm:py-20 flex flex-col items-center justify-center text-center border-b border-slate-100">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-6 flex flex-col items-center">
            <span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full tracking-widest uppercase mb-8 inline-block border border-blue-100/50">
              Digital Public Infrastructure Platform
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-[4.5rem] font-bold text-slate-900 tracking-tight mb-8 leading-tight">
              Your Voice. <br className="hidden sm:block" />
              <span className="text-blue-600">Better Development.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Tell us what your community needs. JanAwaaz helps turn citizen needs into better development priorities.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <button 
                onClick={handleShareClick}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white font-medium rounded-full google-shadow-sm hover:bg-blue-700 active:scale-[0.98] hover:google-shadow-md google-transition flex items-center justify-center gap-2 text-base"
              >
                Share a Development Need <ArrowRight size={18} />
              </button>
              <button 
                onClick={scrollToMap}
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-700 font-medium rounded-full hover:bg-slate-50 active:scale-[0.98] border border-slate-200 google-transition flex items-center justify-center gap-2 text-base google-shadow-sm"
              >
                Explore Your Area <MapPin size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. What JanAwaaz Does */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">How JanAwaaz Helps</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="bg-white p-6 rounded-3xl google-google-shadow-sm border border-slate-200 flex flex-col items-center text-center hover:google-shadow-md google-transition-fast" transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                <Mic size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">1. You Tell Us</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Voice or text</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{ delay:0.1, ease: [0.4, 0, 0.2, 1] }} className="bg-white p-6 rounded-3xl google-google-shadow-sm border border-slate-200 flex flex-col items-center text-center hover:google-shadow-md google-transition-fast">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                <Bot size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">2. AI Understands</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Gemini understands your request</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{ delay:0.2, ease: [0.4, 0, 0.2, 1] }} className="bg-white p-6 rounded-3xl google-google-shadow-sm border border-slate-200 flex flex-col items-center text-center hover:google-shadow-md google-transition-fast">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                <Search size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">3. JanAwaaz Finds Needs</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Combines citizen requests with data</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{ delay:0.3, ease: [0.4, 0, 0.2, 1] }} className="bg-white p-6 rounded-3xl google-google-shadow-sm border border-slate-200 flex flex-col items-center text-center hover:google-shadow-md google-transition-fast">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                <Target size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">4. Better Priorities</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Helps policymakers identify needs</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Simple Map Section & 4. Development Information */}
      <section id="map-section" className="py-12 px-4 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Community Requests Around You</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
              See examples of development needs reported by communities.
              <span className="inline-block md:ml-3 mt-3 md:mt-0 px-3 py-1 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full uppercase tracking-widest border border-amber-200/50">
                Demo Community Requests
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Map Column */}
            <div className="lg:col-span-2 bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 h-[400px] sm:h-[500px] relative z-0">
              <MapContainer 
                center={location ? [location.lat, location.lng] : [17.3850, 78.4867]} 
                zoom={location ? 12 : 5} 
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
              >
                <TileLayer
                  url={`https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=${maptilerApiKey}`}
                  attribution='&copy; MapTiler &copy; OpenStreetMap contributors'
                />
                {location && <MapUpdater center={[location.lat, location.lng]} />}
                {location && (
                  <Marker position={[location.lat, location.lng]}>
                    <Popup>
                      <div className="text-center">
                        <strong>📍 You are here</strong>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {/* Demo Markers */}
                {DEMO_REQUESTS.map((req) => (
                  <Marker 
                    key={req.id} 
                    position={[req.lat, req.lng]}
                    icon={createCustomIcon(req.markerColor)}
                  >
                    <Popup>
                      <div className="min-w-[200px] text-sm font-sans">
                        <div className="font-bold text-slate-900 mb-1 flex items-center gap-1">
                          {req.emoji} {req.category}
                        </div>
                        <div className="text-slate-500 mb-2">{req.location}</div>
                        <p className="text-slate-700 italic mb-3">"{req.request}"</p>
                        <div className="flex items-center gap-2 mb-3 text-xs font-semibold">
                          <span className={`px-2 py-0.5 rounded-md ${req.demand === 'High' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                            {req.demand === 'High' ? '🔴' : '🟠'} {req.demand} Demand
                          </span>
                        </div>
                        <button 
                          onClick={() => setSelectedDemoRequest(req)}
                          className="w-full py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 active:scale-[0.98] google-transition-fast"
                        >
                          View Request
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              
              {/* Overlay button for location */}
              {!location && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-slate-900/5 backdrop-blur-[2px] p-4">
                  <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Navigation size={24} />
                    </div>
                    <p className="text-slate-900 font-medium mb-4">Location access is required to show your exact location.</p>
                    <button 
                      onClick={getLocation}
                      disabled={locationStatus === 'locating'}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:scale-[0.98] google-transition-fast flex justify-center items-center gap-2"
                    >
                      {locationStatus === 'locating' ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Finding your location...
                        </>
                      ) : (
                        locationStatus === 'error' ? 'Try Again' : 'Share Location'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

              {/* Info Column */}
            <div className="flex flex-col gap-6">
              {/* Location Card */}
              <div className="bg-white p-6 rounded-3xl google-google-shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Your Location</h3>
                    <p className="text-xl font-bold text-slate-900">{location ? 'Your current location' : 'India'}</p>
                  </div>
                </div>
                
                <div className="space-y-5 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Community Requests</span>
                    <span className="font-bold text-slate-900 text-lg">{location ? '124' : '10,000+'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Top Need</span>
                    <span className="font-bold text-slate-900">Roads</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Status</span>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200/50">Needs Attention</span>
                  </div>
                </div>
              </div>

              {/* Area Needs Card */}
              <div className="bg-white p-6 rounded-3xl google-google-shadow-sm border border-slate-200 flex-1 flex flex-col justify-between">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Area Needs</h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-slate-700">Roads</span>
                      <span className="text-[10px] font-bold text-red-600 tracking-wider uppercase">High</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-slate-700">Healthcare</span>
                      <span className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">Med</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-slate-700">Water</span>
                      <span className="text-[10px] font-bold text-red-600 tracking-wider uppercase">High</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Demo Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DEMO_REQUESTS.map((req) => (
              <div 
                key={req.id} 
                className="bg-white rounded-3xl border border-slate-200 google-shadow-sm overflow-hidden flex flex-col hover:google-shadow-md google-transition-fast cursor-pointer"
                onClick={() => setSelectedDemoRequest(req)}
              >
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img src={req.photo} alt={req.category} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1.5 google-shadow-sm">
                    {req.emoji} {req.category}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h4 className="font-bold text-slate-900 mb-2 text-lg">{req.location}</h4>
                  <p className="text-slate-600 text-sm italic mb-4 line-clamp-2 leading-relaxed">"{req.request}"</p>
                  
                  {req.aiSummary && (
                    <div className="mb-6">
                      <div className="text-[10px] font-bold tracking-widest uppercase text-blue-600 mb-1.5 flex items-center gap-1">
                        <Sparkles size={12} /> AI Summary
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">
                        {req.aiSummary}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-bold tracking-wider uppercase">
                      <span className={`px-2.5 py-1 rounded-full border ${req.demand === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                        {req.demand} Demand
                      </span>
                      <span className="text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                        {req.status}
                      </span>
                    </div>
                    <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-50 active:scale-[0.98] google-transition-fast">
                      View Request
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Demo Request Details Modal */}
      {selectedDemoRequest && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
           transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setSelectedDemoRequest(null)}
                className="w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full google-transition-fast"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="h-64 sm:h-80 w-full relative bg-slate-100">
              <img src={selectedDemoRequest.photo} alt="Community Evidence" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <span className="px-3 py-1 bg-blue-600 text-xs font-bold uppercase tracking-wider rounded-full mb-3 inline-block google-shadow-sm">
                  {selectedDemoRequest.emoji} {selectedDemoRequest.category}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  <MapPin size={24} className="text-blue-400" />
                  {selectedDemoRequest.location}
                </h3>
              </div>
            </div>

            <div className="p-6 sm:p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Citizen's Request</h4>
                <p className="text-lg text-slate-900 font-medium p-4 bg-slate-50 rounded-xl border border-slate-200">
                  "{selectedDemoRequest.request}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Demand Level</h4>
                  <p className={`font-bold text-lg ${selectedDemoRequest.demand === 'High' ? 'text-red-600' : 'text-orange-600'}`}>
                    {selectedDemoRequest.demand}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Status</h4>
                  <p className="font-bold text-lg text-slate-700">
                    {selectedDemoRequest.status}
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full uppercase tracking-wider">
                  Example Demo Request
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Solved Issues Section */}
      <section className="py-12 px-4 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Solved Issues</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg mb-6 leading-relaxed">
              See how community needs can turn into real development improvements.
            </p>
            <div className="flex justify-center items-center gap-3">
              <span className="inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full uppercase tracking-widest border border-emerald-200/50">
                Demo Development Impact
              </span>
              <span className="inline-block px-3.5 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full uppercase tracking-widest border border-slate-200/50">
                Before → After
              </span>
            </div>
          </div>

          <div className="space-y-8">
            {DEMO_SOLVED_ISSUES.map((issue) => (
              <div 
                key={issue.id} 
                className="bg-white rounded-[2rem] border border-slate-200 google-shadow-sm overflow-hidden flex flex-col hover:google-shadow-md google-transition-fast group"
              >
                <div className="p-6 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white z-10 relative">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                      {issue.emoji} {issue.category}
                    </h3>
                    <p className="text-slate-600 flex items-center gap-1 font-medium">
                      <MapPin size={16} className="text-slate-400" />
                      {issue.location}
                    </p>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-emerald-200">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      {issue.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row relative">
                  {/* Before */}
                  <div className="flex-1 relative h-56 sm:h-64 md:h-80 bg-slate-100">
                    <img src={issue.beforeImage} alt="Before" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                      <span className="text-white font-bold tracking-widest uppercase bg-black/40 px-3 py-1 rounded backdrop-blur-sm border border-white/20">
                        Before
                      </span>
                    </div>
                  </div>
                  
                  {/* Divider / Arrow */}
                  <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white rounded-full shadow-xl items-center justify-center text-blue-600 border border-slate-100">
                    <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="md:hidden w-full h-12 bg-slate-100 flex items-center justify-center z-20 shadow-inner">
                    <div className="text-xs font-bold tracking-widest uppercase text-slate-500 flex items-center gap-2">
                      Before <ArrowRight size={14} /> After
                    </div>
                  </div>

                  {/* After */}
                  <div className="flex-1 relative h-56 sm:h-64 md:h-80 bg-slate-100">
                    <img src={issue.afterImage} alt="After" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                      <span className="text-white font-bold tracking-widest uppercase bg-emerald-500/80 px-3 py-1 rounded backdrop-blur-sm border border-emerald-400/50">
                        After
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-6 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <p className="text-slate-700 text-lg max-w-2xl">
                    {issue.description}
                  </p>
                  <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-xl flex items-center gap-3 w-full md:w-auto">
                    <Target size={20} className="text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-0.5">Result</span>
                      <span className="font-medium text-blue-900">{issue.result}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <span className="inline-block px-4 py-2 bg-slate-200 text-slate-600 text-xs font-medium rounded-lg">
              Example of completed community improvements
            </span>
          </div>
        </div>
      </section>

      {/* 5. Main Action */}
      <section className="py-12 px-4 bg-slate-50 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto bg-white p-12 sm:p-16 rounded-[2.5rem] google-google-shadow-sm border border-slate-200"
         transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Have a development need?</h2>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">Tell JanAwaaz about it.</p>
          <button 
            onClick={handleShareClick}
            className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white font-medium rounded-full google-shadow-sm hover:bg-blue-700 active:scale-[0.98] hover:google-shadow-md google-transition flex items-center justify-center gap-2 text-lg mx-auto"
          >
            Share a Development Need
          </button>
        </motion.div>
      </section>

    </div>
  );
}
