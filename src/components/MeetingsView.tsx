import React, { useState, useRef, ChangeEvent, FormEvent } from "react";
import { AppDatabase, Meeting, Attachment } from "../types";
import { Calendar, Clock, User, FileText, Plus, X, Upload, Paperclip, MessageSquare, Trash2, Pencil, Check, Camera, Clipboard } from "lucide-react";
import CameraModal from "./CameraModal";
import { getTodayStr, formatDate } from "../utils/date";

interface MeetingsViewProps {
  db: AppDatabase;
  addMeeting: (meet: Omit<Meeting, "id">) => void;
  updateMeeting: (id: string, updated: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  renameAttachment: (attachmentId: string, newName: string) => void;
}

export default function MeetingsView({ db, addMeeting, updateMeeting, deleteMeeting, renameAttachment }: MeetingsViewProps) {
  
  const [isAdding, setIsAdding] = useState(false);
  const [theme, setTheme] = useState("");
  const [date, setDate] = useState(getTodayStr());
  const [time, setTime] = useState("09:00");
  const [leader, setLeader] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Editing state
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editTheme, setEditTheme] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLeader, setEditLeader] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"create" | "edit">("create");
  const [viewerFile, setViewerFile] = useState<Attachment | null>(null);
  const [selectedMeetingDetail, setSelectedMeetingDetail] = useState<Meeting | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"active" | "archive">("active");

  const isPastMeeting = (meet: Meeting) => {
    const now = new Date();
    const nowMs = now.getTime();
    const meetDateTime = new Date(`${meet.date}T${meet.time}:00`);
    const startMs = meetDateTime.getTime();
    const oneHourLaterMs = startMs + 60 * 60 * 1000;
    return nowMs >= oneHourLaterMs;
  };

  const handleCameraCapture = (fileName: string, dataUrl: string) => {
    const newAtt: Attachment = {
      id: "att-" + Date.now(),
      fileName: fileName,
      fileType: "jpg",
      fileData: dataUrl,
      size: "Снимок"
    };

    if (cameraTarget === "create") {
      setAttachments(prev => [...prev, newAtt]);
    } else {
      setEditAttachments(prev => [...prev, newAtt]);
    }
  };

  const handleFileUploadForCreation = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newAtt: Attachment = {
        id: "att-" + Date.now(),
        fileName: file.name,
        fileType: file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase() || "doc",
        size: Math.round(file.size / 1024) + " КБ"
      };

      const reader = new FileReader();
      reader.onloadend = () => {
        newAtt.fileData = reader.result as string;
        setAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUploadForEdit = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newAtt: Attachment = {
        id: "att-" + Date.now(),
        fileName: file.name,
        fileType: file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase() || "doc",
        size: Math.round(file.size / 1024) + " КБ"
      };

      const reader = new FileReader();
      reader.onloadend = () => {
        newAtt.fileData = reader.result as string;
        setEditAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClipboardPaste = async (
    setFilesState: React.Dispatch<React.SetStateAction<Attachment[]>>
  ) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert("Вставка из буфера обмена не поддерживается вашим браузером. Пожалуйста, используйте стандартную клавиатурную комбинацию Ctrl+V (или Cmd+V) внутри полей ввода.");
        return;
      }
      
      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;
      
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], `screenshot-${Date.now() % 1000000}.png`, { type });
            const newAtt: Attachment = {
              id: "att-" + Date.now(),
              fileName: file.name,
              fileType: "png",
              size: Math.round(file.size / 1024) + " КБ"
            };
            
            const reader = new FileReader();
            reader.onloadend = () => {
              newAtt.fileData = reader.result as string;
              setFilesState(prev => [...prev, newAtt]);
            };
            reader.readAsDataURL(file);
            foundImage = true;
            break;
          }
        }
        if (foundImage) break;
      }
      
      if (!foundImage) {
        alert("Изображение/скриншот не обнаружено в буфере обмена. Сделайте скриншот и скопируйте его, после чего попробуйте снова.");
      }
    } catch (err) {
      alert("Не удалось получить доступ к буферу обмена. Нажмите Ctrl+V внутри полей ввода для вставки скриншота вручную.");
    }
  };

  const handleOnPasteCapture = (
    e: React.ClipboardEvent<HTMLDivElement | HTMLFormElement>,
    setFilesState: React.Dispatch<React.SetStateAction<Attachment[]>>
  ) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const newAtt: Attachment = {
              id: "att-" + Date.now(),
              fileName: `screenshot-paste-${Date.now() % 1000000}.png`,
              fileType: "png",
              size: Math.round(file.size / 1520) + " КБ"
            };
            
            const reader = new FileReader();
            reader.onloadend = () => {
              newAtt.fileData = reader.result as string;
              setFilesState(prev => [...prev, newAtt]);
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    addMeeting({
      theme: theme.trim() || "Без темы",
      date: date || getTodayStr(),
      time: time || "09:00",
      leader: leader.trim() || "Не указан",
      description: description.trim() || "",
      attachments
    });
    
    // Reset
    setTheme("");
    setDescription("");
    setLeader("");
    setAttachments([]);
    setIsAdding(false);
  };

  const startEditingMeeting = (m: Meeting) => {
    setEditingMeeting(m);
    setEditTheme(m.theme);
    setEditDate(m.date);
    setEditTime(m.time);
    setEditLeader(m.leader);
    setEditDescription(m.description || "");
    setEditAttachments(m.attachments || []);
  };

  const handleEditMeetingSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    updateMeeting(editingMeeting.id, {
      theme: editTheme.trim() || "Без темы",
      date: editDate || getTodayStr(),
      time: editTime || "09:00",
      leader: editLeader.trim() || "Не указан",
      description: editDescription.trim() || "",
      attachments: editAttachments
    });

    setEditingMeeting(null);
  };

  const activeMeetings = db.meetings.filter(meet => !isPastMeeting(meet));
  const archivedMeetings = db.meetings.filter(meet => isPastMeeting(meet));
  const currentMeetingsList = activeSubTab === "active" ? activeMeetings : archivedMeetings;

  return (
    <div className="space-y-6" id="meetings-view-container">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Совещания и селекторы</h1>
          <p className="text-slate-500 font-medium text-sm">Планирование селекторных совещаний, подготовка материалов и протокольных решений</p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4" />
          Запланировать селектор
        </button>
      </div>

      {/* Sub-tabs for separating active and completed (archived) meetings */}
      <div className="flex border-b border-slate-200 gap-6" id="meetings-sub-tabs">
        <button
          type="button"
          onClick={() => setActiveSubTab("active")}
          className={`pb-3 text-xs font-extrabold transition-all relative cursor-pointer ${
            activeSubTab === "active"
              ? "text-blue-600 font-black"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Предстоящие и текущие ({activeMeetings.length})
          {activeSubTab === "active" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("archive")}
          className={`pb-3 text-xs font-extrabold transition-all relative cursor-pointer ${
            activeSubTab === "archive"
              ? "text-blue-600 font-black"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Архив завершенных ({archivedMeetings.length})
          {activeSubTab === "archive" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-100" id="add-meeting-modal">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Планирование нового селектора / совещания
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} onPaste={(e) => handleOnPasteCapture(e, setAttachments)} className="p-5 space-y-4 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="sm:col-span-2">
                  <label className="block text-slate-500 mb-0.5">Тема совещания</label>
                  <input
                    type="text"
                    placeholder="Пример: О готовности уборочной техники на станциях"
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">Дата проведения</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">Время начала</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Председательствующий руководитель (ФИО)</label>
                  <input
                    type="text"
                    placeholder="Романов К.Б. или Савельев П.И."
                    value={leader}
                    onChange={e => setLeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 mb-0.5 font-bold">Краткое описание / Повестка дня</label>
                  <textarea
                    placeholder="Перечень приглашенных, вопросы к заслушиванию, порядок докладов..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none h-24 resize-none"
                  />
                </div>

                {/* Attachments for Meeting Materials */}
                <div className="sm:col-span-2 space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="block text-slate-500 font-bold">Информационные материалы (Слайды, Положения):</span>
                  
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(att => (
                      <span key={att.id} className="bg-slate-150 border border-slate-200 text-3xs font-mono font-bold p-1 px-2 rounded flex items-center gap-1">
                        {att.fileName}
                        <X className="w-3 text-red-500 cursor-pointer hover:text-red-700 ml-1" onClick={() => setAttachments(prev => prev.filter(f => f.id !== att.id))} />
                      </span>
                    ))}

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUploadForCreation} 
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-3xs bg-slate-50 border border-slate-200 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-100"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" /> Загрузить файл
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget("create");
                        setIsCameraOpen(true);
                      }}
                      className="text-3xs bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 text-emerald-800 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" /> Сделать снимок
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClipboardPaste(setAttachments)}
                      className="text-3xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 text-cyan-850 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Вставить скриншот из буфера обмена (также работает Ctrl+V)"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-cyan-600" /> Вставить скриншот
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 Вы также можете просто нажать <kbd className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px] font-bold">Ctrl+V</kbd> (cmd+V) в любом месте формы, чтобы вставить картинку из буфера.
                  </p>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-5 rounded-lg cursor-pointer"
                >
                  Утвердить совещание
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid listing all scheduled meetings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full" id="meetings-cards-grid">
        {currentMeetingsList.length === 0 ? (
          <div className="col-span-full bg-white p-10 text-center rounded-xl border border-slate-200 text-slate-400 font-medium">
            {activeSubTab === "active" 
              ? "Предстоящие селекторные совещания отсутствуют." 
              : "Архив завершенных совещаний пуст."}
          </div>
        ) : (
          [...currentMeetingsList]
            .sort((a, b) => {
              const timeA = new Date(`${a.date}T${a.time}:00`).getTime();
              const timeB = new Date(`${b.date}T${b.time}:00`).getTime();
              if (activeSubTab === "active") {
                return timeA - timeB; // Earliest upcoming meeting first
              } else {
                return timeB - timeA; // Latest completed meeting first (descending)
              }
            })
            .map(meet => {
              const hasPast = isPastMeeting(meet);

              return (
                <div 
                  key={meet.id} 
                  onClick={() => setSelectedMeetingDetail(meet)}
                  className="bg-slate-50/90 border border-slate-300 shadow-xs rounded-xl flex flex-col justify-between overflow-hidden hover:shadow-md hover:border-blue-400 transition-all duration-200 cursor-pointer text-left" 
                  id={`meet-card-${meet.id}`}
                >
                  {/* Compact Header: Date, time, chairman and screenshot indicators in one row */}
                  <div className="p-3 bg-slate-50 border-b border-slate-150 flex justify-between items-center text-[10px] font-semibold gap-1 shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-700 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded font-bold font-mono shrink-0 ${
                        hasPast ? "bg-slate-200 text-slate-500" : "bg-amber-100 text-amber-800"
                      }`}>
                        {formatDate(meet.date)} {meet.time}
                      </span>
                      <span className="truncate text-slate-600 max-w-[80px]" title={`Председатель: ${meet.leader}`}>
                        • 👤 {meet.leader}
                      </span>
                      {meet.attachments && meet.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-blue-50 text-blue-700 rounded text-[9px] shrink-0 font-bold" title={`Материалы к селектору: ${meet.attachments.length} файл(ов)`}>
                          📎 {meet.attachments.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingMeeting(meet);
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                        title="Редактировать"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Удалить совещание: "${meet.theme}"?`)) {
                            deleteMeeting(meet.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body content */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 border-none text-[11px] leading-snug line-clamp-2" title={meet.theme}>
                        {meet.theme}
                      </h3>
                      {meet.description && meet.description.trim() !== "Описание отсутствует" && meet.description.trim() !== "" && (
                        <p className="text-[10px] text-slate-500 leading-normal font-medium whitespace-pre-wrap line-clamp-3 bg-white p-2 rounded border border-slate-100">
                          {meet.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-[9px] text-blue-600 font-bold pt-1.5 border-t border-slate-100/50 mt-auto flex justify-between items-center">
                      <span>Подробнее...</span>
                      {meet.attachments && meet.attachments.length > 0 && (
                        <span className="text-slate-400 font-mono">Файлов: {meet.attachments.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Edit Meeting modal form */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-100" id="edit-meeting-modal">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-650" />
                Редактирование совещания
              </h3>
              <button onClick={() => setEditingMeeting(null)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditMeetingSubmit} onPaste={(e) => handleOnPasteCapture(e, setEditAttachments)} className="p-5 space-y-4 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="sm:col-span-2">
                  <label className="block text-slate-500 mb-0.5">Тема совещания</label>
                  <input
                    type="text"
                    value={editTheme}
                    onChange={e => setEditTheme(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">Дата проведения</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">Время начала</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Председательствующий руководитель (ФИО)</label>
                  <input
                    type="text"
                    value={editLeader}
                    onChange={e => setEditLeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-lg font-medium outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 mb-0.5 font-bold">Краткое описание / Повестка дня</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none h-24 resize-none"
                  />
                </div>

                {/* Attachments for Meeting Materials */}
                <div className="sm:col-span-2 space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="block text-slate-500 font-bold">Информационные материалы (Слайды, Положения):</span>
                  
                  <div className="flex flex-wrap gap-2">
                    {editAttachments.map(att => (
                      <span key={att.id} className="bg-slate-150 border border-slate-200 text-3xs font-mono font-bold p-1 px-2 rounded flex items-center gap-1">
                        {att.fileName}
                        <X className="w-3 text-red-500 cursor-pointer hover:text-red-700 ml-1" onClick={() => setEditAttachments(prev => prev.filter(f => f.id !== att.id))} />
                      </span>
                    ))}

                    <input 
                      type="file" 
                      ref={editFileInputRef} 
                      onChange={handleFileUploadForEdit} 
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="text-3xs bg-slate-50 border border-slate-205 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-100"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" /> Загрузить файл
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget("edit");
                        setIsCameraOpen(true);
                      }}
                      className="text-3xs bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 text-emerald-800 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" /> Сделать снимок
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClipboardPaste(setEditAttachments)}
                      className="text-3xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 text-cyan-850 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                      title="Вставить скриншот из буфера обмена (также работает Ctrl+V)"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-cyan-600" /> Вставить скриншот
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 Вы также можете просто нажать <kbd className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px] font-bold">Ctrl+V</kbd> (cmd+V) в любом месте формы, чтобы вставить картинку из буфера.
                  </p>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-5 rounded-lg cursor-pointer animate-pulse"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCameraOpen && (
        <CameraModal 
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
        />
      )}

      {viewerFile && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-55 flex items-center justify-center p-4 font-sans text-left"
          id="meetings-document-viewer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl text-white">
            {/* Header */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <Paperclip className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">{viewerFile.fileName}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newName = prompt("Введите новое название файла:", viewerFile.fileName);
                        if (newName && newName.trim()) {
                          renameAttachment(viewerFile.id, newName.trim());
                          setViewerFile({
                            ...viewerFile,
                            fileName: newName.trim()
                          });
                        }
                      }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer font-bold border border-slate-700 hover:border-slate-600"
                    >
                      Переименовать
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Размер: {viewerFile.size || "Неизвестен"} | Формат: {viewerFile.fileType.toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewerFile(null)} 
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-755 p-1.5 rounded-lg cursor-pointer animate-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer content */}
            <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden relative font-sans">
              {viewerFile.fileData ? (
                (() => {
                  const isPd = viewerFile.fileType === "pdf" || viewerFile.fileName.toLowerCase().endsWith(".pdf") || viewerFile.fileData?.startsWith("data:application/pdf");
                  const isImg = viewerFile.fileType === "jpg" || viewerFile.fileType === "jpeg" || viewerFile.fileType === "png" || viewerFile.fileData?.startsWith("data:image");
                  
                  if (isPd) {
                    return (
                      <div className="w-full h-full flex flex-col gap-3 font-sans">
                        <iframe 
                          src={viewerFile.fileData} 
                          title={viewerFile.fileName}
                          className="w-full h-full rounded-lg border border-slate-800 bg-white"
                        />
                        <div className="text-center py-2 shrink-0 space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                          <p className="text-[10px] text-slate-400 leading-normal text-left max-w-xl font-sans">
                            Для планшетов Huawei и мобильных устройств: если PDF не отображается на экране из-за настроек безопасности, нажмите «Открыть во весь экран в браузере». Документ откроется без принудительной загрузки.
                          </p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (viewerFile.fileData) {
                                  try {
                                    const arr = viewerFile.fileData.split(",");
                                    const mime = arr[0].match(/:(.*?);/)?.[1] || "application/pdf";
                                    const bstr = atob(arr[1] || viewerFile.fileData);
                                    let n = bstr.length;
                                    const u8arr = new Uint8Array(n);
                                    while (n--) {
                                      u8arr[n] = bstr.charCodeAt(n);
                                    }
                                    const blob = new Blob([u8arr], { type: mime });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.target = "_blank";
                                    a.click();
                                    setTimeout(() => URL.revokeObjectURL(url), 15000);
                                  } catch (e) {
                                    alert("Ошибка запуска просмотра. Используйте альтернативную ссылку 'Скачать PDF файл'.");
                                  }
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white text-[11px] font-black py-2.5 px-4 rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                              🖥️ Открыть во весь экран в браузере (без скачивания)
                            </button>
                            <a 
                              href={viewerFile.fileData} 
                              download={viewerFile.fileName}
                              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-white text-[11px] font-bold py-2.5 px-4 rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                              📥 Скачать PDF файл
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (isImg) {
                    return (
                      <img 
                        src={viewerFile.fileData} 
                        alt={viewerFile.fileName}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else {
                    return (
                      <div className="text-center p-6 space-y-4 max-w-md">
                        <Paperclip className="w-16 h-16 text-blue-500 mx-auto" />
                        <h4 className="text-sm font-bold text-white">Этот тип файла ({viewerFile.fileType.toUpperCase()}) требует скачивания</h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-sans">
                          Ваш браузер не поддерживает встроенный просмотр этого формата файлов. Нажмите кнопку ниже для быстрой загрузки.
                        </p>
                        <a 
                          href={viewerFile.fileData} 
                          download={viewerFile.fileName}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          📥 Скачать {viewerFile.fileName}
                        </a>
                      </div>
                    );
                  }
                })()
              ) : (
                <div className="text-center p-4">
                  <p className="text-xs text-slate-400 font-sans">Файловые данные повреждены или отсутствуют.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              {viewerFile.fileData && (
                <a 
                  href={viewerFile.fileData} 
                  download={viewerFile.fileName}
                  className="bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-705 text-xs font-bold p-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  Скачать файл
                </a>
              )}
              <button 
                onClick={() => setViewerFile(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold p-2 px-5 rounded-lg cursor-pointer"
              >
                Закрыть просмотрщик
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Meeting Details Modal */}
      {selectedMeetingDetail && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
          onClick={() => setSelectedMeetingDetail(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-100 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            id="meeting-details-modal"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Детали селекторного совещания</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase font-mono">
                    📅 {formatDate(selectedMeetingDetail.date)} в {selectedMeetingDetail.time}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMeetingDetail(null)} 
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Тема совещания</span>
                <h4 className="font-extrabold text-slate-900 text-sm mt-0.5 leading-snug">
                  {selectedMeetingDetail.theme}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Председатель</span>
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5 mt-1">
                    👤 {selectedMeetingDetail.leader}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Статус проведения</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                    new Date().getTime() >= new Date(`${selectedMeetingDetail.date}T${selectedMeetingDetail.time}:00`).getTime() + 60 * 60 * 1000
                      ? "bg-slate-100 text-slate-600"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {new Date().getTime() >= new Date(`${selectedMeetingDetail.date}T${selectedMeetingDetail.time}:00`).getTime() + 60 * 60 * 1000
                      ? "Завершено"
                      : "Ожидается"}
                  </span>
                </div>
              </div>

              {selectedMeetingDetail.description && selectedMeetingDetail.description.trim() !== "" && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Повестка и подробное описание</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 font-medium whitespace-pre-wrap mt-1 leading-relaxed">
                    {selectedMeetingDetail.description}
                  </div>
                </div>
              )}

              {/* Attachments / Screenshots inside detail modal */}
              {selectedMeetingDetail.attachments && selectedMeetingDetail.attachments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">
                    📎 Прикрепленные материалы ({selectedMeetingDetail.attachments.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedMeetingDetail.attachments.map(att => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => att.fileData && setViewerFile(att)}
                        className={`text-xs font-mono font-bold p-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all border outline-none text-left ${
                          att.fileData 
                            ? "bg-blue-50/50 border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-900" 
                            : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Paperclip className="w-4 h-4 shrink-0 text-blue-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate underline text-[11px]">{att.fileName}</p>
                          <p className="font-sans font-normal text-[9px] text-slate-400 mt-0.5">{att.size || "Файл"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => setSelectedMeetingDetail(null)}
                className="px-4 py-2 text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
