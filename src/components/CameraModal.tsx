import React, { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCw, Check, AlertCircle, RefreshCw } from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (fileName: string, dataUrl: string) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async (deviceId?: string) => {
    setIsInitializing(true);
    setError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Base video configuration
      const videoConfig: MediaTrackConstraints = deviceId 
        ? { deviceId: { exact: deviceId } } 
        : { facingMode: { ideal: "environment" } };

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: videoConfig,
        audio: false,
      });

      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // If no specific deviceId was requested, track current active deviceId
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.deviceId) {
          setActiveDeviceId(settings.deviceId);
        }
      }

      // Enumerate list of video input devices (to support switching, e.g. front/rear on tablets/phones)
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === "videoinput");
      setDevices(videoDevices);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(
        "Не удалось получить доступ к камере. Пожалуйста, предоставьте разрешение на использование веб-камеры в вашем браузере либо воспользуйтесь загрузкой сохраненного файла из памяти."
      );
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    if (nextDevice) {
      setActiveDeviceId(nextDevice.deviceId);
      startCamera(nextDevice.deviceId);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set matching canvas boundaries
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    const context = canvas.getContext("2d");
    if (context) {
      // Draw frame to canvas
      context.drawImage(video, 0, 0, videoWidth, videoHeight);
      
      // Extract high quality JPEG
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(dataUrl);

      // Stop video streaming track when previewing captured picture
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const formattedTime = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
      const fileName = `camera_photo_${formattedDate}_${formattedTime}.jpg`;
      
      onCapture(fileName, capturedImage);
      handleClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(activeDeviceId || undefined);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCapturedImage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" id="camera-modal">
        {/* Header */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            Снимок с камеры
          </h3>
          <button 
            type="button"
            onClick={handleClose} 
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-[300px] md:min-h-[360px]">
          {isInitializing && !capturedImage && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/40">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Запуск камеры...</p>
            </div>
          )}

          {error && !capturedImage && (
            <div className="p-6 text-center max-w-sm flex flex-col items-center gap-3">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <h4 className="font-bold text-sm">Доступ к камере заблокирован</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={() => startCamera(activeDeviceId || undefined)}
                className="mt-2 text-xs font-bold leading-none bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Повторить запуск
              </button>
            </div>
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Video stream view */}
          {!capturedImage && !error && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-[320px] md:h-[400px] object-cover scale-x-[-1]"
              style={{ display: isInitializing ? "none" : "block" }}
            />
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Снимок с камеры"
              className="w-full h-[320px] md:h-[400px] object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
          <div>
            {!capturedImage && !error && devices.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-slate-700"
                title="Переключить камеру"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Сменить камеру
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-755 border border-slate-700 font-bold py-2 px-4 rounded-lg cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={!!error || isInitializing}
                  onClick={handleCapture}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Сделать фото
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 font-bold py-2 px-4 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Переснять
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Прикрепить снимок
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
