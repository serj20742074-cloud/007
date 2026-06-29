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
      description: description.trim() || "Описание отсутствует",
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
      description: editDescription.trim() || "Описание отсутствует",
      attachments: editAttachments
    });

    setEditingMeeting(null);
  };

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
      <div className="grid grid-cols-1 gap-4 w-full" id="meetings-cards-grid">
        {db.meetings.length === 0 ? (
          <div className="col-span-full bg-white p-10 text-center rounded-xl border border-slate-200 text-slate-400 font-medium">
            Запланированные совещания отсутствуют.
          </div>
        ) : (
          [...db.meetings]
            .sort((a, b) => {
              const now = new Date();
              const nowMs = now.getTime();
              
              const getGroup = (meet: Meeting) => {
                const meetDateTime = new Date(`${meet.date}T${meet.time}:00`);
                const startMs = meetDateTime.getTime();
                const oneHourLaterMs = startMs + 60 * 60 * 1000;
                if (nowMs >= oneHourLaterMs) {
                  return 2; // Group 2: Over / Archived (1 hour or more after start)
                }
                return 1; // Group 1: Upcoming or active (less than 1 hour since start)
              };

              const groupA = getGroup(a);
              const groupB = getGroup(b);

              if (groupA !== groupB) {
                return groupA - groupB; // Group 1 first, Group 2 last
              }

              const timeA = new Date(`${a.date}T${a.time}:00`).getTime();
              const timeB = new Date(`${b.date}T${b.time}:00`).getTime();
              return timeA - timeB;
            })
            .map(meet => {
              const hasPast = new Date().getTime() >= new Date(`${meet.date}T${meet.time}:00`).getTime() + 60 * 60 * 1000;

              return (
                <div key={meet.id} className="bg-slate-50/90 border border-slate-300 shadow-sm rounded-xl flex flex-col justify-between overflow-hidden hover:shadow-md hover:border-slate-455 transition-all duration-200" id={`meet-card-${meet.id}`}>
                  {/* Card head */}
                  <div className="p-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                      hasPast ? "bg-slate-250 text-slate-500" : "bg-amber-100 text-amber-800 animate-pulse"
                    }`}>
                      {formatDate(meet.date)} | в {meet.time}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEditingMeeting(meet)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                        title="Редактировать"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Удалить совещание: "${meet.theme}"?`)) {
                            deleteMeeting(meet.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body content */}
                  <div className="p-4 space-y-3 flex-1">
                    <h3 className="font-bold text-slate-900 border-none text-xs leading-relaxed line-clamp-2">
                      {meet.theme}
                    </h3>

                    <div className="flex items-center gap-1 text-[10px] text-slate-550 font-bold font-mono">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      Председатель: {meet.leader}
                    </div>

                    <p className="text-3xs text-slate-500 leading-normal font-medium whitespace-pre-wrap line-clamp-4 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      {meet.description || "Повестка заготовлена."}
                    </p>

                    {/* Meeting Attachments list */}
                    {meet.attachments && meet.attachments.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="block text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-blue-500" /> Материалы к селектору ({meet.attachments.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {meet.attachments.map(att => (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => att.fileData && setViewerFile(att)}
                              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1.5 cursor-pointer transition-all border outline-none ${
                                att.fileData 
                                  ? "bg-blue-50 border-blue-200 hover:bg-indigo-50 hover:border-indigo-200 text-blue-800 hover:text-indigo-900" 
                                  : "bg-slate-50 border-slate-200 text-slate-450 cursor-not-allowed"
                              }`}
                              title={att.fileData ? "Нажмите для просмотра в браузере" : "Файл доступен только по протоколу"}
                            >
                              <Paperclip className="w-2.5 h-2.5 shrink-0 text-blue-500" />
                              <span className={att.fileData ? "underline truncate max-w-[120px]" : "truncate max-w-[120px]"}>{att.fileName}</span>
                              {att.size && <span className="font-sans font-normal text-[8px] text-slate-400">({att.size})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
    </div>
  );
}
