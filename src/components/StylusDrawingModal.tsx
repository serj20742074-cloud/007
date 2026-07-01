import React, { useRef, useState, useEffect } from "react";
import { X, RotateCcw, Paintbrush, Eraser, Check, Info } from "lucide-react";

interface StylusDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string, fileName: string) => void;
  title?: string;
}

export default function StylusDrawingModal({
  isOpen,
  onClose,
  onSave,
  title = "Рукописный эскиз и заметки стилусом"
}: StylusDrawingModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<string>("#1e293b"); // default slate-800
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [gridType, setGridType] = useState<"dots" | "grid" | "blank">("grid");

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Match canvas layout size
        canvas.width = canvas.parentElement?.clientWidth || 800;
        canvas.height = 450;
        
        // Reset context styling
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        // Clear canvas with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawGridBackground(canvas, ctx);
      }
    }
  }, [isOpen, gridType]);

  const drawGridBackground = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    if (gridType === "blank") return;

    ctx.save();
    ctx.strokeStyle = "#f1f5f9";
    ctx.fillStyle = "#f1f5f9";
    ctx.lineWidth = 1;

    if (gridType === "grid") {
      const step = 20;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    } else if (gridType === "dots") {
      const step = 20;
      for (let x = 10; x < canvas.width; x += step) {
        for (let y = 10; y < canvas.height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    // Configure stroke style
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      e.preventDefault();
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGridBackground(canvas, ctx);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Save image
    const dataUrl = canvas.toDataURL("image/png");
    const timestamp = new Date().toLocaleTimeString("ru-RU").replace(/:/g, "-");
    const date = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");
    const fileName = `Стилус_${date}_${timestamp}.png`;
    
    onSave(dataUrl, fileName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Paintbrush className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Оптимизировано для Huawei M-Pencil и стилусов</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 flex-1">
          {/* OS integration tip */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block mb-0.5">💡 Функция FreeScript (Рукописный ввод в поля)</span>
              Вы можете писать стилусом прямо поверх стандартных текстовых полей на вашем планшете Huawei. Экранная клавиатура HarmonyOS автоматически распознает ваш почерк в печатный текст. Данная панель предназначена для рисования схем, эскизов или сохранения рукописных заметок как файлов-доказательств.
            </div>
          </div>

          {/* Tools Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {/* Left side: Tool selections */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTool("pen")}
                className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${
                  tool === "pen" 
                    ? "bg-slate-900 text-white shadow-xs" 
                    : "bg-white text-slate-650 hover:bg-slate-100 border border-slate-205"
                }`}
              >
                <Paintbrush className="w-4 h-4" />
                Ручка
              </button>

              <button
                type="button"
                onClick={() => setTool("eraser")}
                className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${
                  tool === "eraser" 
                    ? "bg-slate-900 text-white shadow-xs" 
                    : "bg-white text-slate-650 hover:bg-slate-100 border border-slate-205"
                }`}
              >
                <Eraser className="w-4 h-4" />
                Ластик
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="p-2 bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                title="Очистить холст"
              >
                <RotateCcw className="w-4 h-4" />
                Очистить
              </button>
            </div>

            {/* Colors (if pen selected) */}
            {tool === "pen" && (
              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                {[
                  { name: "Slate", val: "#1e293b" },
                  { name: "Blue", val: "#2563eb" },
                  { name: "Red", val: "#dc2626" },
                  { name: "Green", val: "#16a34a" }
                ].map(c => (
                  <button
                    key={c.val}
                    type="button"
                    onClick={() => setColor(c.val)}
                    style={{ backgroundColor: c.val }}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform relative ${
                      color === c.val ? "scale-110 ring-2 ring-slate-300 ring-offset-1" : "hover:scale-105"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Line Width */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 text-2xs font-extrabold text-slate-600">
              <span>Толщина:</span>
              <select
                value={lineWidth}
                onChange={e => setLineWidth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded p-1 font-bold focus:outline-none"
              >
                <option value={1}>1px</option>
                <option value={3}>3px</option>
                <option value={5}>5px</option>
                <option value={8}>8px</option>
                <option value={12}>12px</option>
              </select>
            </div>

            {/* Grid selector */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 text-2xs font-extrabold text-slate-600">
              <span>Фон:</span>
              <select
                value={gridType}
                onChange={e => setGridType(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded p-1 font-bold focus:outline-none"
              >
                <option value="grid">Клетка</option>
                <option value="dots">Точки</option>
                <option value="blank">Чистый</option>
              </select>
            </div>
          </div>

          {/* Draw Board Area */}
          <div className="border border-slate-205 rounded-xl overflow-hidden bg-white shadow-inner select-none touch-none cursor-crosshair">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full block bg-white"
              style={{ touchAction: "none" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-extrabold text-slate-600 bg-white hover:bg-slate-100 border border-slate-205 rounded-lg transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Вставить рисунок в файлы
          </button>
        </div>
      </div>
    </div>
  );
}
