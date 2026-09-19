import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Image as ImageIcon, RefreshCw, AlertCircle, Video } from 'lucide-react';
import { useResolvedMediaUrl, isMediaCached, markMediaCached } from '../../utils/mediaCache';

interface ProgressiveImageProps {
  key?: React.Key;
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  showOverlay?: boolean;
  loading?: 'eager' | 'lazy';
}

export function ProgressiveImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  showOverlay = true,
  loading = 'eager'
}: ProgressiveImageProps) {
  const { url: resolvedUrl, isLoading: isResolving } = useResolvedMediaUrl(src);
  const isAlreadyLoaded = isMediaCached(src) || isMediaCached(resolvedUrl);
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyLoaded);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // If the browser already has the image decoded or cached in memory
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      markMediaCached(src);
      if (resolvedUrl) markMediaCached(resolvedUrl);
    }
  }, [resolvedUrl, retryCount]);

  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHasError(false);
    setIsLoaded(false);
    setRetryCount(c => c + 1);
  };

  return (
    <a
      href={resolvedUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 block select-none ${containerClassName}`}
    >
      {/* Progressive Shimmer Placeholder (non-blocking pointer-events-none) */}
      {(!isLoaded || isResolving) && !hasError && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-1.5 text-slate-400 animate-pulse pointer-events-none z-10">
          <ImageIcon size={22} className="text-slate-300" />
          <span className="text-[10px] font-semibold tracking-wider text-slate-400">Loading media...</span>
        </div>
      )}

      {/* Network Error State with Immediate Retry */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-3 text-center z-10">
          <AlertCircle size={20} className="text-amber-500 mb-1" />
          <span className="text-[11px] font-semibold text-slate-600">Failed to load photo</span>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-blue-600 shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={10} /> Retry
          </button>
        </div>
      )}

      {/* High-Performance Native Image */}
      {resolvedUrl && (
        <img
          key={`${resolvedUrl}-${retryCount}`}
          ref={imgRef}
          src={resolvedUrl}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            setHasError(false);
            markMediaCached(src);
            markMediaCached(resolvedUrl);
          }}
          onError={() => {
            setHasError(true);
          }}
          className={`w-full h-full object-cover group-hover:scale-105 google-transition duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        />
      )}

      {/* Hover Overlay for Expanded View */}
      {showOverlay && isLoaded && (
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 google-transition-fast flex items-center justify-center text-white text-xs font-bold gap-1.5 z-20 pointer-events-none">
          <ExternalLink size={14} /> Full View
        </div>
      )}
    </a>
  );
}

interface ProgressiveVideoProps {
  key?: React.Key;
  src: string;
  className?: string;
  containerClassName?: string;
}

export function ProgressiveVideo({
  src,
  className = '',
  containerClassName = ''
}: ProgressiveVideoProps) {
  const { url: resolvedUrl, isLoading: isResolving } = useResolvedMediaUrl(src);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if video metadata is already loaded
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 1) {
      setIsReady(true);
    }
  }, [resolvedUrl]);

  return (
    <div className={`aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black relative ${containerClassName}`}>
      {/* Non-blocking loading indicator. pointer-events-none ensures user can click play anytime */}
      {(!isReady || isResolving) && !hasError && (
        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-2 text-slate-300 pointer-events-none z-10">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
          <span className="text-[10px] font-medium text-slate-300">Ready to stream...</span>
        </div>
      )}

      {/* Video stream error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-3 text-center text-slate-400 z-10">
          <AlertCircle size={20} className="text-amber-500 mb-1" />
          <span className="text-xs text-slate-300">Unable to stream video</span>
        </div>
      )}

      {/* Native progressive streaming HTML5 video */}
      {resolvedUrl && (
        <video
          ref={videoRef}
          controls
          src={resolvedUrl}
          preload="metadata"
          playsInline
          onLoadedMetadata={() => setIsReady(true)}
          onLoadedData={() => setIsReady(true)}
          onCanPlay={() => setIsReady(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-contain ${className}`}
        />
      )}
    </div>
  );
}
