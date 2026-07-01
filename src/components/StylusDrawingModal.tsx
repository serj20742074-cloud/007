import React, { useRef, useState, useEffect } from "react";
import { X, RotateCcw, Paintbrush, Eraser, Check, Info, ExternalLink, Clipboard, Smartphone, Sparkles, HelpCircle } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"canvas" | "huawei">("canvas");

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

  const handleLaunchHuaweiNotepad = () => {
    try {
      // Launch native Huawei Notepad via Android intent URL
      window.location.href = "intent://#Intent;scheme=huawei.notepad;package=com.huawei.notepad;end";
    } catch (e) {
      alert("Не удалось автоматически запустить приложение. Пожалуйста, откройте «Huawei Блокнот» вручную с рабочего стола.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Paintbrush className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Режим работы со стилусом и M-Pencil</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("canvas")}
            className={`flex-1 py-3 text-center font-extrabold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "canvas"
                ? "border-indigo-600 text-indigo-750 bg-white"
                : "border-transparent text-slate-550 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Paintbrush className="w-4 h-4 text-indigo-650" />
            Встроенный холст для рисования
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("huawei")}
            className={`flex-1 py-3 text-center font-extrabold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "huawei"
                ? "border-indigo-600 text-indigo-750 bg-white"
                : "border-transparent text-slate-550 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Smartphone className="w-4 h-4 text-cyan-600" />
            Связка с Huawei Блокнот
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {activeTab === "canvas" ? (
            <div className="space-y-4">
              {/* OS integration tip */}
              <div className="bg-blue-50/65 border border-blue-200 p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-blue-900 font-medium leading-relaxed">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block mb-0.5">✍️ Рукописный ввод FreeScript (HarmonyOS)</span>
                  Вы можете писать стилусом прямо поверх стандартных текстовых полей на вашем планшете. Система HarmonyOS автоматически распознает ваш почерк в печатный текст. Данная панель предназначена для рисования схем, чертежей и рукописных примечаний.
                </div>
              </div>

              {/* Tools Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 shrink-0">
                {/* Left side: Tool selections */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTool("pen")}
                    className={`p-2 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      tool === "pen" 
                        ? "bg-slate-900 text-white shadow-sm" 
                        : "bg-white text-slate-650 hover:bg-slate-100 border border-slate-205"
                    }`}
                  >
                    <Paintbrush className="w-4 h-4" />
                    Ручка
                  </button>

                  <button
                    type="button"
                    onClick={() => setTool("eraser")}
                    className={`p-2 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      tool === "eraser" 
                        ? "bg-slate-900 text-white shadow-sm" 
                        : "bg-white text-slate-650 hover:bg-slate-100 border border-slate-205"
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                    Ластик
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-2 px-3 bg-white text-rose-650 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                    title="Очистить холст"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-550" />
                    Очистить
                  </button>
                </div>

                {/* Right side options */}
                <div className="flex items-center gap-3 flex-wrap">
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
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 text-3xs font-extrabold text-slate-600">
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
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 text-3xs font-extrabold text-slate-600">
                    <span>Сетка:</span>
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
          ) : (
            <div className="space-y-5">
              {/* Explainer card */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 text-xs text-slate-700 leading-relaxed font-medium">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm mb-1">
                  <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
                  <h3>Бесшовная интеграция с Huawei Блокнот</h3>
                </div>
                <p>
                  По соображениям безопасности веб-браузеров (песочница), веб-приложение не может напрямую забрать файл из закрытого локального приложения на вашем планшете. 
                </p>
                <p>
                  Однако планшеты Huawei на базе <strong>HarmonyOS / EMUI</strong> предоставляют 4 идеальных сценария для мгновенной интеграции вашего почерка и рисунков:
                </p>
              </div>

              {/* Step cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Variant 1 */}
                <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-3xs">1</span>
                    <h4 className="font-extrabold text-indigo-950 text-xs">Буфер обмена (Split-Screen)</h4>
                  </div>
                  <p className="text-slate-600 text-3xs leading-relaxed">
                    Запустите Huawei Блокнот параллельно в режиме разделенного экрана. Сделайте рисунок, выделите и скопируйте его. В нашей форме нажмите <strong>«Вставить скриншот»</strong> или просто <strong>Ctrl+V</strong> — рисунок мгновенно прикрепится к поручению!
                  </p>
                </div>

                {/* Variant 2 */}
                <div className="bg-cyan-50/50 border border-cyan-150 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-3xs">2</span>
                    <h4 className="font-extrabold text-cyan-950 text-xs">Перетаскивание SuperHub</h4>
                  </div>
                  <p className="text-slate-600 text-3xs leading-relaxed">
                    Выделите готовый рисунок в Huawei Блокноте и перетащите его в боковую панель <strong>SuperHub</strong>. Затем легким движением перетащите файл из SuperHub прямо на область загрузки файлов в нашей форме.
                  </p>
                </div>

                {/* Variant 3 */}
                <div className="bg-amber-50/50 border border-amber-150 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-3xs">3</span>
                    <h4 className="font-extrabold text-amber-950 text-xs">Рукописный ввод FreeScript</h4>
                  </div>
                  <p className="text-slate-600 text-3xs leading-relaxed">
                    Пишите стилусом M-Pencil прямо поверх стандартных текстовых полей нашего приложения (Заголовок, Описание). Интеллектуальный ввод HarmonyOS автоматически переведет ваш почерк в печатный текст в реальном времени.
                  </p>
                </div>

                {/* Variant 4 */}
                <div className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-3xs">4</span>
                    <h4 className="font-extrabold text-emerald-950 text-xs">Встроенный холст</h4>
                  </div>
                  <p className="text-slate-600 text-3xs leading-relaxed">
                    Если вам не хочется переключаться в другие приложения, вы можете нарисовать эскиз прямо на первой вкладке <strong>«Встроенный холст»</strong>. Он полностью поддерживает чувствительность к касаниям и сохраняет файлы в один клик.
                  </p>
                </div>
              </div>

              {/* Launcher panel */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="text-left space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    Экспериментальный запуск приложения
                  </h4>
                  <p className="text-3xs text-slate-500 leading-normal max-w-md">
                    Мы подготовили специальную ссылку-интент. При нажатии браузер попытается запустить оригинальный блокнот Huawei Блокнот на вашем мобильном устройстве.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchHuaweiNotepad}
                  className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-3xs p-2.5 px-4 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Открыть Huawei Блокнот
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-extrabold text-slate-600 bg-white hover:bg-slate-100 border border-slate-205 rounded-lg transition-colors cursor-pointer"
          >
            {activeTab === "canvas" ? "Отмена" : "Закрыть"}
          </button>
          {activeTab === "canvas" && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-3xs"
            >
              <Check className="w-4 h-4" />
              Вставить рисунок в файлы
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
