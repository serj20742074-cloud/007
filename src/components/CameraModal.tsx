import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  FlipHorizontal, 
  Sliders, 
  Sun, 
  Contrast, 
  Eye 
} from "lucide-react";

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
  const [isProcessing, setIsProcessing] = useState(false);

  // Live adjustments states
  const [isMirrored, setIsMirrored] = useState(false);
  const [rotation, setRotation] = useState<number>(0);
  const [filter, setFilter] = useState<'none' | 'document' | 'grayscale' | 'bright'>('none');
  const [isFlipped, setIsFlipped] = useState(false);

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
      let label = "";
      if (videoTrack) {
        label = videoTrack.label.toLowerCase();
        const settings = videoTrack.getSettings();
        if (settings.deviceId) {
          setActiveDeviceId(settings.deviceId);
        }
      }

      // Enumerate list of video input devices (to support switching, e.g. front/rear on tablets/phones)
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === "videoinput");
      setDevices(videoDevices);

      // Auto-detect mirroring: front/user camera should be mirrored, back/environment camera should NOT be mirrored
      const isFront = label.includes("front") || label.includes("передн") || label.includes("user") || label.includes("селфи");
      setIsMirrored(isFront);
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
      setRotation(0);
      setFilter('none');
      setIsFlipped(false);
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
      // Clear before drawing
      context.clearRect(0, 0, videoWidth, videoHeight);
      
      // Draw captured video frame. If mirrored preview is enabled, draw it mirrored to match preview
      if (isMirrored) {
        context.save();
        context.translate(videoWidth, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, videoWidth, videoHeight);
        context.restore();
      } else {
        context.drawImage(video, 0, 0, videoWidth, videoHeight);
      }
      
      // Extract high quality JPEG
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImage(dataUrl);

      // Stop video streaming track when previewing captured picture
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const processFinalImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!capturedImage) {
        resolve("");
        return;
      }

      // If no post-capture adjustments are made, return the image directly
      if (rotation === 0 && filter === 'none' && !isFlipped) {
        resolve(capturedImage);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(capturedImage);
          return;
        }

        // Bounding box calculation for rotated images
        const isRotated90 = rotation === 90 || rotation === 270;
        const width = isRotated90 ? img.height : img.width;
        const height = isRotated90 ? img.width : img.height;

        canvas.width = width;
        canvas.height = height;

        // Apply visual filter in 2D context
        try {
          if (filter === 'document') {
            // Document scanning: High contrast and greyscale
            ctx.filter = 'grayscale(100%) contrast(160%) brightness(110%)';
          } else if (filter === 'grayscale') {
            ctx.filter = 'grayscale(100%)';
          } else if (filter === 'bright') {
            ctx.filter = 'brightness(130%)';
          } else {
            ctx.filter = 'none';
          }
        } catch (e) {
          console.warn("Canvas filter not supported on this client browser.", e);
        }

        // Translate to center, rotate, scale, flip, then draw
        ctx.translate(width / 2, height / 2);
        
        ctx.rotate((rotation * Math.PI) / 180);
        
        const scaleX = isFlipped ? -1 : 1;
        ctx.scale(scaleX, 1);

        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const finalDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        resolve(finalDataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = capturedImage;
    });
  };

  const handleConfirm = async () => {
    if (capturedImage) {
      setIsProcessing(true);
      try {
        const processedUrl = await processFinalImage();
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const formattedTime = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
        const fileName = `camera_photo_${formattedDate}_${formattedTime}.jpg`;
        
        onCapture(fileName, processedUrl);
        handleClose();
      } catch (err) {
        console.error("Error processing final photo image:", err);
        // Fallback
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const formattedTime = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
        onCapture(`camera_photo_${formattedDate}_${formattedTime}.jpg`, capturedImage);
        handleClose();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setRotation(0);
    setFilter('none');
    setIsFlipped(false);
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

  const handleRotate = () => {
    setRotation(r => (r + 90) % 360);
  };

  const handleFlip = () => {
    setIsFlipped(f => !f);
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
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-[320px] md:min-h-[400px] overflow-hidden">
          
          {/* Spinner during init or processing */}
          {(isInitializing || isProcessing) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/60 z-20">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-300 font-medium">
                {isProcessing ? "Обработка изображения..." : "Запуск камеры..."}
              </p>
            </div>
          )}

          {error && !capturedImage && (
            <div className="p-6 text-center max-w-sm flex flex-col items-center gap-3 z-10">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <h4 className="font-bold text-sm">Доступ к камере заблокирован</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={() => startCamera(activeDeviceId || undefined)}
                className="mt-2 text-xs font-bold leading-none bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-lg transition-colors cursor-pointer"
              >
                Повторить запуск
              </button>
            </div>
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Top Video Options Bar (only during streaming) */}
          {!capturedImage && !error && !isInitializing && (
            <div className="absolute top-0 inset-x-0 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Камера:</span>
                <select
                  value={activeDeviceId || ""}
                  onChange={(e) => {
                    const devId = e.target.value;
                    setActiveDeviceId(devId);
                    startCamera(devId);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg text-xs py-1 px-1.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
                >
                  {devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Камера ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={`text-[11px] py-1 px-2 rounded-md flex items-center gap-1 transition-colors cursor-pointer border ${
                    isMirrored 
                      ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/40 font-semibold" 
                      : "bg-slate-800 border-transparent text-slate-300 hover:text-white hover:bg-slate-700"
                  }`}
                  title={isMirrored ? "Зеркальный вид: Включен" : "Зеркальный вид: Выключен"}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>{isMirrored ? "Зеркально" : "Оригинал"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Video stream view */}
          {!capturedImage && !error && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-[320px] md:h-[400px] object-cover transition-transform duration-200 ${isMirrored ? "scale-x-[-1]" : ""}`}
              style={{ display: isInitializing ? "none" : "block" }}
            />
          )}

          {/* Captured Image Preview with CSS Adjustments */}
          {capturedImage && (
            <div className="w-full h-[320px] md:h-[400px] flex items-center justify-center bg-slate-950 overflow-hidden relative">
              <img
                src={capturedImage}
                alt="Снимок с камеры"
                className="max-w-full max-h-full object-contain transition-all duration-200"
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${isFlipped ? -1 : 1})`,
                  filter: filter === 'document' 
                    ? 'grayscale(100%) contrast(160%) brightness(110%)' 
                    : filter === 'grayscale' 
                      ? 'grayscale(100%)' 
                      : filter === 'bright' 
                        ? 'brightness(130%)' 
                        : 'none'
                }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-[10px] text-slate-300 px-2 py-1 rounded border border-slate-800 flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>Предпросмотр обработки</span>
              </div>
            </div>
          )}
        </div>

        {/* Post-Capture Adjustments Toolbar */}
        {capturedImage && (
          <div className="flex flex-col gap-2.5 p-3.5 bg-slate-900/90 border-t border-slate-800/60" id="post-capture-tools">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Rotation & Flipping */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700 flex-1 sm:flex-initial"
                  title="Повернуть изображение на 90 градусов по часовой стрелке"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                  Повернуть 90°
                </button>
                <button
                  type="button"
                  onClick={handleFlip}
                  className={`text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border flex-1 sm:flex-initial ${
                    isFlipped 
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 font-semibold" 
                      : "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700"
                  }`}
                  title="Отразить изображение по горизонтали"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  Отразить
                </button>
              </div>
              
              {/* Image Processing Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1 whitespace-nowrap">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  Фильтр:
                </span>
                {(['none', 'document', 'grayscale', 'bright'] as const).map((f) => {
                  const labels = {
                    none: 'Оригинал',
                    document: 'Документ',
                    grayscale: 'ЧБ',
                    bright: 'Ярко'
                  };
                  const isActive = filter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isActive 
                          ? "bg-emerald-600 text-white font-semibold shadow-xs" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
          <div>
            {!capturedImage && !error && devices.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 py-2.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-slate-700"
                title="Переключить камеру по кругу"
              >
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
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
                  className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold py-2.5 px-4 rounded-lg cursor-pointer transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={!!error || isInitializing}
                  onClick={handleCapture}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 px-5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
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
                  className="text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1 cursor-pointer border border-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  Переснять
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-5 rounded-lg flex items-center gap-1 cursor-pointer shadow-sm transition-all active:scale-95"
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
