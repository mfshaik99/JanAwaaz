import { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Ultra-Fast In-Memory Media Cache & Resolver for Policymaker/Admin Dashboard.
 * 
 * - Eliminates repeated Firebase Storage getDownloadURL calls
 * - Completely avoids blocking the dashboard or waiting for media
 * - Supports instant synchronous display of already-resolved and direct URLs
 * - De-duplicates in-flight requests
 * - Preserves video streaming without downloading full files
 */

// Permanent in-memory cache for resolved download URLs (URL/path -> HTTPS download URL)
const resolvedUrlCache = new Map<string, string>();

// Map to prevent duplicate concurrent network requests for the exact same media path
const inFlightResolutions = new Map<string, Promise<string>>();

// Track images that have finished downloading/decoding
const loadedMediaCache = new Set<string>();

/**
 * Checks if a given URL or storage path has already been loaded/cached.
 */
export function isMediaCached(rawUrl: string): boolean {
  if (!rawUrl) return false;
  return loadedMediaCache.has(rawUrl) || resolvedUrlCache.has(rawUrl);
}

/**
 * Marks a media URL as loaded in memory.
 */
export function markMediaCached(rawUrl: string): void {
  if (rawUrl) {
    loadedMediaCache.add(rawUrl);
  }
}

/**
 * Checks if a string is already an immediately accessible web URL.
 */
function isDirectUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('/')
  );
}

/**
 * Synchronously returns a valid media URL if already known or direct.
 * Returns empty string only if an asynchronous Firebase Storage resolution is required.
 */
export function getSynchronousMediaUrl(rawUrlOrPath: string): string {
  if (!rawUrlOrPath || typeof rawUrlOrPath !== 'string') return '';
  const trimmed = rawUrlOrPath.trim();
  if (!trimmed) return '';

  // 1. If already in resolved cache, return immediately
  if (resolvedUrlCache.has(trimmed)) {
    return resolvedUrlCache.get(trimmed)!;
  }

  // 2. If it's already a direct web URL (HTTP/HTTPS, data URL, local asset), it is immediately ready
  if (isDirectUrl(trimmed)) {
    resolvedUrlCache.set(trimmed, trimmed);
    return trimmed;
  }

  return '';
}

/**
 * Resolves a media URL or Firebase Storage path asynchronously and reliably.
 * Reuses existing in-flight promises to prevent duplicate network calls.
 */
export async function resolveMediaUrl(rawUrlOrPath: string): Promise<string> {
  if (!rawUrlOrPath || typeof rawUrlOrPath !== 'string') return '';
  const trimmed = rawUrlOrPath.trim();
  if (!trimmed) return '';

  // Synchronous hit
  const syncHit = getSynchronousMediaUrl(trimmed);
  if (syncHit) return syncHit;

  // Check if resolution is already underway
  if (inFlightResolutions.has(trimmed)) {
    return inFlightResolutions.get(trimmed)!;
  }

  // Resolve from Firebase Storage
  const resolutionPromise = (async () => {
    try {
      let storagePath = trimmed;

      // Handle gs://bucket-name/path format
      if (storagePath.startsWith('gs://')) {
        const withoutPrefix = storagePath.slice(5);
        const slashIndex = withoutPrefix.indexOf('/');
        if (slashIndex !== -1) {
          storagePath = withoutPrefix.slice(slashIndex + 1);
        }
      }

      // Strip leading slashes
      while (storagePath.startsWith('/')) {
        storagePath = storagePath.slice(1);
      }

      const storageRef = ref(storage, storagePath);
      const downloadUrl = await getDownloadURL(storageRef);

      resolvedUrlCache.set(trimmed, downloadUrl);
      return downloadUrl;
    } catch (err) {
      console.warn('Could not resolve Firebase Storage media URL for:', trimmed, err);
      // Fallback to original string so relative paths or custom proxies can still attempt load
      resolvedUrlCache.set(trimmed, trimmed);
      return trimmed;
    } finally {
      inFlightResolutions.delete(trimmed);
    }
  })();

  inFlightResolutions.set(trimmed, resolutionPromise);
  return resolutionPromise;
}

/**
 * React Hook for seamless, independent, non-blocking media resolution.
 * If the URL is already direct or cached, it is available on the very FIRST render.
 */
export function useResolvedMediaUrl(rawUrl: string | undefined): { url: string; isLoading: boolean } {
  const syncUrl = getSynchronousMediaUrl(rawUrl || '');
  const [url, setUrl] = useState<string>(syncUrl);
  const [isLoading, setIsLoading] = useState<boolean>(!syncUrl && !!rawUrl);

  useEffect(() => {
    if (!rawUrl) {
      setUrl('');
      setIsLoading(false);
      return;
    }

    const immediate = getSynchronousMediaUrl(rawUrl);
    if (immediate) {
      setUrl(immediate);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    resolveMediaUrl(rawUrl)
      .then((resolved) => {
        if (isMounted) {
          setUrl(resolved);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUrl(rawUrl);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [rawUrl]);

  return { url, isLoading };
}

/**
 * Extracts all photos and videos from any citizen request document safely and comprehensively.
 * Supports: photos[], photo, imageUrl, image, videos[], video, videoUrl, media[], mediaUrls[].
 */
export function extractMediaUrls(req: any): { photos: string[]; videos: string[]; voiceUrl: string | null } {
  if (!req || typeof req !== 'object') {
    return { photos: [], videos: [], voiceUrl: null };
  }

  const photos: string[] = [];
  const videos: string[] = [];

  const isVideoStr = (u: string): boolean => {
    const lower = u.toLowerCase();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.m4v') ||
      lower.includes('.mp4?') ||
      lower.includes('.webm?') ||
      lower.includes('.mov?') ||
      lower.includes('video%2f') ||
      lower.includes('video/')
    );
  };

  const addPhoto = (item: any) => {
    if (!item) return;
    const str = typeof item === 'string' ? item.trim() : (item.url || item.downloadUrl || item.src || item.path || '');
    if (typeof str === 'string' && str && !photos.includes(str)) {
      photos.push(str);
    }
  };

  const addVideo = (item: any) => {
    if (!item) return;
    const str = typeof item === 'string' ? item.trim() : (item.url || item.downloadUrl || item.src || item.path || '');
    if (typeof str === 'string' && str && !videos.includes(str)) {
      videos.push(str);
    }
  };

  // 1. photos array
  if (Array.isArray(req.photos)) {
    req.photos.forEach(addPhoto);
  }

  // 2. Singular photo fields
  if (req.photo) addPhoto(req.photo);
  if (req.imageUrl) addPhoto(req.imageUrl);
  if (req.image) addPhoto(req.image);

  // 3. videos array
  if (Array.isArray(req.videos)) {
    req.videos.forEach(addVideo);
  }

  // 4. Singular video fields
  if (req.video) addVideo(req.video);
  if (req.videoUrl) addVideo(req.videoUrl);

  // 5. media array (mixed objects or strings)
  if (Array.isArray(req.media)) {
    req.media.forEach((item: any) => {
      const u = typeof item === 'string' ? item.trim() : (item?.url || item?.downloadUrl || item?.path || '');
      const type = typeof item === 'object' ? item?.type : '';
      if (!u) return;

      if (type === 'video' || isVideoStr(u)) {
        addVideo(u);
      } else {
        addPhoto(u);
      }
    });
  }

  // 6. mediaUrls array
  if (Array.isArray(req.mediaUrls)) {
    req.mediaUrls.forEach((u: any) => {
      if (typeof u === 'string' && u.trim()) {
        const str = u.trim();
        if (isVideoStr(str)) {
          addVideo(str);
        } else {
          addPhoto(str);
        }
      }
    });
  }

  const voiceUrl = typeof req.voiceUrl === 'string' && req.voiceUrl.trim() ? req.voiceUrl.trim() : (req.audioUrl || null);

  return { photos, videos, voiceUrl };
}

/**
 * Non-blocking warmup function for storage paths.
 * Resolves Firebase Storage paths in the background into resolvedUrlCache without downloading blobs.
 */
export function warmupMediaUrls(requests: any[], limit = 20): void {
  if (!requests || !Array.isArray(requests) || requests.length === 0) return;

  // Resolve storage paths in background without blocking
  setTimeout(() => {
    const subset = requests.slice(0, limit);
    for (const req of subset) {
      const { photos, videos } = extractMediaUrls(req);
      [...photos, ...videos].forEach((urlOrPath) => {
        if (urlOrPath && !getSynchronousMediaUrl(urlOrPath)) {
          resolveMediaUrl(urlOrPath).catch(() => {});
        }
      });
    }
  }, 50);
}

/**
 * Kept for backwards compatibility. Uses non-blocking URL warmup instead of blocking image decoding.
 */
export function preloadRequestMedia(requests: any[]): void {
  warmupMediaUrls(requests);
}
