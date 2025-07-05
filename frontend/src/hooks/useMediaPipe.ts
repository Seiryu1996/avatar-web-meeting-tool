// MediaPipe関連の処理を管理するカスタムフック

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaPipeLibraryState, MediaPipeResults, FaceTrackingData } from '../types/faceTracker';
import { CDN_URLS, MEDIAPIPE_CONFIG, CAMERA_CONFIG } from '../constants/faceTracker';
import { calculateFaceTrackingData } from '../utils/faceTrackingCalculations';

/**
 * MediaPipeライブラリを動的に読み込む
 */
const loadMediaPipeLibraries = async (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // 既に読み込まれている場合はスキップ
    if (window.FaceMesh && window.Camera) {
      resolve();
      return;
    }

    // Face Meshライブラリを読み込み
    const faceMeshScript = document.createElement('script');
    faceMeshScript.src = CDN_URLS.FACE_MESH;
    faceMeshScript.onload = () => {
      // Camera Utilsライブラリを読み込み
      const cameraScript = document.createElement('script');
      cameraScript.src = CDN_URLS.CAMERA_UTILS;
      cameraScript.onload = () => resolve();
      cameraScript.onerror = () => reject(new Error('Camera Utils loading failed'));
      document.head.appendChild(cameraScript);
    };
    faceMeshScript.onerror = () => reject(new Error('Face Mesh loading failed'));
    document.head.appendChild(faceMeshScript);
  });
};

/**
 * MediaPipeを使用した顔認識処理を管理するカスタムフック
 */
export const useMediaPipe = (
  videoRef: React.RefObject<HTMLVideoElement>,
  onTrackingUpdate: (data: FaceTrackingData) => void
) => {
  const [libraryState, setLibraryState] = useState<MediaPipeLibraryState>({
    isLoaded: false,
    isLoading: false,
    error: null,
  });

  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // MediaPipeの結果を処理するコールバック
  const onResults = useCallback((results: MediaPipeResults) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const trackingData = calculateFaceTrackingData(landmarks);
      onTrackingUpdate(trackingData);
    }
  }, [onTrackingUpdate]);

  // MediaPipeライブラリを読み込み
  const loadLibraries = useCallback(async () => {
    if (libraryState.isLoading || libraryState.isLoaded) return;

    setLibraryState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await loadMediaPipeLibraries();
      setLibraryState(prev => ({ ...prev, isLoaded: true, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLibraryState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, [libraryState.isLoading, libraryState.isLoaded]);

  // MediaPipeを初期化
  const initializeMediaPipe = useCallback(async () => {
    if (!libraryState.isLoaded || !videoRef.current || isInitializedRef.current) return;

    try {
      // FaceMeshを初期化
      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => {
          return `${CDN_URLS.FACE_MESH_FILES}${file}`;
        }
      });

      faceMesh.setOptions(MEDIAPIPE_CONFIG);
      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      // カメラを初期化
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        ...CAMERA_CONFIG
      });

      cameraRef.current = camera;
      await camera.start();
      isInitializedRef.current = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'MediaPipe initialization failed';
      setLibraryState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [libraryState.isLoaded, videoRef, onResults]);

  // クリーンアップ
  const cleanup = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    isInitializedRef.current = false;
  }, []);

  // 初期化処理
  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  useEffect(() => {
    if (libraryState.isLoaded) {
      initializeMediaPipe();
    }
  }, [libraryState.isLoaded, initializeMediaPipe]);

  // クリーンアップ処理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    libraryState,
    loadLibraries,
    cleanup,
  };
};