import React, { useState, useEffect } from 'react';
import { Mic, Send, AlertCircle, CheckCircle2, Loader2, Globe, MapPin, Navigation, Camera, X, Image as ImageIcon, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function CitizenPortal() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');

  const getLocation = () => {
    setLocationStatus('locating');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationStatus('success');
      },
      (error) => {
        console.error(error.message || 'Geolocation error', error);
        setLocationStatus('error');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please upload a file smaller than 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia(reader.result as string);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim() && !media) return;

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const payload: any = { text, language, media, mediaType };
      if (location) {
        payload.lat = location.lat;
        payload.lng = location.lng;
      }

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to submit');

      setStatus('success');
      setText('');
      setMedia(null);
      setMediaType(null);
      setLocation(null);
      setLocationStatus('idle');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your request.');
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Map our app languages to BCP-47 tags
    const langMap: Record<string, string> = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
      'mr': 'mr-IN'
    };
    recognition.lang = langMap[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    
    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      // If it's final, append it. If interim, we could show it, but for simplicity we'll just set it
      if (event.results[0].isFinal) {
        setText(prev => prev ? prev + ' ' + currentTranscript : currentTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Report a Community Issue</h2>
          <p className="text-slate-600">Your voice helps prioritize infrastructure development in your region. Tell us what your community needs.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-slate-700">Select Language</label>
              <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                <Globe size={16} />
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none focus:ring-0 font-medium"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Describe the issue or request
              </label>
              
              {media && (
                <div className="mb-4 relative inline-block rounded-xl overflow-hidden border border-slate-200">
                  {mediaType === 'image' ? (
                    <img src={media} alt="Upload preview" className="h-32 object-cover" />
                  ) : (
                    <div className="h-32 w-48 bg-slate-100 flex items-center justify-center">
                      <Video className="text-slate-400" size={32} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setMedia(null); setMediaType(null); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="E.g., The main road in our village is broken..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-slate-700 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${
                    isRecording 
                      ? 'bg-red-100 text-red-600 animate-pulse' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={isRecording ? "Listening..." : "Speak your request"}
                >
                  <Mic size={20} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500 max-w-md">
                  You can type in your local language or use the microphone to speak. Our AI will automatically translate and analyze your request.
                </p>
                
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
                    <Camera size={14} />
                    <span className="hidden sm:inline">Attach Photo/Video</span>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  <button
                    type="button"
                    onClick={getLocation}
                  disabled={locationStatus === 'locating'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    locationStatus === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : locationStatus === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {locationStatus === 'locating' ? <Loader2 size={14} className="animate-spin" /> : 
                   locationStatus === 'success' ? <MapPin size={14} /> : 
                   <Navigation size={14} />}
                  {locationStatus === 'locating' ? 'Locating...' : 
                   locationStatus === 'success' ? 'Location Added' : 
                   locationStatus === 'error' ? 'Location Failed' : 
                   'Attach My Location'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <AnimatePresence>
                {status === 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center text-emerald-600 text-sm font-medium"
                  >
                    <CheckCircle2 size={18} className="mr-2" />
                    Request submitted successfully!
                  </motion.div>
                )}
                {status === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center text-red-600 text-sm font-medium"
                  >
                    <AlertCircle size={18} className="mr-2" />
                    Failed to submit. Please try again.
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting || (!text.trim() && !media)}
                className="ml-auto flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
