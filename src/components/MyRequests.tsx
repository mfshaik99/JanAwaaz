import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Clock, MapPin, CheckCircle, AlertCircle, 
  Sparkles, Image as ImageIcon, Video, Volume2, X, PlusCircle, ArrowRight, RefreshCw, ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { DevelopmentRequestDoc } from '../types';

const STATUS_STEPS = [
  'Under Review',
  'Prioritized',
  'Planned',
  'In Progress',
  'Solved / Completed'
];

export function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DevelopmentRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DevelopmentRequestDoc | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Query developmentRequests by authenticated citizen's UID
      const q = query(
        collection(db, 'developmentRequests'),
        where('citizenId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DevelopmentRequestDoc[];

        // Sort descending by createdAt
        docs.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 
                        (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 
                        (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });

        setRequests(docs);
        setLoading(false);
      }, (error) => {
        console.error('Error listening to My Requests:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Failed to initialize My Requests query:', err);
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 google-shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <FileText size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Track Your Citizen Requests</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Please log in with your citizen account to track the real-time progress and official resolution of your submitted requests.
          </p>
          <Link 
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-full text-sm hover:bg-blue-700 google-transition google-shadow-sm"
          >
            Log In to Citizen Portal
          </Link>
        </div>
      </div>
    );
  }

  const filteredRequests = requests.filter(req => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return req.status !== 'Solved' && req.status !== 'Completed' && req.status !== 'Solved / Completed';
    if (activeFilter === 'solved') return req.status === 'Solved' || req.status === 'Completed' || req.status === 'Solved / Completed';
    return req.status === activeFilter;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Solved':
      case 'Completed':
      case 'Solved / Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Planned':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Prioritized':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStepIndex = (status: string) => {
    if (status === 'Solved' || status === 'Completed' || status === 'Solved / Completed') return 4;
    if (status === 'In Progress') return 3;
    if (status === 'Planned') return 2;
    if (status === 'Prioritized') return 1;
    return 0; // Under Review / Submitted
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 google-shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
              Citizen Tracking
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Community Requests</h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time status updates from the Policymaker Dashboard for your submitted grievances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold google-transition google-shadow-sm"
          >
            <PlusCircle size={16} />
            Submit New Request
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 google-shadow-sm">
        {[
          { id: 'all', label: `All Requests (${requests.length})` },
          { id: 'active', label: `In Progress (${requests.filter(r => r.status !== 'Solved' && r.status !== 'Completed' && r.status !== 'Solved / Completed').length})` },
          { id: 'solved', label: `Solved (${requests.filter(r => r.status === 'Solved' || r.status === 'Completed' || r.status === 'Solved / Completed').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold google-transition ${
              activeFilter === tab.id
                ? 'bg-blue-600 text-white google-shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm font-medium">Loading your requests from database...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 google-shadow-sm space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <FileText size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">No requests found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {activeFilter === 'all' 
              ? "You haven't submitted any community development requests yet. Report a community need to get started!"
              : "No requests match the selected status filter."}
          </p>
          {activeFilter === 'all' && (
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 google-transition google-shadow-sm mt-2"
            >
              Report a Community Need <ArrowRight size={16} />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const currentStep = getStepIndex(req.status);
            const dateStr = req.createdAt?.seconds 
              ? new Date(req.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Recently submitted';

            return (
              <div
                key={req.id || req.requestId}
                onClick={() => setSelectedRequest(req)}
                className="bg-white rounded-3xl border border-slate-200 p-6 google-shadow-sm hover:google-shadow-md google-transition cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        #{req.requestId ? req.requestId.slice(0, 8) : req.id?.slice(0, 8)}
                      </span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full uppercase tracking-wider border border-slate-200">
                        {req.category}
                      </span>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${getStatusBadgeColor(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-blue-600 google-transition-fast">
                      {req.problem || req.originalText || 'Community Development Need'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {dateStr}
                    </span>
                    {req.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {req.location.address || 'GPS Attached'}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Summary Quote */}
                {req.aiSummary && (
                  <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 text-sm text-blue-900 mb-4 flex items-start gap-2">
                    <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-xs sm:text-sm">{req.aiSummary}</p>
                  </div>
                )}

                {/* Resolution Timeline Progress Bar */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Resolution Lifecycle</span>
                    <span className="text-blue-600 font-semibold">{req.status}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const isComplete = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      return (
                        <div key={step} className="flex flex-col gap-1">
                          <div 
                            className={`h-2 rounded-full google-transition ${
                              isComplete 
                                ? (idx === 4 ? 'bg-emerald-500' : 'bg-blue-600') 
                                : 'bg-slate-200'
                            }`}
                          />
                          <span className={`text-[10px] truncate ${isCurrent ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Evidence badges footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-500 font-medium">
                    {req.photos && req.photos.length > 0 && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <ImageIcon size={14} className="text-blue-500" /> {req.photos.length} {req.photos.length === 1 ? 'Photo' : 'Photos'}
                      </span>
                    )}
                    {req.videos && req.videos.length > 0 && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Video size={14} className="text-red-500" /> {req.videos.length} {req.videos.length === 1 ? 'Video' : 'Videos'}
                      </span>
                    )}
                    {req.voiceUrl && (
                      <span className="flex items-center gap-1 text-purple-600">
                        <Volume2 size={14} /> Voice Note
                      </span>
                    )}
                  </div>
                  <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-1">
                    View Details <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      ID: #{selectedRequest.requestId || selectedRequest.id}
                    </span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider border ${getStatusBadgeColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedRequest.category} Request Details
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)} 
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 google-transition-fast"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                {/* Status Progress Bar */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Resolution Status</span>
                    <span className="text-blue-600 font-bold">{selectedRequest.status}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const isComplete = idx <= getStepIndex(selectedRequest.status);
                      return (
                        <div key={step} className="text-center">
                          <div className={`h-2.5 rounded-full mb-1 ${isComplete ? (idx === 4 ? 'bg-emerald-500' : 'bg-blue-600') : 'bg-slate-200'}`} />
                          <span className="text-[10px] text-slate-500 font-semibold">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Original Description */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Your Original Request
                  </h4>
                  <p className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 text-base leading-relaxed whitespace-pre-wrap">
                    "{selectedRequest.originalText}"
                  </p>
                </div>

                {/* AI Summary */}
                {selectedRequest.aiSummary && (
                  <div>
                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles size={16} /> Official AI Synthesized Summary
                    </h4>
                    <p className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-slate-800 text-sm leading-relaxed">
                      {selectedRequest.aiSummary}
                    </p>
                  </div>
                )}

                {/* Voice Recording Player */}
                {selectedRequest.voiceUrl && (
                  <div>
                    <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Volume2 size={16} /> Attached Voice Note
                    </h4>
                    <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center gap-4">
                      <audio controls src={selectedRequest.voiceUrl} className="w-full max-w-md" />
                    </div>
                  </div>
                )}

                {/* Evidence Photos & Videos */}
                {((selectedRequest.photos && selectedRequest.photos.length > 0) || 
                  (selectedRequest.videos && selectedRequest.videos.length > 0) ||
                  (selectedRequest.media && selectedRequest.media.length > 0)) && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Submitted Evidence
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedRequest.photos?.map((photoUrl, i) => (
                        <a 
                          key={i} 
                          href={photoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100"
                        >
                          <img src={photoUrl} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 google-transition" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 google-transition-fast flex items-center justify-center text-white text-xs font-bold gap-1">
                            <ExternalLink size={14} /> Full View
                          </div>
                        </a>
                      ))}

                      {selectedRequest.videos?.map((videoUrl, i) => (
                        <div key={i} className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">
                          <video controls src={videoUrl} className="w-full h-full object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Information */}
                {selectedRequest.location && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MapPin size={16} className="text-slate-400" /> Attached Location
                    </h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{selectedRequest.location.address || 'GPS Coordinates Attached'}</p>
                      {selectedRequest.location.lat && selectedRequest.location.lng && (
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          Latitude: {selectedRequest.location.lat.toFixed(5)}, Longitude: {selectedRequest.location.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
