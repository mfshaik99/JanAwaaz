import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mic, Bot, Search, Target, MapPin, Navigation, ArrowRight, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';

// Fix for default marker icon in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A component to recenter the map when location changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 12);
  }, [center, map]);
  return null;
}

export function CitizenPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
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
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 font-sans pb-12">
      
      {/* 1. Opening Screen (Hero) */}
      <section className="bg-white px-4 py-20 sm:py-32 flex flex-col items-center justify-center text-center border-b border-slate-100">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="mb-6 flex flex-col items-center">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full tracking-wide uppercase mb-4 inline-block">
              Digital Public Infrastructure Platform
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">
              Your Voice. <br className="hidden sm:block" />
              <span className="text-blue-600">Better Development.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Tell us what your community needs. JanAwaaz helps turn citizen needs into better development priorities.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <button 
                onClick={handleShareClick}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-medium rounded-xl shadow-sm hover:bg-blue-700 hover:shadow transition-all flex items-center justify-center gap-2 text-lg"
              >
                Share a Development Need <ArrowRight size={20} />
              </button>
              <button 
                onClick={scrollToMap}
                className="w-full sm:w-auto px-8 py-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-lg"
              >
                Explore Your Area <MapPin size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. What JanAwaaz Does */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How JanAwaaz Helps</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Mic size={28} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">1. You Tell Us</h3>
              <p className="text-slate-600 text-sm">Voice or text</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Bot size={28} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">2. AI Understands</h3>
              <p className="text-slate-600 text-sm">Gemini understands your request</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Search size={28} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">3. JanAwaaz Finds Needs</h3>
              <p className="text-slate-600 text-sm">Combines citizen requests with development data</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.3}} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Target size={28} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Better Priorities</h3>
              <p className="text-slate-600 text-sm">Helps policymakers identify where development is most needed</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Simple Map Section & 4. Development Information */}
      <section id="map-section" className="py-20 px-4 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Your Area</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Column */}
            <div className="lg:col-span-2 bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 h-[400px] sm:h-[500px] relative z-0 shadow-inner">
              <MapContainer 
                center={location ? [location.lat, location.lng] : [22.9734, 78.6569]} 
                zoom={location ? 15 : 4} 
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
                    <Popup>Your current location</Popup>
                  </Marker>
                )}
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
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Your Location</h3>
                    <p className="text-lg font-bold text-slate-900">{location ? 'Your current location' : 'India'}</p>
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Community Requests</span>
                    <span className="font-semibold text-slate-900">{location ? '124' : '10,000+'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Top Development Need</span>
                    <span className="font-semibold text-slate-900">Roads</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Infrastructure Status</span>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md">Needs Attention</span>
                  </div>
                </div>
              </div>

              {/* Area Needs Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-4">What Does Your Area Need?</h3>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-700">Roads</span>
                      <span className="text-xs font-bold text-red-600">High demand</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-700">Healthcare</span>
                      <span className="text-xs font-bold text-amber-600">Medium demand</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-amber-400 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-700">Water</span>
                      <span className="text-xs font-bold text-red-600">High demand</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 5. Main Action */}
      <section className="py-24 px-4 bg-slate-50 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto bg-white p-10 sm:p-14 rounded-[2rem] shadow-sm border border-slate-200"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Have a development need?</h2>
          <p className="text-lg text-slate-600 mb-10">Tell JanAwaaz about it.</p>
          <button 
            onClick={handleShareClick}
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-medium rounded-xl shadow-sm hover:bg-blue-700 hover:shadow transition-all flex items-center justify-center gap-2 text-lg mx-auto"
          >
            Share a Development Need
          </button>
        </motion.div>
      </section>

    </div>
  );
}
