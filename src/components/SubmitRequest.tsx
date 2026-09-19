import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Send, AlertCircle, CheckCircle2, Loader2, Globe, MapPin, 
  Navigation, Camera, X, Image as ImageIcon, Video, Sparkles, Volume2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { db, storage } from '../firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MediaItem } from '../types';

// Fast client-side image compression to speed up background uploads
async function compressImage(file: File): Promise<File | Blob> {
  if (!file.type.startsWith('image/') || file.size < 350 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function SubmitRequest() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  
  const [location, setLocation] = useState<{lat: number, lng: number; address?: string} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');

  // Clean up audio preview url on unmount
  useEffect(() => {
    return () => {
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
    };
  }, [voicePreviewUrl]);

  const getLocation = () => {
    setLocationStatus('locating');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let address = '';
        try {
          // Attempt reverse geocoding via Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'JanAwaaz-Citizen-App' }
          });
          if (res.ok) {
            const data = await res.json();
            address = data.display_name?.split(',').slice(0, 3).join(', ') || '';
          }
        } catch {
          // Fallback gracefully
        }

        setLocation({
          lat,
          lng,
          address: address || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
        });
        setLocationStatus('success');
        toast.success('Location attached successfully');
      },
      (error) => {
        console.error(error.message || 'Geolocation error', error);
        setLocationStatus('error');
        toast.error('Unable to retrieve location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newItems: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds maximum allowed 50MB limit.`);
        continue;
      }
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const previewUrl = URL.createObjectURL(file);
      newItems.push({ file, type, previewUrl });
    }
    setMediaList(prev => [...prev, ...newItems]);
    // Reset file input value to allow re-uploading the same file if needed
    e.target.value = '';
  };
  
  const removeMedia = (index: number) => {
    setMediaList(prev => {
      const newList = [...prev];
      if (newList[index].previewUrl) {
        URL.revokeObjectURL(newList[index].previewUrl);
      }
      newList.splice(index, 1);
      return newList;
    });
  };

  const removeVoiceRecording = () => {
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setVoiceBlob(null);
    setVoicePreviewUrl(null);
  };

  // Toggle voice recording (Audio capture + optional speech-to-text)
  const toggleVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setVoiceBlob(blob);
          const url = URL.createObjectURL(blob);
          setVoicePreviewUrl(url);
          // Stop all audio tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
          toast.success('Voice message recorded successfully');
        };

        mediaRecorder.start();
        setIsRecording(true);

        // Also try speech recognition for real-time transcription if supported
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          const langMap: Record<string, string> = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'te': 'te-IN',
            'ta': 'ta-IN',
            'mr': 'mr-IN'
          };
          recognition.lang = langMap[language] || 'en-IN';
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              currentTranscript += event.results[i][0].transcript;
            }
            if (event.results[0]?.isFinal) {
              setText(prev => prev ? prev + ' ' + currentTranscript : currentTranscript);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('Speech recognition warning:', e.error);
          };

          recognition.start();
        }
      } catch (err: any) {
        console.error('Microphone access denied or error:', err);
        toast.error('Unable to access microphone. Please enable audio permissions.');
        setIsRecording(false);
      }
    }
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
      toast.success('Request enhanced with official wording');
    } catch (error) {
      console.error(error);
      toast.error('Failed to enhance text with AI.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const isSubmittingRef = useRef(false);

  // Background processing of media uploads and AI analysis without blocking user submission
  const processBackgroundTasks = async (
    requestId: string,
    docRef: any,
    mediaItems: MediaItem[],
    voice: Blob | null,
    rawText: string,
    lang: string,
    loc: { lat: number; lng: number; address?: string } | null
  ) => {
    let uploadedPhotos: string[] = [];
    let uploadedVideos: string[] = [];
    let uploadedMedia: Array<{ url: string; type: string; name: string }> = [];
    let uploadedVoiceUrl: string | null = null;
    let firstImageBase64: string | null = null;

    const hasMediaToUpload = mediaItems.length > 0 || !!voice;
    let mediaSuccessCount = 0;

    if (hasMediaToUpload) {
      try {
        // Upload media files in parallel with automatic inline fallback
        const mediaPromises = mediaItems.map(async (item, i) => {
          try {
            let fileToUpload: File | Blob = item.file;
            let base64Preview = item.previewUrl;
            if (item.type === 'image') {
              fileToUpload = await compressImage(item.file);
              // Save first image base64 for AI multimodal analysis
              base64Preview = await new Promise<string>((res) => {
                const r = new FileReader();
                r.onloadend = () => res(r.result as string);
                r.readAsDataURL(fileToUpload);
              });
              if (!firstImageBase64) {
                firstImageBase64 = base64Preview;
              }
            }
            
            let uploadedUrl = '';
            try {
              const fileExt = item.file.name.split('.').pop() || (item.type === 'image' ? 'jpg' : 'mp4');
              const fileName = `evidence/${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
              const storageRef = ref(storage, fileName);
              const contentType = item.type === 'image' ? (item.file.type || 'image/jpeg') : (item.file.type || 'video/mp4');
              await uploadBytes(storageRef, fileToUpload, { contentType });
              uploadedUrl = await getDownloadURL(storageRef);
            } catch (storageErr) {
              console.warn('Firebase Storage upload restricted or unavailable, using secure inline media:', storageErr);
              if (!base64Preview || base64Preview.startsWith('blob:')) {
                base64Preview = await new Promise<string>((res) => {
                  const r = new FileReader();
                  r.onloadend = () => res(r.result as string);
                  r.readAsDataURL(fileToUpload);
                });
              }
              uploadedUrl = base64Preview;
            }

            if (uploadedUrl) {
              return { success: true, item, url: uploadedUrl };
            }
            return { success: false, item };
          } catch (err) {
            console.error('Media processing failure for:', item.file.name, err);
            return { success: false, item, error: err };
          }
        });

        // Voice note upload in parallel with automatic inline fallback
        const voicePromise = (async () => {
          if (!voice) return null;
          try {
            let voiceUrl = '';
            let voiceBase64 = '';
            try {
              voiceBase64 = await new Promise<string>((res) => {
                const r = new FileReader();
                r.onloadend = () => res(r.result as string);
                r.readAsDataURL(voice);
              });
            } catch {}

            try {
              const voiceFileName = `evidence/voice_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
              const voiceStorageRef = ref(storage, voiceFileName);
              await uploadBytes(voiceStorageRef, voice, { contentType: 'audio/webm' });
              voiceUrl = await getDownloadURL(voiceStorageRef);
            } catch (storageErr) {
              console.warn('Voice storage upload restricted or unavailable, using secure inline audio:', storageErr);
              voiceUrl = voiceBase64;
            }

            if (voiceUrl) {
              return { success: true, voiceUrl };
            }
            return { success: false };
          } catch (err) {
            console.error('Voice processing error:', err);
            return { success: false, error: err };
          }
        })();

        const [mediaResults, voiceResult] = await Promise.all([
          Promise.all(mediaPromises),
          voicePromise
        ]);

        mediaResults.forEach((res) => {
          if (res.success && res.url) {
            mediaSuccessCount++;
            uploadedMedia.push({
              type: res.item.type,
              url: res.url,
              name: res.item.file.name
            });
            if (res.item.type === 'image') {
              uploadedPhotos.push(res.url);
            } else {
              uploadedVideos.push(res.url);
            }
          }
        });

        if (voiceResult && voiceResult.success && voiceResult.voiceUrl) {
          mediaSuccessCount++;
          uploadedVoiceUrl = voiceResult.voiceUrl;
        }

        const totalItems = mediaItems.length + (voice ? 1 : 0);
        const mediaStatus = 
          totalItems === 0 ? 'completed' :
          mediaSuccessCount === totalItems ? 'completed' :
          mediaSuccessCount > 0 ? 'partial' : 'failed';

        const mediaUrls = [...uploadedPhotos, ...uploadedVideos, ...(uploadedVoiceUrl ? [uploadedVoiceUrl] : [])];

        // Update the SAME Firestore document with media evidence
        await updateDoc(docRef, {
          photos: uploadedPhotos,
          videos: uploadedVideos,
          voiceUrl: uploadedVoiceUrl || null,
          media: uploadedMedia,
          mediaUrls,
          mediaStatus,
          updatedAt: serverTimestamp()
        });
      } catch (mediaErr) {
        console.error('Background media update failed:', mediaErr);
        try {
          await updateDoc(docRef, {
            mediaStatus: 'failed',
            updatedAt: serverTimestamp()
          });
        } catch (_) {}
      }
    }

    // AI Analysis in background
    let aiData: any = null;
    try {
      const payload: any = {
        text: rawText || 'Citizen community grievance with attached evidence',
        language: lang,
        imageBase64: firstImageBase64
      };
      if (loc) {
        payload.lat = loc.lat;
        payload.lng = loc.lng;
      }

      const aiRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (aiRes.ok) {
        aiData = await aiRes.json();
      }
    } catch (aiErr) {
      console.warn('AI analysis background error:', aiErr);
    }

    // Update the SAME Firestore document with AI results & mark as submitted
    try {
      if (aiData) {
        const priorityScore = typeof aiData.priorityScore === 'number' ? aiData.priorityScore : 65;
        const priority = aiData.priority || (priorityScore > 75 ? 'High' : priorityScore > 45 ? 'Medium' : 'Low');

        await updateDoc(docRef, {
          category: aiData.category || 'General',
          problem: aiData.problem || rawText,
          severity: aiData.severity || 'Medium',
          urgency: aiData.urgency || 'Medium',
          safetyRisk: aiData.safetyRisk || 'Low',
          priorityScore,
          priority,
          translatedText: aiData.translatedText || rawText,
          aiSummary: aiData.aiSummary || aiData.summary || 'Citizen request processed.',
          aiAnalysis: {
            category: aiData.category || 'General',
            problem: aiData.problem || rawText,
            severity: aiData.severity || 'Medium',
            urgency: aiData.urgency || 'Medium',
            safetyRisk: aiData.safetyRisk || 'Low',
            priorityScore,
            recommendedAction: aiData.recommendedAction || 'Inspect and evaluate community requirements.'
          },
          recommendedAction: aiData.recommendedAction || 'Inspect and evaluate community requirements.',
          aiStatus: 'completed',
          status: 'submitted',
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(docRef, {
          aiStatus: 'completed',
          status: 'submitted',
          updatedAt: serverTimestamp()
        });
      }
    } catch (finalErr) {
      console.error('Failed to update AI analysis on request:', finalErr);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || isSubmittingRef.current) return;
    if (!text.trim() && mediaList.length === 0 && !voiceBlob) {
      toast.error('Please provide a description, photo, video, or voice recording.');
      return;
    }
    if (!user) {
      toast.error('You must be logged in to submit a request.');
      navigate('/login');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setStatus('idle');

    try {
      // 1. Generate canonical document reference in 'developmentRequests'
      const requestsCol = collection(db, 'developmentRequests');
      const newDocRef = doc(requestsCol);
      const newRequestId = newDocRef.id;

      // Extract user details
      const citizenName = (profile?.name || user.displayName || user.email?.split('@')[0] || 'Citizen').slice(0, 100);
      const citizenContact = (user.email || user.phoneNumber || profile?.phone || profile?.email || 'N/A').slice(0, 200);
      const rawText = text.trim();
      const descriptionText = (rawText || (mediaList.length > 0 ? 'Citizen reported community issue with attached media evidence.' : voiceBlob ? 'Citizen reported community issue with attached voice note.' : 'Citizen community request')).slice(0, 10000);

      const finalLocation = location ? {
        lat: Number(location.lat),
        lng: Number(location.lng),
        latitude: Number(location.lat),
        longitude: Number(location.lng),
        address: String(location.address || 'Attached GPS Coordinates').slice(0, 500),
        readableLocation: String(location.address || 'Attached GPS Coordinates').slice(0, 500)
      } : null;

      const hasMedia = mediaList.length > 0 || !!voiceBlob;

      // 2. Build canonical initial request document
      const initialPayload: any = {
        requestId: newRequestId,
        citizenId: user.uid,
        userId: user.uid,
        citizenName,
        citizenContact,
        language: language.slice(0, 10),
        description: descriptionText,
        originalText: descriptionText,
        translatedText: descriptionText,
        category: 'General',
        problem: descriptionText.slice(0, 10000),
        severity: 'Medium',
        urgency: 'Medium',
        safetyRisk: 'Low',
        location: finalLocation,
        latitude: finalLocation ? Number(finalLocation.lat) : null,
        longitude: finalLocation ? Number(finalLocation.lng) : null,
        photos: [],
        videos: [],
        voiceUrl: null,
        media: [],
        mediaUrls: [],
        aiSummary: 'Citizen request registered. Background intelligence and evidence processing underway.',
        aiStatus: 'pending',
        mediaStatus: hasMedia ? 'uploading' : 'completed',
        priorityScore: 60,
        priority: 'Medium',
        status: 'processing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 3. Immediately create the request document in Firestore
      await setDoc(newDocRef, initialPayload);

      // 4. Firestore confirmed! Immediately display success to the citizen
      setSubmittedRequestId(newRequestId);
      setStatus('success');
      toast.success('Request submitted successfully!');

      // Snapshot media and text for asynchronous processing
      const mediaToProcess = [...mediaList];
      const voiceToProcess = voiceBlob;
      const textToProcess = descriptionText;
      const langToProcess = language;
      const locToProcess = finalLocation;

      // Reset form state so citizen can navigate or submit another need
      setText('');
      setMediaList([]);
      removeVoiceRecording();
      setLocation(null);
      setLocationStatus('idle');

      // 5. Trigger background uploads and AI analysis (non-blocking)
      processBackgroundTasks(
        newRequestId,
        newDocRef,
        mediaToProcess,
        voiceToProcess,
        textToProcess,
        langToProcess,
        locToProcess
      ).catch((bgErr) => {
        console.error('Background processing error:', bgErr);
      });

    } catch (error: any) {
      console.error('Submission error:', error);
      setStatus('error');
      toast.error(error.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] google-shadow-sm border border-slate-200 overflow-hidden"
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header Banner */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
              Official Grievance & Development Intake
            </span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Report a Community Need</h2>
          <p className="text-slate-600 text-base">
            Your request connects directly to the Policymaker Dashboard for priority infrastructure planning.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {status === 'success' && submittedRequestId ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">Request Submitted Successfully!</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm">
                  Your request has been logged into the live platform with ID:
                </p>
                <div className="inline-block px-4 py-2 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-700 border border-slate-200">
                  {submittedRequestId}
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl max-w-md mx-auto text-left text-sm text-blue-900">
                <p className="font-semibold flex items-center gap-1.5 mb-1">
                  <Sparkles size={16} className="text-blue-600" /> Real-Time Policymaker Notification
                </p>
                <p className="text-blue-700 text-xs leading-relaxed">
                  Your request has been sent to the policymaker dashboard. Evidence and AI analysis are being processed in the background.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/my-requests')}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 google-transition flex items-center justify-center gap-2 text-sm google-shadow-sm"
                >
                  Track in My Requests <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setSubmittedRequestId(null);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 rounded-full font-bold hover:bg-slate-200 google-transition text-sm border border-slate-200"
                >
                  Submit Another Need
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Language Selector */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Submission Language
                </label>
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 google-transition-fast hover:border-slate-300">
                  <Globe size={18} className="text-slate-400" />
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-transparent text-sm focus:outline-none focus:ring-0 font-medium cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
              </div>

              {/* Text Description & Voice Capture */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Describe Your Issue or Request
                </label>

                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="E.g., The arterial road connecting to the primary healthcare center has large dangerous potholes causing accidents and transit delays..."
                    rows={5}
                    className="w-full px-5 py-4 rounded-3xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 google-transition resize-none text-slate-800 text-base placeholder:text-slate-400 bg-slate-50 hover:bg-white"
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`absolute bottom-4 right-4 p-3 rounded-full google-transition google-shadow-sm flex items-center gap-2 ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' 
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title={isRecording ? "Click to stop recording" : "Record voice message"}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    {isRecording && <span className="text-xs font-bold mr-1">Recording...</span>}
                  </button>
                </div>

                {/* Voice Preview Player */}
                {voicePreviewUrl && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                        <Volume2 size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-purple-900">Voice Note Attached</p>
                        <audio controls src={voicePreviewUrl} className="h-8 max-w-[240px] sm:max-w-[320px] mt-1" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeVoiceRecording}
                      className="p-1.5 text-purple-400 hover:text-red-500 hover:bg-purple-100 rounded-full google-transition-fast"
                      title="Remove voice note"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between flex-wrap gap-4">
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    Type in English or your native language, or use the mic to record audio. Gemini AI translates and synthesizes key development priorities automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleEnhanceWithAI}
                    disabled={isEnhancing || !text.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold google-transition bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50"
                  >
                    {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>Enhance with AI</span>
                  </button>
                </div>
              </div>

              {/* Media Evidence (Photos & Videos) */}
              <div className="border-t border-slate-100 pt-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Media Evidence (Photos & Videos)
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer google-transition-fast text-xs font-semibold">
                    <Camera size={22} className="text-blue-500" />
                    <span>Take Photo</span>
                    <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer google-transition-fast text-xs font-semibold">
                    <Video size={22} className="text-red-500" />
                    <span>Record Video</span>
                    <input type="file" accept="video/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer google-transition-fast text-xs font-semibold">
                    <ImageIcon size={22} className="text-indigo-500" />
                    <span>Upload Gallery</span>
                    <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                </div>

                {mediaList.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {mediaList.map((item, index) => (
                      <div key={index} className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                        {item.type === 'image' ? (
                          <img src={item.previewUrl} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 p-2">
                            <Video size={28} className="text-red-500" />
                            <span className="text-[10px] font-medium mt-1 truncate w-20 text-center">{item.file.name}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(index)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full backdrop-blur-sm google-transition-fast"
                          title="Remove evidence"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Selector */}
              <div className="border-t border-slate-100 pt-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Location
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={locationStatus === 'locating'}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold google-transition google-shadow-sm ${
                      locationStatus === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : locationStatus === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {locationStatus === 'locating' ? <Loader2 size={14} className="animate-spin" /> : 
                     locationStatus === 'success' ? <MapPin size={14} className="text-emerald-600" /> : 
                     <Navigation size={14} />}
                    {locationStatus === 'locating' ? 'Acquiring GPS...' : 
                     locationStatus === 'success' ? 'Location Attached' : 
                     locationStatus === 'error' ? 'Retry Location' : 
                     'Attach My Location'}
                  </button>

                  {location && (
                    <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 font-medium truncate max-w-sm">
                      📍 {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Status and Submission Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
                <AnimatePresence>
                  {status === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center text-red-600 text-xs font-medium"
                    >
                      <AlertCircle size={16} className="mr-1.5" />
                      Failed to submit. Please try again.
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isSubmitting || (!text.trim() && mediaList.length === 0 && !voiceBlob)}
                  className="w-full sm:w-auto sm:ml-auto flex justify-center items-center px-8 py-3.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed google-transition google-shadow-sm text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Submitting request...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
