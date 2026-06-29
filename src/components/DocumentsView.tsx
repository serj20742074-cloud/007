import { useState } from "react";
import { AppDatabase, RelatedDocument, Task, Meeting, Note, Attachment, TaskStatus, DocType } from "../types";
import { Search, FileText, ChevronRight, MessageSquare, Paperclip, X, Calendar, User, AlignLeft, Info, HelpCircle } from "lucide-react";
import { getTodayStr, formatDate } from "../utils/date";

interface DocumentsViewProps {
  db: AppDatabase;
  onNavigateToTask: (taskId: string) => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  renameAttachment: (attachmentId: string, newName: string) => void;
}

export interface UnifiedDocument {
  id: string;
  number: string;
  title: string;
  type: string;
  date: string;
  description: string;
  source: string;
  attachments: Attachment[];
  relatedTasks: Task[];
  relatedMeetings: Meeting[];
  relatedNotes: Note[];
}

export default function DocumentsView({ db, onNavigateToTask, onNavigateToMeeting, onNavigateToNote, renameAttachment }: DocumentsViewProps) {
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [viewerFile, setViewerFile] = useState<Attachment | null>(null);

  // Dynamic unified documents compiler logic
  // Grabs ALL attachments/manual documents across the app:
  // 1. db.relatedDocuments
  // 2. db.tasks attachments
  // 3. db.taskProgress attachments
  // 4. db.taskStations attachments
  // 5. db.meetings attachments
  // 6. db.notes attachments
  // Matches them bidirectionally by references and keywords.
  const compileUnifiedDocuments = (): UnifiedDocument[] => {
    const list: UnifiedDocument[] = [];

    // Helper to check if a document number or title matches search
    const hasSearchTerm = (text: string, term: string) => 
      text.toLowerCase().includes(term.toLowerCase());

    // 1. Manual Documents from the registry
    db.relatedDocuments.forEach(rd => {
      // Find matching tasks, meetings, notes
      const relatedTasks = db.tasks.filter(t => t.id === rd.taskId || t.docBasisNumber === rd.number);
      const relatedMeetings = db.meetings.filter(m => 
        m.description.toLowerCase().includes(rd.number.toLowerCase()) || 
        m.theme.toLowerCase().includes(rd.number.toLowerCase())
      );
      const relatedNotes = db.notes.filter(n => 
        n.text.toLowerCase().includes(rd.number.toLowerCase()) || 
        n.title.toLowerCase().includes(rd.number.toLowerCase())
      );

      list.push({
        id: rd.id,
        number: rd.number,
        title: `Реестр: Документ основание № ${rd.number}`,
        type: rd.type,
        date: rd.date,
        description: rd.description || "Зарегистрирован в реестре документов.",
        source: "Реестр документов",
        attachments: rd.attachments || [],
        relatedTasks,
        relatedMeetings,
        relatedNotes
      });
    });

    // 2. Task Cards Attachments
    db.tasks.forEach(t => {
      if (t.attachments && t.attachments.length > 0) {
        // If has docBasisNumber, let's look if already in manual docs list to merge
        const existing = list.find(d => d.number === t.docBasisNumber && t.docBasisNumber);
        if (existing) {
          if (!existing.relatedTasks.some(rt => rt.id === t.id)) {
            existing.relatedTasks.push(t);
          }
          t.attachments.forEach(att => {
            if (!existing.attachments.some(ea => ea.fileName === att.fileName)) {
              existing.attachments.push(att);
            }
          });
        } else {
          const relatedMeetings = db.meetings.filter(m => 
            m.description.toLowerCase().includes(t.id.toLowerCase()) || 
            m.theme.toLowerCase().includes(t.id.toLowerCase()) ||
            (t.docBasisNumber && (m.description.toLowerCase().includes(t.docBasisNumber.toLowerCase()) || m.theme.toLowerCase().includes(t.docBasisNumber.toLowerCase())))
          );
          const relatedNotes = db.notes.filter(n => 
            n.text.toLowerCase().includes(t.id.toLowerCase()) || 
            n.title.toLowerCase().includes(t.id.toLowerCase()) ||
            (t.docBasisNumber && (n.text.toLowerCase().includes(t.docBasisNumber.toLowerCase()) || n.title.toLowerCase().includes(t.docBasisNumber.toLowerCase())))
          );

          list.push({
            id: `doc-task-${t.id}`,
            number: t.docBasisNumber || `Поручение ${t.id}`,
            title: `Поручение: ${t.id} (Приложение)`,
            type: "Вложения поручения",
            date: t.docBasisDate || t.dateGiven,
            description: `Материалы, приложенные к карточке активного поручения руководителя: "${t.title}"`,
            source: "Карточка поручения",
            attachments: t.attachments,
            relatedTasks: [t],
            relatedMeetings,
            relatedNotes
          });
        }
      }
    });

    // 3. Task Progress Updates (Отчеты специалистов)
    db.taskProgress.forEach(tp => {
      if (tp.attachments && tp.attachments.length > 0) {
        const parentTask = db.tasks.find(t => t.id === tp.taskId);
        const relatedTasks = parentTask ? [parentTask] : [];
        
        list.push({
          id: `doc-progress-${tp.id}`,
          number: parentTask ? `Доклад к ${parentTask.id}` : "Доклад исполнителя",
          title: `Доклад: Отчетные материалы к поручению`,
          type: "Отчетный материал",
          date: tp.date.split(" ")[0],
          description: `Исполнительский материал доклада. Комментарий исполнителя: "${tp.text}"`,
          source: "Доклад исполнителя",
          attachments: tp.attachments,
          relatedTasks,
          relatedMeetings: [],
          relatedNotes: []
        });
      }
    });

    // 4. Station State Uploads (Отчеты по станциям)
    db.taskStations.forEach(ts => {
      if (ts.attachments && ts.attachments.length > 0) {
        const parentTask = db.tasks.find(t => t.id === ts.taskId);
        const station = db.stations.find(s => s.code === ts.stationId);
        const relatedTasks = parentTask ? [parentTask] : [];

        list.push({
          id: `doc-station-${ts.taskId}-${ts.stationId}`,
          number: `Отчет ДС ${station ? station.name : ts.stationId}`,
          title: `ДС Отчет: ${station ? station.name : ts.stationId}`,
          type: "Отчет ДС",
          date: ts.reportDate || getTodayStr(),
          description: `Отчетный документ о выполнении массовой проверки станцией. Комментарий ДС: "${ts.comment}"`,
          source: "Отчет со станции",
          attachments: ts.attachments,
          relatedTasks,
          relatedMeetings: [],
          relatedNotes: []
        });
      }
    });

    // 5. Meetings (Совещания / Селекторы)
    db.meetings.forEach(m => {
      if (m.attachments && m.attachments.length > 0) {
        // Find tasks referencing meeting details
        const relatedTasks = db.tasks.filter(t => 
          t.text.toLowerCase().includes(m.theme.toLowerCase()) || 
          t.title.toLowerCase().includes(m.theme.toLowerCase()) ||
          t.docBasisNumber.toLowerCase().includes(m.theme.toLowerCase())
        );
        // Find notes referencing meeting
        const relatedNotes = db.notes.filter(n => 
          n.text.toLowerCase().includes(m.theme.toLowerCase()) || 
          n.title.toLowerCase().includes(m.theme.toLowerCase())
        );

        list.push({
          id: `doc-meeting-${m.id}`,
          number: `Совещание от ${m.date}`,
          title: `Селектор: ${m.theme}`,
          type: "Материалы совещания",
          date: m.date,
          description: `Пакет рабочих материалов и указаний для совещания под председательством: ${m.leader}. Повестка: "${m.description}"`,
          source: "Совещание",
          attachments: m.attachments,
          relatedTasks,
          relatedMeetings: [m],
          relatedNotes
        });
      }
    });

    // 6. Notes (Личный Блокнот)
    db.notes.forEach(n => {
      if (n.attachments && n.attachments.length > 0) {
        // Search tasks matching keywords of note title
        const relatedTasks = db.tasks.filter(t => 
          t.text.toLowerCase().includes(n.title.toLowerCase()) || 
          t.title.toLowerCase().includes(n.title.toLowerCase())
        );
        const relatedMeetings = db.meetings.filter(m => 
          m.theme.toLowerCase().includes(n.title.toLowerCase()) || 
          m.description.toLowerCase().includes(n.title.toLowerCase())
        );

        list.push({
          id: `doc-note-${n.id}`,
          number: `Блокнот: ${n.title}`,
          title: `Блокнот: ${n.title}`,
          type: "Заметка",
          date: n.reminderDate || "Блокнот",
          description: `Личные рабочие материалы руководителя. Текст блокнота: "${n.text}"`,
          source: "Личный блокнот",
          attachments: n.attachments,
          relatedTasks,
          relatedMeetings,
          relatedNotes: [n]
        });
      }
    });

    return list;
  };

  const allDocuments = compileUnifiedDocuments();

  // Search filter across: Doc Number, Description, File Name, Source, or Type
  const matchedDocs = allDocuments.filter(doc => {
    if (!docSearchQuery) return true;
    const q = docSearchQuery.toLowerCase();
    const matchesNumber = doc.number.toLowerCase().includes(q);
    const matchesDescription = doc.description.toLowerCase().includes(q);
    const matchesSource = doc.source.toLowerCase().includes(q);
    const matchesType = doc.type.toLowerCase().includes(q);
    const matchesFilename = doc.attachments.some(att => att.fileName.toLowerCase().includes(q));
    const matchesTitle = doc.title.toLowerCase().includes(q);
    
    return matchesNumber || matchesDescription || matchesSource || matchesType || matchesFilename || matchesTitle;
  });

  return (
    <div className="space-y-6" id="documents-view-container text-left">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Единый реестр документов</h1>
        <p className="text-slate-500 font-medium text-sm">Центральная база всех файлов-оснований, телеграмм, инструкций и материалов, загруженных в любых формах</p>
      </div>

      {/* Global Document Search bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          Интеллектуальный поиск по всей базе
        </h3>
        <p className="text-slate-400 text-3xs font-medium leading-relaxed">
          Индекс автоматически сканирует номера документов оснований (ТЛГ, приказы), названия файлов, доклады исполнителей со станций, записи в блокнотах и повестки совещаний. Вся информация взаимосвязана.
        </p>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Введите номер, тему («селектор», «ТРА»), название файла («.pdf», «сигнализация») или источник..."
            value={docSearchQuery}
            onChange={(e) => setDocSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium placeholder-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 gap-6" id="documents-search-results">
        {matchedDocs.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs font-semibold space-y-2">
            <Info className="w-8 h-8 text-slate-300 mx-auto" strokeWidth={1.5} />
            <p>Ни один документ, приложенный файл или рабочий материал не соответствует запросу.</p>
          </div>
        ) : (
          matchedDocs.map(doc => {
            return (
              <div key={doc.id} className="bg-slate-50/90 border border-slate-300 shadow-sm rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-450 transition-all duration-200" id={`doc-card-${doc.id}`}>
                
                {/* Header of document item */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-150 flex flex-wrap justify-between items-center gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="bg-slate-200 text-slate-800 text-4xs px-2.5 py-1 rounded font-black uppercase tracking-wide">
                      {doc.type}
                    </span>
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-4xs px-2 py-0.5 rounded font-bold">
                      Источник: {doc.source}
                    </span>
                    <h3 className="font-extrabold text-slate-900 border-none inline">{doc.number}</h3>
                  </div>
                  <span className="text-slate-500 text-xs font-mono font-bold">От {formatDate(doc.date)}</span>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-left">
                  
                  {/* Left Column: Description & File Attachments with click to view */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-1">Сведения о документе</span>
                      <p className="text-slate-800 font-semibold leading-relaxed bg-slate-50/40 p-3.5 rounded-lg border border-slate-150">
                        {doc.description || "Описание к документу отсутствует."}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-1.5">
                        Приложенные файлы ({doc.attachments.length})
                      </span>
                      {doc.attachments.length === 0 ? (
                        <p className="text-slate-400 text-3xs font-medium italic">Документ зарегистрирован ссылкой (физические файлы не приложены)</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 pt-0.5">
                          {doc.attachments.map(att => (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => att.fileData && setViewerFile(att)}
                              className={`rounded-lg border p-2 flex items-center justify-between text-left font-semibold font-mono transition-all outline-none cursor-pointer ${
                                att.fileData 
                                  ? "bg-slate-50 border-slate-200 text-slate-850 hover:bg-slate-100 hover:border-slate-300"
                                  : "bg-slate-50/20 border-slate-100 text-slate-400 cursor-not-allowed"
                              }`}
                              title={att.fileData ? "Просмотреть файл прямо в браузере" : "Файл не загружен физически"}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className={`text-[10px] truncate ${att.fileData ? "underline text-blue-900" : ""}`}>{att.fileName}</span>
                              </div>
                              <span className="text-[8px] font-sans font-normal text-slate-400 shrink-0 ml-1">
                                {att.fileData ? `Открыть (${att.size || "офлайн"})` : "офлайн"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: ALL Connected Tasks, Meetings, and Notes Attached! */}
                  <div className="space-y-4">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                      Привязанные связанные объекты ({doc.relatedTasks.length + doc.relatedMeetings.length + doc.relatedNotes.length})
                    </span>

                    {/* Check if no connections at all */}
                    {doc.relatedTasks.length === 0 && doc.relatedMeetings.length === 0 && doc.relatedNotes.length === 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg text-center text-slate-400 text-3xs italic font-medium">
                        Связи не зафиксированы. Измените карточки или добавьте поручение по этому номеру.
                      </div>
                    )}

                    {/* List connected tasks */}
                    {doc.relatedTasks.map(t => (
                      <div key={t.id} className="p-3 bg-blue-50/25 border border-blue-105 rounded-lg space-y-1.5 text-xs">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[9px] bg-blue-600 text-white font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide font-sans">
                            Поручение
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                            t.status === TaskStatus.Completed ? "bg-emerald-100 text-emerald-800" :
                            t.status === TaskStatus.Overdue ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <h4 
                          onClick={() => onNavigateToTask(t.id)}
                          className="font-bold text-slate-900 border-none hover:text-blue-600 cursor-pointer text-[11px] leading-snug underline"
                          title="Нажмите, чтобы перейти к карточке поручения"
                        >
                          [{t.id}] {t.title}
                        </h4>
                        <p className="text-3xs text-slate-500 leading-normal line-clamp-2">{t.text}</p>
                      </div>
                    ))}

                    {/* List connected meetings */}
                    {doc.relatedMeetings.map(m => (
                      <div key={m.id} className="p-3 bg-indigo-50/25 border border-indigo-105 rounded-lg space-y-1.5 text-xs">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[9px] bg-indigo-600 text-white font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide font-sans">
                            Селекторное Совещание
                          </span>
                          <span className="text-mono text-slate-500 font-bold text-[9px]">{formatDate(m.date)} {m.time}</span>
                        </div>
                        <h4 
                          onClick={() => onNavigateToMeeting && onNavigateToMeeting(m.id)}
                          className={`font-extrabold text-slate-900 leading-snug border-none text-[11px] ${
                            onNavigateToMeeting ? "hover:text-indigo-600 cursor-pointer underline decoration-indigo-300" : ""
                          }`}
                          title={onNavigateToMeeting ? "Нажмите, чтобы перейти к совещанию" : undefined}
                        >
                          {m.theme}
                        </h4>
                        <p className="text-3xs text-slate-500 font-medium leading-relaxed">
                          Председатель: {m.leader} | Повестка: {m.description}
                        </p>
                      </div>
                    ))}

                    {/* List connected notes */}
                    {doc.relatedNotes.map(n => (
                      <div key={n.id} className="p-3 bg-emerald-50/25 border border-emerald-105 rounded-lg space-y-1.5 text-xs">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[9px] bg-emerald-600 text-white font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide font-sans">
                            Личный Блокнот
                          </span>
                          {n.reminderDate && <span className="text-mono text-slate-450 font-bold text-[9px]">Напоминание: {formatDate(n.reminderDate)}</span>}
                        </div>
                        <h4 
                          onClick={() => onNavigateToNote && onNavigateToNote(n.id)}
                          className={`font-extrabold text-slate-900 leading-snug border-none text-[11px] ${
                            onNavigateToNote ? "hover:text-emerald-700 cursor-pointer underline decoration-emerald-300" : ""
                          }`}
                          title={onNavigateToNote ? "Нажмите, чтобы открыть эту заметку" : undefined}
                        >
                          {n.title}
                        </h4>
                        <p className="text-3xs text-slate-650 leading-relaxed italic">
                          « {n.text} »
                        </p>
                      </div>
                    ))}

                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Unified Document Viewer Modal inside Browser window */}
      {viewerFile && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-55 flex items-center justify-center p-4 font-sans text-left"
          id="global-document-viewer"
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
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-755 p-1.5 rounded-lg cursor-pointer"
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
                        <div className="text-center py-2 shrink-0 space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 animate-none">
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
                              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white text-[11px] font-black py-2.5 px-4 rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5 animate-none"
                            >
                              🖥️ Открыть во весь экран в браузере (без скачивания)
                            </button>
                            <a 
                              href={viewerFile.fileData} 
                              download={viewerFile.fileName}
                              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-755 text-white text-[11px] font-bold py-2.5 px-4 rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5"
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
                        <p className="text-xs text-slate-400 leading-relaxed font-sans text-center">
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
