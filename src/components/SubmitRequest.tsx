import React, { useState, useEffect } from 'react';
import { Mic, Send, AlertCircle, CheckCircle2, Loader2, Globe, MapPin, Navigation, Camera, X, Image as ImageIcon, Video, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface MediaItem {
  file: File;
  type: 'image' | 'video';
  previewUrl: string;
}

export function SubmitRequest() {
  const { user, profile } = useAuth();
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  
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
    const files = e.target.files;
    if (!files) return;
    
    const newItems: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 50 * 1024 * 1024) {
        alert("A file is too large. Max 50MB per file.");
        continue;
      }
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const previewUrl = URL.createObjectURL(file);
      newItems.push({ file, type, previewUrl });
    }
    setMediaList(prev => [...prev, ...newItems]);
  };
  
  const removeMedia = (index: number) => {
    setMediaList(prev => {
      const newList = [...prev];
      URL.revokeObjectURL(newList[index].previewUrl);
      newList.splice(index, 1);
      return newList;
    });
  };

  const handleEnhanceWithAI = async () => {
    if (!text.trim()) return;
    setIsEnhancing(true);
    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language })
      });
      if (!response.ok) throw new Error('Failed to enhance');
      const data = await response.json();
      setText(data.enhancedText);
    } catch (error) {
      console.error(error);
      alert('Failed to enhance text with AI.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim() && mediaList.length === 0) return;
    if (!user) {
      alert("You must be logged in to submit a request.");
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      // 1. Upload Media Files to Firebase Storage
      const uploadedMedia = [];
      let firstImageBase64 = null;
      
      for (const item of mediaList) {
        const fileExt = item.file.name.split('.').pop() || (item.type === 'image' ? 'jpg' : 'mp4');
        const fileName = `evidence/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, item.file);
        const url = await getDownloadURL(storageRef);
        uploadedMedia.push({
          type: item.type,
          url,
          name: item.file.name
        });
        
        // Convert first image to base64 for AI analysis
        if (!firstImageBase64 && item.type === 'image') {
          firstImageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          });
        }
      }

      // 2. Call AI Analysis
      const payload: any = { text, language, imageBase64: firstImageBase64 };
      if (location) {
        payload.lat = location.lat;
        payload.lng = location.lng;
      }

      const aiResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!aiResponse.ok) throw new Error('Failed to analyze request');
      const aiData = await aiResponse.json();

      // 3. Save to Firestore
      await addDoc(collection(db, 'developmentRequests'), {
        citizenId: user.uid,
        citizenName: profile?.name || user.email || 'Anonymous Citizen',
        originalText: text,
        language,
        media: uploadedMedia,
        location: location || null,
        status: 'Submitted',
        createdAt: serverTimestamp(),
        ...aiData
      });

      setStatus('success');
      setText('');
      setMediaList([]);
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

              <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-500 max-w-sm w-full md:w-auto">
                  You can type in your local language or use the microphone to speak. Our AI will automatically translate and analyze your request.
                </p>
                <button
                  type="button"
                  onClick={handleEnhanceWithAI}
                  disabled={isEnhancing || !text.trim()}
                  className="flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50"
                >
                  {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>Enhance with AI</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-semibold text-slate-900 mb-3">Add Evidence (Optional)</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors text-sm font-medium">
                  <Camera size={24} className="text-blue-500" />
                  <span>Take Photo</span>
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
                </label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors text-sm font-medium">
                  <Video size={24} className="text-red-500" />
                  <span>Record Video</span>
                  <input type="file" accept="video/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
                </label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors text-sm font-medium">
                  <ImageIcon size={24} className="text-indigo-500" />
                  <span>Gallery</span>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              {mediaList.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4">
                  {mediaList.map((item, index) => (
                    <div key={index} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 w-32 h-32 flex-shrink-0">
                      {item.type === 'image' ? (
                        <img src={item.previewUrl} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                          <Video size={32} />
                          <span className="text-[10px] font-medium mt-1 truncate w-24 text-center">{item.file.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors shadow-sm"
                        title="Remove evidence"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-semibold text-slate-900 mb-3">Location</label>
              <button
                type="button"
                onClick={getLocation}
                disabled={locationStatus === 'locating'}
                className={`w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  locationStatus === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                    : locationStatus === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {locationStatus === 'locating' ? <Loader2 size={16} className="animate-spin" /> : 
                 locationStatus === 'success' ? <MapPin size={16} /> : 
                 <Navigation size={16} />}
                {locationStatus === 'locating' ? 'Locating...' : 
                 locationStatus === 'success' ? 'Location Added Successfully' : 
                 locationStatus === 'error' ? 'Location Failed - Try Again' : 
                 'Attach My Location'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
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
                disabled={isSubmitting || (!text.trim() && mediaList.length === 0)}
                className="w-full sm:w-auto sm:ml-auto flex justify-center items-center px-8 py-3 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
