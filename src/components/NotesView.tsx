import React, { useState, useRef, ChangeEvent, FormEvent } from "react";
import { AppDatabase, Note, Attachment } from "../types";
import { Plus, X, Trash2, ShieldAlert, Clock, Paperclip, Upload, FileCheck, HelpCircle, Camera, Pencil, Check, Clipboard } from "lucide-react";
import CameraModal from "./CameraModal";
import { getTodayStr, formatDate } from "../utils/date";

interface NotesViewProps {
  db: AppDatabase;
  addNote: (note: Omit<Note, "id">) => void;
  updateNote: (id: string, updated: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  renameAttachment: (attachmentId: string, newName: string) => void;
}

export default function NotesView({ db, addNote, updateNote, deleteNote, renameAttachment }: NotesViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"create" | "edit">("create");
  const [viewerFile, setViewerFile] = useState<Attachment | null>(null);

  // Edit states
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editReminderDate, setEditReminderDate] = useState("");
  const [editReminderTime, setEditReminderTime] = useState("");
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [editIsCompleted, setEditIsCompleted] = useState(false);

  // Filter state for notes status (all, active, completed)
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = (fileName: string, dataUrl: string) => {
    const newAtt: Attachment = {
      id: "att-" + Date.now(),
      fileName: fileName,
      fileType: "jpg",
      fileData: dataUrl,
      size: "Снимок"
    };
    if (cameraTarget === "edit") {
      setEditAttachments(prev => [...prev, newAtt]);
    } else {
      setAttachments(prev => [...prev, newAtt]);
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

    addNote({
      title: title.trim() || "Без названия",
      text: text.trim() || "Текст отсутствует",
      reminderDate: reminderDate || undefined,
      reminderTime: reminderTime || undefined,
      attachments,
      isCompleted: isCompleted
    });

    // Reset Form
    setTitle("");
    setText("");
    setReminderDate("");
    setReminderTime("");
    setAttachments([]);
    setIsCompleted(false);
    setIsAdding(false);
  };

  const handleEditNoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    updateNote(editingNote.id, {
      title: editTitle.trim() || "Без названия",
      text: editText.trim() || "Текст отсутствует",
      reminderDate: editReminderDate || undefined,
      reminderTime: editReminderTime || undefined,
      attachments: editAttachments,
      isCompleted: editIsCompleted
    });

    setEditingNote(null);
  };

  const filteredNotes = db.notes.filter(note => {
    if (filter === "active") return !note.isCompleted;
    if (filter === "completed") return !!note.isCompleted;
    return true; // "all"
  });

  return (
    <div className="space-y-6" id="notes-view-container">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Личные заметки и напоминания</h1>
          <p className="text-slate-500 font-medium text-sm">Оперативный блокнот руководителя для фиксации устных поручений, звонков и напоминаний</p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 font-black" />
          Создать заметку
        </button>
      </div>

      {/* Tab Filter controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-200 pb-3" id="notes-filter-tabs">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === "active"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>В работе (Активные)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filter === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
              {db.notes.filter(n => !n.isCompleted).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === "completed"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Отработанные</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filter === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
              {db.notes.filter(n => !!n.isCompleted).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Все</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filter === "all" ? "bg-slate-200 text-slate-800" : "bg-slate-200 text-slate-600"}`}>
              {db.notes.length}
            </span>
          </button>
        </div>

        <div className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider">
          Показано: {filteredNotes.length} из {db.notes.length}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-100" id="add-note-modal">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                Новая запись в блокнот
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} onPaste={(e) => handleOnPasteCapture(e, setAttachments)} className="p-5 space-y-4 font-sans">
              <div className="grid grid-cols-1 gap-4 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-slate-500 mb-0.5">Краткое заглавие</label>
                  <input
                    type="text"
                    placeholder="Пример: Позвонить ДС Челябинск в 15:00"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">Содержимое памятки</label>
                  <textarea
                    placeholder="Напишите подробный текст записки..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none h-28 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-0.5">Дата напоминания (опция)</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={e => setReminderDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-0.5">Время напоминания</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={e => setReminderTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isCompletedCheck"
                    checked={isCompleted}
                    onChange={e => setIsCompleted(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isCompletedCheck" className="text-slate-700 font-bold leading-none cursor-pointer">
                    Отметить как «Отработанное» сразу при создании
                  </label>
                </div>

                {/* Attachments */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="block text-slate-500 font-bold">Приложенные материалы (Вложения):</span>
                  
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(att => (
                      <span key={att.id} className="bg-slate-150 border border-slate-200 text-3xs font-mono font-bold p-1 px-2 rounded flex items-center gap-1">
                        {att.fileName}
                        <X className="w-3 h-3 text-red-500 cursor-pointer" onClick={() => setAttachments(prev => prev.filter(f => f.id !== att.id))} />
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
                      className="text-3xs bg-emerald-50 border border-emerald-200 text-emerald-800 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" /> Сделать фото
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
                  Записать заметку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid listing notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="notes-cards-grid">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 font-medium">
            {db.notes.length === 0
              ? "Архив заметок пуст. Создайте первую запись."
              : `Заметки со статусом «${filter === "active" ? "В работе" : "Отработанные"}» не обнаружены.`}
          </div>
        ) : (
          [...filteredNotes]
            .sort((a, b) => {
              // Sort by reminderDate ascending (closest deadline first)
              if (a.reminderDate && !b.reminderDate) return -1;
              if (!a.reminderDate && b.reminderDate) return 1;
              if (a.reminderDate && b.reminderDate) {
                const dateCompare = a.reminderDate.localeCompare(b.reminderDate);
                if (dateCompare !== 0) return dateCompare;
                const timeA = a.reminderTime || "";
                const timeB = b.reminderTime || "";
                return timeA.localeCompare(timeB);
              }
              // Fallback to id descending
              return b.id.localeCompare(a.id);
            })
            .map(note => {
              const hasAlert = note.reminderDate === getTodayStr();

              return (
                <div 
                  key={note.id} 
                  className={`rounded-xl border flex flex-col justify-between overflow-hidden relative transition-all duration-200 hover:shadow-md ${
                    note.isCompleted 
                      ? "border-emerald-250 bg-emerald-50/15 opacity-80 shadow-3xs hover:border-emerald-305" 
                      : "bg-slate-50/90 border-slate-300 shadow-sm hover:border-slate-450"
                  }`} 
                  id={`note-card-${note.id}`}
                >
                  {/* Top reminder ribbon if any */}
                  {note.reminderDate && (
                    <div className={`p-2.5 px-4 text-3xs font-extrabold uppercase tracking-wide flex justify-between items-center ${
                      note.isCompleted
                        ? "bg-emerald-50/50 text-emerald-805"
                        : hasAlert ? "bg-amber-100 text-amber-800 text-extrabold font-sans" : "bg-slate-50 text-slate-500"
                    }`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Срок напоминания:
                      </span>
                      <span className="font-mono">{formatDate(note.reminderDate)} {note.reminderTime || ""}</span>
                    </div>
                  )}

                  {/* Body text content */}
                  <div className="p-5 flex-1 space-y-2.5">
                    <div className="flex justify-between items-start gap-3">
                      <h3 className={`font-bold text-xs leading-relaxed line-clamp-2 pr-16 ${
                        note.isCompleted ? "text-slate-500 line-through decoration-emerald-500/50" : "text-slate-900 border-none"
                      }`}>{note.title}</h3>
                      <div className="flex items-center gap-1 absolute top-3.5 right-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNote(note);
                            setEditTitle(note.title);
                            setEditText(note.text);
                            setEditReminderDate(note.reminderDate || "");
                            setEditReminderTime(note.reminderTime || "");
                            setEditAttachments(note.attachments || []);
                            setEditIsCompleted(!!note.isCompleted);
                          }}
                          className="text-slate-400 hover:text-indigo-650 transition-colors p-1 w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-slate-50 cursor-pointer"
                          title="Редактировать заметку"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Удалить заметку "${note.title}"?`)) {
                              deleteNote(note.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-slate-50 cursor-pointer"
                          title="Удалить заметку"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-3xs leading-relaxed font-semibold whitespace-pre-wrap ${
                      note.isCompleted ? "text-slate-400" : "text-slate-655"
                    }`}>
                      {note.text}
                    </p>

                    {/* Vlozhenya (Attachments) list */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Paperclip className="w-2.5 h-2.5 text-blue-500" /> Вложения ({note.attachments.length}):
                        </span>
                        <div className="grid grid-cols-1 gap-1.5 pt-1">
                          {note.attachments.map(att => {
                            const isImage = att.fileData && (att.fileType === "jpg" || att.fileType === "jpeg" || att.fileType === "png" || att.fileData?.startsWith("data:image"));
                            return (
                              <div key={att.id} className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => att.fileData && setViewerFile(att)}
                                  className="text-[10px] bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-800 hover:text-indigo-900 font-mono font-semibold px-2 py-1 rounded flex items-center gap-1.5 cursor-pointer text-left transition-all"
                                  title="Нажмите для просмотра в браузере"
                                >
                                  <Paperclip className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="underline truncate flex-1">{att.fileName}</span>
                                  <span className="text-slate-400 text-[8px] font-normal font-sans">({att.size || "Снимок"})</span>
                                </button>
                                {isImage && (
                                  <img 
                                    src={att.fileData} 
                                    alt={att.fileName} 
                                    className="w-full max-h-36 object-cover rounded-lg border border-slate-205 mt-0.5 cursor-pointer hover:opacity-90 transition-opacity" 
                                    referrerPolicy="no-referrer"
                                    onClick={() => setViewerFile(att)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick completion toggle footer inside card */}
                  <div className="p-3 px-5 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                      note.isCompleted ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${note.isCompleted ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
                      {note.isCompleted ? "Отработано" : "В работе"}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateNote(note.id, { isCompleted: !note.isCompleted })}
                      className={`text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                        note.isCompleted
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-3xs"
                      }`}
                      title={note.isCompleted ? "Вернуть в «В работе»" : "Пометить как «Отрадовано»"}
                    >
                      {note.isCompleted ? "Вернуть в работу" : "Отработать"}
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Edit Note modal form */}
      {editingNote && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-100" id="edit-note-modal">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Редактирование заметки
              </h3>
              <button onClick={() => setEditingNote(null)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditNoteSubmit} onPaste={(e) => handleOnPasteCapture(e, setEditAttachments)} className="p-5 space-y-4 font-sans">
              <div className="grid grid-cols-1 gap-4 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-slate-500 mb-0.5">Краткое заглавие</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">Содержимое памятки</label>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium outline-none h-28 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-0.5">Дата напоминания (опция)</label>
                    <input
                      type="date"
                      value={editReminderDate}
                      onChange={e => setEditReminderDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-0.5">Время напоминания</label>
                    <input
                      type="time"
                      value={editReminderTime}
                      onChange={e => setEditReminderTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editIsCompletedCheck"
                    checked={editIsCompleted}
                    onChange={e => setEditIsCompleted(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="editIsCompletedCheck" className="text-slate-700 font-bold leading-none cursor-pointer">
                    Заметка отработана (перенести в Отработанные)
                  </label>
                </div>

                {/* Attachments */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="block text-slate-500 font-bold">Приложенные материалы (Вложения):</span>
                  
                  <div className="flex flex-wrap gap-2">
                    {editAttachments.map(att => (
                      <span key={att.id} className="bg-slate-150 border border-slate-200 text-3xs font-mono font-bold p-1 px-2 rounded flex items-center gap-1">
                        {att.fileName}
                        <X className="w-3 h-3 text-red-500 cursor-pointer" onClick={() => setEditAttachments(prev => prev.filter(f => f.id !== att.id))} />
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
                      className="text-3xs bg-emerald-50 border border-emerald-200 text-emerald-800 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" /> Сделать фото
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClipboardPaste(setEditAttachments)}
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
                  onClick={() => setEditingNote(null)}
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
          id="notes-document-viewer"
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
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 active:bg-slate-755 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer font-bold border border-slate-700 hover:border-slate-600"
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
            <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden relative">
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
