import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import { 
  AppDatabase, 
  Task, 
  TaskType, 
  TaskStatus, 
  ImportanceLevel, 
  DocType, 
  RelatedDocument, 
  TaskProgress, 
  TaskStationState,
  Attachment 
} from "../types";
import { 
  Search, 
  Filter, 
  Plus, 
  Check, 
  X, 
  FileText, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Paperclip, 
  MessageSquare, 
  Briefcase, 
  CheckSquare, 
  ChevronRight, 
  Trash2, 
  Upload, 
  Info,
  Calendar,
  AlertCircle,
  Camera,
  Pencil,
  Clipboard
} from "lucide-react";
import CameraModal from "./CameraModal";
import { getTodayStr, formatDate, getTaskBgClass } from "../utils/date";

interface TasksViewProps {
  db: AppDatabase;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  // State modifications
  addTask: (task: Omit<Task, "id" | "status" | "attachments">, initialAttachments: Attachment[], selectedStationIds?: string[]) => string;
  updateTask: (id: string, updated: Partial<Task>, selectedStationIds?: string[]) => void;
  deleteTask: (id: string) => void;
  addTaskAttachment: (taskId: string, attachment: Attachment) => void;
  deleteDraftFile: (taskId: string, attachmentId: string) => void;
  addRelatedDocument: (doc: Omit<RelatedDocument, "id">) => void;
  deleteRelatedDocument: (id: string) => void;
  addTaskProgress: (prog: Omit<TaskProgress, "id">) => void;
  deleteTaskProgress: (id: string) => void;
  updateTaskStationState: (taskId: string, stationId: string, updated: Partial<TaskStationState>) => void;
  renameAttachment: (attachmentId: string, newName: string) => void;
}

export default function TasksView({
  db,
  selectedTaskId,
  onSelectTask,
  addTask,
  updateTask,
  deleteTask,
  addTaskAttachment,
  deleteDraftFile,
  addRelatedDocument,
  deleteRelatedDocument,
  addTaskProgress,
  deleteTaskProgress,
  updateTaskStationState,
  renameAttachment
}: TasksViewProps) {
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [filterManager, setFilterManager] = useState<string>("ALL");
  const [filterImportance, setFilterImportance] = useState<string>("ALL");
  const [filterDeadline, setFilterDeadline] = useState<string>("ALL"); // ALL, TODAY, OVERDUE, WEEK
  const [showFilters, setShowFilters] = useState(false);

  // Modal / Creation flow states
  const [isCreating, setIsCreating] = useState(false);

  // Form Fields for new Task
  const [newType, setNewType] = useState<TaskType>(TaskType.Individual);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [newCategoryId, setNewCategoryId] = useState(db.categories[0]?.id || "");
  const [newSourceId, setNewSourceId] = useState(db.sources[0]?.id || "");
  const [newManagerId, setNewManagerId] = useState(db.managers[0]?.id || "");
  const [newDocBasisNumber, setNewDocBasisNumber] = useState("");
  const [newDocBasisDate, setNewDocBasisDate] = useState("");
  const [newDateGiven, setNewDateGiven] = useState(getTodayStr());

  const getOffsetDateStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${dy}`;
  };

  const todayLabelDate = new Date().toLocaleDateString("ru-RU");
  const nextWeekLabelDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU");

  const [newInfoDeadline, setNewInfoDeadline] = useState(getOffsetDateStr(1));
  const [newExecuteDeadline, setNewExecuteDeadline] = useState(getOffsetDateStr(10));
  const [newImportance, setNewImportance] = useState<ImportanceLevel>(ImportanceLevel.Normal);
  const [newSpecialControl, setNewSpecialControl] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newAssignments, setNewAssignments] = useState<string[]>([]); // list of Employee IDs
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);

  // Editing states for Task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editType, setEditType] = useState<TaskType>(TaskType.Individual);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editSourceId, setEditSourceId] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editDocBasisNumber, setEditDocBasisNumber] = useState("");
  const [editDocBasisDate, setEditDocBasisDate] = useState("");
  const [editDateGiven, setEditDateGiven] = useState("");
  const [editInfoDeadline, setEditInfoDeadline] = useState("");
  const [editExecuteDeadline, setEditExecuteDeadline] = useState("");
  const [editImportance, setEditImportance] = useState<ImportanceLevel>(ImportanceLevel.Normal);
  const [editSpecialControl, setEditSpecialControl] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editAssignments, setEditAssignments] = useState<string[]>([]);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [newSelectedStations, setNewSelectedStations] = useState<string[]>(db.stations.map(st => st.code));
  const [editSelectedStations, setEditSelectedStations] = useState<string[]>([]);

  // Selected task references
  const task = db.tasks.find(t => t.id === selectedTaskId);

  // Detailed view internal state (to edit station, report progress, add document)
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  
  // Station Progress Form State
  const [stationStatus, setStationStatus] = useState<TaskStatus>(TaskStatus.InWork);
  const [stationComment, setStationComment] = useState("");
  const [stationDate, setStationDate] = useState(getTodayStr());
  const [stationAttachments, setStationAttachments] = useState<Attachment[]>([]);

  // Add Progress form
  const [progressText, setProgressText] = useState("");
  const [progressAttachments, setProgressAttachments] = useState<Attachment[]>([]);

  // Add Related Document form
  const [relType, setRelType] = useState<DocType>(DocType.Telegram);
  const [relNumber, setRelNumber] = useState("");
  const [relDate, setRelDate] = useState(getTodayStr());
  const [relDescription, setRelDescription] = useState("");
  const [relAttachments, setRelAttachments] = useState<Attachment[]>([]);

  // File system simulated input triggers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressFileInputRef = useRef<HTMLInputElement>(null);
  const relationFileInputRef = useRef<HTMLInputElement>(null);
  const stationFileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"task" | "progress" | "station" | "related">("task");
  const [viewerFile, setViewerFile] = useState<Attachment | null>(null);
  const setImageViewerUrl = (url: string | null) => {
    if (url) {
      setViewerFile({
        id: "legacy",
        fileName: "Изображение",
        fileType: "jpg",
        fileData: url
      });
    } else {
      setViewerFile(null);
    }
  };

  const handleCameraCapture = (fileName: string, dataUrl: string) => {
    const newAtt: Attachment = {
      id: "att-" + Date.now(),
      fileName: fileName,
      fileType: "jpg",
      fileData: dataUrl,
      size: "Снимок"
    };

    if (cameraTarget === "task") {
      setNewAttachments(prev => [...prev, newAtt]);
    } else if (cameraTarget === "progress") {
      setProgressAttachments(prev => [...prev, newAtt]);
    } else if (cameraTarget === "station") {
      setStationAttachments(prev => [...prev, newAtt]);
    } else if (cameraTarget === "related") {
      setRelAttachments(prev => [...prev, newAtt]);
    }
  };

  // Pasting screenshots from clipboard
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
        alert("Изображение/скриншот не обнаружено в буфере обмена. Сделайте скриншот (например, коснувшись тремя пальцами или кнопками планшета) и скопируйте его, после чего попробуйте снова.");
      }
    } catch (err) {
      alert("Не удалось получить доступ к буферу обмена. Нажмите Ctrl+V внутри полей ввода для вставки скриншота вручную.");
    }
  };

  // Keyboard and browser-level default onPaste handler
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

  // Automatically select first task if nothing selected and screen space permits
  useEffect(() => {
    if (!selectedTaskId && db.tasks.length > 0) {
      onSelectTask(db.tasks[0].id);
    }
  }, []);

  // Filter logic
  const filteredTasks = db.tasks.filter(t => {
    // 1. Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchText = t.text.toLowerCase().includes(q);
      const matchNum = t.id.toLowerCase().includes(q);
      const matchDoc = t.docBasisNumber.toLowerCase().includes(q);
      
      const categoryName = db.categories.find(c => c.id === t.categoryId)?.name.toLowerCase() || "";
      const sourceName = db.sources.find(s => s.id === t.sourceId)?.name.toLowerCase() || "";
      const managerName = db.managers.find(m => m.id === t.managerId)?.fullName.toLowerCase() || "";

      const matchMeta = categoryName.includes(q) || sourceName.includes(q) || managerName.includes(q);

      if (!matchTitle && !matchText && !matchNum && !matchDoc && !matchMeta) {
        return false;
      }
    }

    // 2. Type Filter
    if (filterType !== "ALL" && t.type !== filterType) return false;

    // 3. Status Filter
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;

    // 4. Category Filter
    if (filterCategory !== "ALL" && t.categoryId !== filterCategory) return false;

    // 5. Source Filter
    if (filterSource !== "ALL" && t.sourceId !== filterSource) return false;

    // 6. Manager Filter
    if (filterManager !== "ALL" && t.managerId !== filterManager) return false;

    // 7. Importance Filter
    if (filterImportance !== "ALL" && t.importance !== filterImportance) return false;

    // 8. Deadline Filter
    if (filterDeadline !== "ALL") {
      const today = getTodayStr();
      if (filterDeadline === "TODAY") {
        return t.executeDeadline === today || t.infoDeadline === today;
      } else if (filterDeadline === "OVERDUE") {
        return t.status === TaskStatus.Overdue || (t.status !== TaskStatus.Completed && t.executeDeadline < today);
      } else if (filterDeadline === "WEEK") {
        // Simple string comparison for standard period range
        const todayDate = new Date();
        const nextWeekDate = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const ny = nextWeekDate.getFullYear();
        const nm = String(nextWeekDate.getMonth() + 1).padStart(2, "0");
        const nd = String(nextWeekDate.getDate()).padStart(2, "0");
        const nextWeek = `${ny}-${nm}-${nd}`;
        return t.executeDeadline >= today && t.executeDeadline <= nextWeek;
      }
    }

    return true;
  });

  // Simulated File upload helpers with Base64 serialization for all files (offline persistence)
  const handleSimulatedFileUpload = (
    e: ChangeEvent<HTMLInputElement>, 
    setFilesState: React.Dispatch<React.SetStateAction<Attachment[]>>
  ) => {
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
        setFilesState(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Immediate upload and add to active selected task details
  const triggerImmediateAttachmentUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (task && e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const mockAttachment: Attachment = {
        id: "att-" + Date.now(),
        fileName: file.name,
        fileType: file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase() || "doc",
        size: Math.round(file.size / 1024) + " КБ"
      };

      const reader = new FileReader();
      reader.onloadend = () => {
        mockAttachment.fileData = reader.result as string;
        addTaskAttachment(task.id, mockAttachment);
      };
      reader.readAsDataURL(file);
    }
  };

  // Task creation handler
  const handleCreateTaskSubmit = (e: FormEvent) => {
    e.preventDefault();

    const createdId = addTask({
      type: newType,
      title: newTitle.trim() || "Без наименования",
      text: newText.trim() || "Описание поручения отсутствует",
      categoryId: newCategoryId || (db.categories[0]?.id || ""),
      sourceId: newSourceId || (db.sources[0]?.id || ""),
      managerId: newManagerId || (db.managers[0]?.id || ""),
      docBasisNumber: newDocBasisNumber,
      docBasisDate: newDocBasisDate,
      dateGiven: newDateGiven || getTodayStr(),
      infoDeadline: newInfoDeadline || getOffsetDateStr(1),
      executeDeadline: newExecuteDeadline || getOffsetDateStr(10),
      importance: newImportance,
      specialControl: newSpecialControl || (newImportance === ImportanceLevel.SpecialControl),
      note: newNote,
      assignments: newType === TaskType.Individual ? newAssignments : undefined
    }, newAttachments, newType === TaskType.Massive ? newSelectedStations : undefined);

    // Reset fields
    setNewTitle("");
    setNewText("");
    setNewDocBasisNumber("");
    setNewNote("");
    setNewAssignments([]);
    setNewAttachments([]);
    setNewSelectedStations(db.stations.map(st => st.code)); // reset to all
    setIsCreating(false);
    onSelectTask(createdId);
  };

  const startEditingTask = (t: Task) => {
    setEditingTask(t);
    setEditType(t.type);
    setEditTitle(t.title);
    setEditText(t.text);
    setEditCategoryId(t.categoryId || (db.categories[0]?.id || ""));
    setEditSourceId(t.sourceId || (db.sources[0]?.id || ""));
    setEditManagerId(t.managerId || (db.managers[0]?.id || ""));
    setEditDocBasisNumber(t.docBasisNumber || "");
    setEditDocBasisDate(t.docBasisDate || "");
    setEditDateGiven(t.dateGiven || getTodayStr());
    setEditInfoDeadline(t.infoDeadline || getOffsetDateStr(1));
    setEditExecuteDeadline(t.executeDeadline || getOffsetDateStr(10));
    setEditImportance(t.importance || ImportanceLevel.Normal);
    setEditSpecialControl(t.specialControl || false);
    setEditNote(t.note || "");
    setEditAssignments(t.assignments || []);
    setEditAttachments(t.attachments || []);

    const associatedStations = db.taskStations
      .filter(ts => ts.taskId === t.id)
      .map(ts => ts.stationId);
    setEditSelectedStations(associatedStations.length > 0 ? associatedStations : db.stations.map(st => st.code));
  };

  const handleEditTaskSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    updateTask(editingTask.id, {
      type: editType,
      title: editTitle.trim() || "Без наименования",
      text: editText.trim() || "Описание поручения отсутствует",
      categoryId: editCategoryId || (db.categories[0]?.id || ""),
      sourceId: editSourceId || (db.sources[0]?.id || ""),
      managerId: editManagerId || (db.managers[0]?.id || ""),
      docBasisNumber: editDocBasisNumber,
      docBasisDate: editDocBasisDate,
      dateGiven: editDateGiven || getTodayStr(),
      infoDeadline: editInfoDeadline || getOffsetDateStr(1),
      executeDeadline: editExecuteDeadline || getOffsetDateStr(10),
      importance: editImportance,
      specialControl: editSpecialControl || (editImportance === ImportanceLevel.SpecialControl),
      note: editNote,
      assignments: editType === TaskType.Individual ? editAssignments : undefined,
      attachments: editAttachments
    }, editType === TaskType.Massive ? editSelectedStations : undefined);

    setEditingTask(null);
  };

  // Add Progress details
  const submitProgressReport = (e: FormEvent) => {
    e.preventDefault();
    if (!task || !progressText.trim()) return;

    addTaskProgress({
      taskId: task.id,
      date: `${getTodayStr()} ${new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })}`,
      text: progressText,
      attachments: progressAttachments
    });

    // Also update main task status to ReportReceived if it is individual & wasn't Completed yet
    if (task.type === TaskType.Individual && task.status !== TaskStatus.Completed) {
      updateTask(task.id, { status: TaskStatus.ReportReceived });
    }

    setProgressText("");
    setProgressAttachments([]);
  };

  // Add Related Document
  const submitRelatedDoc = (e: FormEvent) => {
    e.preventDefault();
    if (!task || !relNumber) return;

    addRelatedDocument({
      taskId: task.id,
      type: relType,
      number: relNumber,
      date: relDate,
      description: relDescription,
      attachments: relAttachments
    });

    setRelNumber("");
    setRelDescription("");
    setRelAttachments([]);
  };

  // Select Station progress update
  const startEditingStation = (ts: TaskStationState) => {
    setEditingStationId(ts.stationId);
    setStationStatus(ts.status);
    setStationComment(ts.comment || "");
    setStationDate(ts.reportDate || getTodayStr());
    setStationAttachments(ts.attachments || []);
  };

  const saveStationProgress = () => {
    if (!task) return;
    updateTaskStationState(task.id, editingStationId!, {
      status: stationStatus,
      comment: stationComment,
      reportDate: stationStatus === TaskStatus.Completed || stationStatus === TaskStatus.ReportReceived ? stationDate : undefined,
      attachments: stationAttachments
    });
    setEditingStationId(null);
    setStationAttachments([]);
  };

  const handleToggleStationCompleted = (taskId: string, stationId: string, currentStatus: TaskStatus) => {
    const isCompletedNow = currentStatus === TaskStatus.Completed;
    const st = db.stations.find(s => s.code === stationId);
    
    if (!isCompletedNow) {
      // Mark as Completed! Automatically gather who (chief) and the date
      const chiefName = st ? st.chief : "Не указан";
      const chiefPhone = st?.phone ? `, тел. ${st.phone}` : "";
      const automaticComment = `Исполнено. Отчет предоставил: Начальник станции ${chiefName}${chiefPhone}`;
      
      updateTaskStationState(taskId, stationId, {
        status: TaskStatus.Completed,
        comment: automaticComment,
        reportDate: getTodayStr()
      });
    } else {
      // Toggle back to NotStarted
      updateTaskStationState(taskId, stationId, {
        status: TaskStatus.NotStarted,
        comment: "",
        reportDate: undefined
      });
    }
  };

  // Automated indicators for massive task
  const getMassiveTaskStats = (taskId: string) => {
    const states = db.taskStations.filter(ts => ts.taskId === taskId);
    const total = db.stations.length;
    const completed = states.filter(ts => ts.status === TaskStatus.Completed).length;
    const reportReceived = states.filter(ts => ts.status === TaskStatus.ReportReceived).length;
    const notExecuted = total - completed - reportReceived;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, reportReceived, notExecuted, pct, states };
  };

  const massStats = task && task.type === TaskType.Massive ? getMassiveTaskStats(task.id) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full" id="tasks-view-grid">
      {/* 1. Left hand: Master Task List (5 columns) */}
      <div className={`lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px] ${
        selectedTaskId ? "hidden lg:flex" : "flex"
      }`}>
        
        {/* Compact search bar header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex gap-2 justify-between items-center">
            <h2 className="font-bold text-slate-800 text-base">Реестр поручений</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Создать
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по поручениям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-9 pr-8 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <X 
                className="w-4 h-4 absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer" 
                onClick={() => setSearchQuery("")}
              />
            )}
          </div>

          {/* Filter toggle and status badge quick filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-xs p-1.5 px-2.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
                showFilters ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Фильтры {(filterType !== "ALL" || filterStatus !== "ALL" || filterCategory !== "ALL" || filterSource !== "ALL" || filterManager !== "ALL" || filterImportance !== "ALL" || filterDeadline !== "ALL") && "•"}
            </button>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-205 py-1 px-2 rounded-lg font-semibold text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="ALL">Все статусы</option>
              <option value={TaskStatus.NotStarted}>Не начато</option>
              <option value={TaskStatus.InWork}>В работе</option>
              <option value={TaskStatus.ReportReceived}>Отчет получен</option>
              <option value={TaskStatus.Completed}>Исполнено</option>
              <option value={TaskStatus.Overdue}>Просрочено</option>
            </select>
          </div>

          {/* Expanded filters panel */}
          {showFilters && (
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3 space-y-2 mt-2" id="expanded-filters-panel">
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block mb-1 text-slate-500">Тип</label>
                  <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1 rounded font-medium focus:outline-none"
                  >
                    <option value="ALL">Все</option>
                    <option value={TaskType.Individual}>Индивидуальные</option>
                    <option value={TaskType.Massive}>Массовые</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-500">Важность</label>
                  <select 
                    value={filterImportance} 
                    onChange={e => setFilterImportance(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1 rounded font-medium focus:outline-none"
                  >
                    <option value="ALL">Все</option>
                    <option value={ImportanceLevel.Normal}>Обычное</option>
                    <option value={ImportanceLevel.Important}>Важное</option>
                    <option value={ImportanceLevel.Urgent}>Срочное</option>
                    <option value={ImportanceLevel.SpecialControl}>Особый контроль</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-500">Категория</label>
                  <select 
                    value={filterCategory} 
                    onChange={e => setFilterCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1 rounded font-medium focus:outline-none text-ellipsis"
                  >
                    <option value="ALL">Все</option>
                    {db.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-500">Руководитель</label>
                  <select 
                    value={filterManager} 
                    onChange={e => setFilterManager(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1 rounded font-medium focus:outline-none text-ellipsis"
                  >
                    <option value="ALL">Все</option>
                    {db.managers.map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block mb-1 text-slate-500">Фильтр по срокам</label>
                  <select 
                    value={filterDeadline} 
                    onChange={e => setFilterDeadline(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1.5 rounded font-medium focus:outline-none"
                  >
                    <option value="ALL">Все сроки</option>
                    <option value="TODAY">Дедлайн сегодня ({todayLabelDate})</option>
                    <option value="OVERDUE">Задержаны / Просрочены</option>
                    <option value="WEEK">Истекают на этой неделе (до {nextWeekLabelDate})</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setFilterType("ALL");
                    setFilterStatus("ALL");
                    setFilterCategory("ALL");
                    setFilterSource("ALL");
                    setFilterManager("ALL");
                    setFilterImportance("ALL");
                    setFilterDeadline("ALL");
                  }}
                  className="text-amber-700 bg-amber-50 hover:bg-amber-100 text-3xs font-extrabold uppercase tracking-wide px-2 py-1 rounded cursor-pointer"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic tasks list container */}
        <div className="flex-1 overflow-y-auto bg-slate-100/60 p-3 space-y-3" id="tasks-list-scrollable">
          {filteredTasks.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-semibold bg-white rounded-xl border border-slate-200 shadow-xs">
              Поручений по заданным критериям не найдено.
            </div>
          ) : (
            filteredTasks.map(t => {
              const isSelected = t.id === selectedTaskId;
              const overdue = t.status === TaskStatus.Overdue;

              // Left accent line colors based on severity and status
              let accentClass = "border-l-4 border-l-slate-400";
              if (overdue || t.status === TaskStatus.Overdue) {
                accentClass = "border-l-4 border-l-rose-500";
              } else if (t.importance === ImportanceLevel.Urgent) {
                accentClass = "border-l-4 border-l-red-500";
              } else if (t.specialControl) {
                accentClass = "border-l-4 border-l-indigo-600";
              } else if (t.importance === ImportanceLevel.Important) {
                accentClass = "border-l-4 border-l-amber-500";
              } else if (t.status === TaskStatus.Completed) {
                accentClass = "border-l-4 border-l-emerald-500";
              }

              const bgClass = getTaskBgClass(t.executeDeadline, t.status);

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t.id)}
                  id={`task-item-${t.id}`}
                  className={`p-4 cursor-pointer transition-all rounded-xl border-2 relative ${accentClass} ${bgClass} ${
                    isSelected 
                      ? "border-slate-800 shadow-md ring-2 ring-indigo-500/20 translate-x-0.5" 
                      : "shadow-2xs"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-extrabold text-xs text-slate-650 font-mono">
                      {t.id}
                    </span>
                    <span className={`text-3xs px-2 py-0.5 rounded-full font-bold uppercase ${
                      t.status === TaskStatus.Completed ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                      t.status === TaskStatus.ReportReceived ? "bg-blue-105 text-blue-800 border border-blue-300" :
                      t.status === TaskStatus.Overdue ? "bg-rose-200 text-rose-850 border border-rose-350 animate-pulse font-black" :
                      t.status === TaskStatus.InWork ? "bg-amber-105 text-amber-900 border border-amber-300" :
                      "bg-slate-200 text-slate-800 border border-slate-350"
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <h3 className={`font-extrabold text-slate-900 border-none text-xs leading-relaxed mt-1.5 line-clamp-2 ${
                    isSelected ? "text-indigo-900" : ""
                  }`}>
                    {t.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 text-3xs text-slate-500 font-bold font-mono">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-650 font-bold uppercase text-[9px] border border-slate-200">
                      {t.type}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 p-0.5 px-1.5 rounded border border-slate-200/60">
                      Срок: <strong className={t.status === TaskStatus.Overdue ? "text-rose-600 animate-pulse" : "text-slate-705"}>{formatDate(t.executeDeadline)}</strong>
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 p-0.5 px-1.5 rounded border border-slate-200/60">
                      Важность: <strong className={`${
                        t.importance === ImportanceLevel.Urgent ? "text-red-650 font-black" :
                        t.importance === ImportanceLevel.Important ? "text-amber-650" : "text-slate-600"
                      }`}>{t.importance}</strong>
                    </span>
                  </div>

                  {t.specialControl && (
                    <div className="absolute bottom-4 right-4 bg-indigo-100 text-indigo-700 border border-indigo-250 px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase tracking-wide">
                      Особый контроль
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right hand: Detailed Card (7 columns) */}
      <div className={`lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px] overflow-hidden ${
        selectedTaskId ? "flex" : "hidden lg:flex"
      }`}>
        {!task ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 text-center">
            <Briefcase className="w-12 h-12 mb-3 text-slate-200" />
            <p className="font-semibold text-sm">Выберите поручение в списке для детального просмотра</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full divide-y divide-slate-100 overflow-y-auto">
            {/* Main Header / Title of Card */}
            <div className="p-5 space-y-3 bg-slate-50/50">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => onSelectTask(null)}
                    className="lg:hidden bg-slate-200 hover:bg-slate-300 active:bg-slate-350 text-slate-800 py-1 px-2.5 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    ← Назад
                  </button>
                  <span className="bg-blue-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded">
                    {task.id}
                  </span>
                  <span className="text-3xs text-slate-400 font-bold font-mono">Тип: {task.type}</span>
                  
                  <button
                    onClick={() => startEditingTask(task)}
                    className="flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold py-1 px-2.5 rounded transition-all cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Редактировать</span>
                  </button>
                </div>
                
                {/* Single / overall status selector for quick manual state override */}
                <div className="flex items-center gap-2">
                  <label className="text-3xs font-extrabold uppercase text-slate-400">Статус:</label>
                  <select
                    value={task.status}
                    onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                    className="text-xs bg-white border border-slate-205 py-1 px-2.5 rounded font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value={TaskStatus.NotStarted}>Не начато</option>
                    <option value={TaskStatus.InWork}>В работе</option>
                    <option value={TaskStatus.ReportReceived}>Отчет получен</option>
                    <option value={TaskStatus.Completed}>Исполнено</option>
                    <option value={TaskStatus.Overdue}>Просрочено</option>
                  </select>
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-900 leading-snug border-none">{task.title}</h2>
              
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 text-xs leading-relaxed font-medium whitespace-pre-wrap">
                {task.text}
              </div>

              {/* Task level attachments showing */}
              {task.attachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Вложения к поручению:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {task.attachments.map(att => (
                      <div 
                        key={att.id} 
                        onClick={() => att.fileData && setViewerFile(att)}
                        className="relative group flex items-center bg-slate-100 border border-slate-250 hover:bg-indigo-50/60 hover:border-indigo-200 hover:text-indigo-850 rounded p-1.5 px-2.5 text-3xs font-bold text-slate-800 gap-2.5 cursor-pointer transition-all"
                        title="Нажмите для детального просмотра документа"
                      >
                        {att.fileData && (att.fileType === "jpg" || att.fileType === "jpeg" || att.fileType === "png" || att.fileData?.startsWith("data:image")) ? (
                          <img 
                            src={att.fileData} 
                            referrerPolicy="no-referrer" 
                            className="w-5 h-5 object-cover rounded shadow-2xs border border-slate-200" 
                          />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <span className="max-w-[140px] truncate underline">{att.fileName}</span>
                        <span className="text-slate-400 text-4xs font-mono">({att.size})</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDraftFile(task.id, att.id);
                          }}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-100 p-0.5 rounded transition-all ml-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Easy attachment additions */}
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={triggerImmediateAttachmentUpload} 
                  className="hidden" 
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Добавить вложение (фото/файл)
                </button>
              </div>
            </div>

            {/* Task Meta Details Grid (Section 4) */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/20 text-xs font-semibold">
              <div className="p-2.5 bg-white border border-slate-150 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Категория</span>
                <span className="text-slate-800 font-bold text-3xs max-w-full">
                  {db.categories.find(c => c.id === task.categoryId)?.name || "Прочее"}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-150 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Источник</span>
                <span className="text-slate-800 font-bold text-3xs text-ellipsis">
                  {db.sources.find(s => s.id === task.sourceId)?.name || "Прочее"}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-150 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Кто выдал</span>
                <span className="text-slate-800 font-bold text-3xs text-ellipsis">
                  {db.managers.find(m => m.id === task.managerId)?.fullName || "Неизвестно"}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-150 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Документ-основание</span>
                <span className="text-slate-800 font-bold text-3xs block">
                  {task.docBasisNumber || "Б/Н"}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {formatDate(task.docBasisDate) || ""}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-150 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Сроки</span>
                  <div className="space-y-1 text-3xs">
                    <span className="block font-medium">Выдано: <strong className="text-slate-800">{formatDate(task.dateGiven)}</strong></span>
                    <span className="block font-medium">Инфо: <strong className="text-amber-700">{formatDate(task.infoDeadline)}</strong></span>
                    <span className="block font-medium">Исполнение: <strong className="text-rose-700 font-mono font-bold">{formatDate(task.executeDeadline)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-150 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Важность & Особый контроль</span>
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded text-center block ${
                      task.importance === ImportanceLevel.Urgent ? "bg-red-50 text-red-700" :
                      task.importance === ImportanceLevel.Important ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {task.importance}
                    </span>
                    <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-600 font-bold">
                      <input 
                        type="checkbox" 
                        checked={task.specialControl} 
                        onChange={(e) => updateTask(task.id, { specialControl: e.target.checked })}
                      />
                      Особый контроль!
                    </label>
                  </div>
                </div>
              </div>

              {task.assignments && task.assignments.length > 0 && (
                <div className="p-2.5 bg-white border border-slate-150 rounded-lg col-span-2 md:col-span-3">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Исполнители (Работники)</span>
                  <div className="flex flex-wrap gap-2">
                    {task.assignments.map(empId => {
                      const emp = db.employees.find(e => e.id === empId);
                      return (
                        <span key={empId} className="bg-slate-50 text-slate-800 text-3xs border border-slate-200 px-2 py-1 rounded font-semibold font-mono">
                          {emp ? `${emp.fullName} (${emp.role})` : empId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 8: Massive assignment station metrics panel */}
            {task.type === TaskType.Massive && massStats && (
              <div className="p-4 space-y-3 bg-blue-50/20 border-y border-blue-100" id="massive-stations-panel">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-xs">Исполнение по станциям ДЦС</h3>
                  <button
                    onClick={() => setDebtorsOnly(!debtorsOnly)}
                    className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded border transition-all ${
                      debtorsOnly ? "bg-red-50 hover:bg-red-100 text-red-750 border-red-200 animate-pulse" : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    {debtorsOnly ? "Показать все станции" : "Показать невыполнившие станции (Должники)"}
                  </button>
                </div>

                {/* Automation statistics */}
                <div className="grid grid-cols-5 gap-1 text-center bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold text-slate-600">
                  <div className="border-r border-slate-150">
                    <span className="text-slate-400 block font-normal uppercase text-[8px]">Всего ст.</span>
                    <span className="text-slate-900 font-mono font-bold text-xs">{massStats.total}</span>
                  </div>
                  <div className="border-r border-slate-150">
                    <span className="text-emerald-500 block font-normal uppercase text-[8px]">Выполнено</span>
                    <span className="text-emerald-600 font-mono font-bold text-xs">{massStats.completed}</span>
                  </div>
                  <div className="border-r border-slate-150">
                    <span className="text-blue-500 block font-normal uppercase text-[8px]">Отчет получен</span>
                    <span className="text-blue-600 font-mono font-bold text-xs">{massStats.reportReceived}</span>
                  </div>
                  <div className="border-r border-slate-150">
                    <span className="text-red-500 block font-normal uppercase text-[8px]">Прочие</span>
                    <span className="text-amber-600 font-mono font-bold text-xs">{massStats.notExecuted}</span>
                  </div>
                  <div>
                    <span className="text-indigo-500 block font-normal uppercase text-[8px]">Процент</span>
                    <span className="text-indigo-600 font-mono font-bold text-xs">{massStats.pct}%</span>
                  </div>
                </div>

                {/* List of stations progress */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-max max-h-48 overflow-y-auto pt-1">
                  {massStats.states
                    .filter(state => !debtorsOnly || state.status === TaskStatus.NotStarted || state.status === TaskStatus.InWork)
                    .map(state => {
                      const st = db.stations.find(s => s.code === state.stationId);
                      const isEditing = editingStationId === state.stationId;

                      return (
                        <div key={state.stationId} className={`bg-white border rounded-lg p-2.5 flex flex-col justify-between hover:border-slate-300 ${
                          state.status === TaskStatus.Completed ? "border-emerald-250 bg-emerald-50/10" : "border-slate-155"
                        }`}>
                          <div className="flex justify-between items-start gap-1">
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={state.status === TaskStatus.Completed}
                                onChange={() => handleToggleStationCompleted(task.id, state.stationId, state.status)}
                                className="w-4 h-4 mt-0.5 cursor-pointer accent-emerald-600 flex-shrink-0"
                                title={state.status === TaskStatus.Completed ? "Сбросить исполнение станции" : "Отметить станцию как выполнившую поручение (автоматически заполнит ФИО начальника)"}
                              />
                              <div className="leading-tight">
                                <span className="font-bold text-3xs text-slate-800 block">{st ? st.name : state.stationId}</span>
                                <span className="text-[9px] text-slate-500 block">{st ? st.chief : ""}</span>
                              </div>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                              state.status === TaskStatus.Completed ? "bg-emerald-50 text-emerald-700" :
                              state.status === TaskStatus.ReportReceived ? "bg-blue-50 text-blue-700" :
                              state.status === TaskStatus.InWork ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                              {state.status}
                            </span>
                          </div>

                          {state.comment && (
                            <p className="text-[10px] text-slate-600 font-medium italic mt-1 line-clamp-2">
                              « {state.comment} »
                            </p>
                          )}

                          {state.reportDate && (
                            <span className="text-[8px] text-slate-400 font-mono mt-0.5">Отчет от: {state.reportDate}</span>
                          )}

                          {state.attachments && state.attachments.length > 0 && (
                            <div className="mt-1 flex items-center gap-1.5 text-[8px] font-bold text-blue-600">
                              <Paperclip className="w-2.5 h-2.5" /> Файлы: {state.attachments.length} шт.
                            </div>
                          )}

                          <button
                            onClick={() => startEditingStation(state)}
                            className="mt-2 text-[9px] text-blue-600 font-bold hover:underline self-end"
                          >
                            Изменить статус ст.
                          </button>
                        </div>
                      );
                    })}
                </div>

                {/* Station Edit State Overlay / Segment */}
                {editingStationId && (
                  <div className="bg-white rounded-lg border border-slate-300 p-4 space-y-3" id="station-detail-edit-form">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-800">
                        Обновить исполнение по станции: <span className="text-blue-600">{db.stations.find(s => s.code === editingStationId)?.name}</span>
                      </h4>
                      <button onClick={() => setEditingStationId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
                      <div>
                        <label className="block text-slate-500 mb-0.5">Статус по станции</label>
                        <select
                          value={stationStatus}
                          onChange={e => setStationStatus(e.target.value as TaskStatus)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded font-medium focus:outline-none"
                        >
                          <option value={TaskStatus.NotStarted}>Не начато</option>
                          <option value={TaskStatus.InWork}>В работе</option>
                          <option value={TaskStatus.ReportReceived}>Отчет получен</option>
                          <option value={TaskStatus.Completed}>Исполнено</option>
                          <option value={TaskStatus.Overdue}>Просрочено</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 mb-0.5">Дата отчета</label>
                        <input
                          type="date"
                          value={stationDate}
                          onChange={e => setStationDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-1 rounded font-mono font-medium focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-slate-500 mb-0.5">Комментарий / Примечание</label>
                        <textarea
                          placeholder="Текст отчета, списки сотрудников..."
                          value={stationComment}
                          onChange={e => setStationComment(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded font-medium focus:outline-none h-16 resize-none"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <span className="block text-[10px] text-slate-400">Файлы / Фотографии подтверждения:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {stationAttachments.map(sat => (
                            <span key={sat.id} className="bg-slate-100 text-3xs font-mono p-1 px-1.5 rounded flex items-center gap-1 text-slate-800">
                              {sat.fileName}
                              <Trash2 className="w-3 h-3 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => setStationAttachments(prev => prev.filter(p => p.id !== sat.id))} />
                            </span>
                          ))}
                        </div>

                        <input 
                          type="file" 
                          ref={stationFileInputRef}
                          onChange={(e) => handleSimulatedFileUpload(e, setStationAttachments)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => stationFileInputRef.current?.click()}
                          className="text-3xs bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1 rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" /> Прикрепить файл
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCameraTarget("station");
                            setIsCameraOpen(true);
                          }}
                          className="text-3xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 p-1 rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3 h-3 text-emerald-600" /> Камера
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setEditingStationId(null)}
                        className="text-3xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={saveStationProgress}
                        className="text-3xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Сохранить отчет станции
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 7: Execution History (Ход исполнения) */}
            <div className="p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                Ход исполнения / Активность комитета
              </h3>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {db.taskProgress.filter(tp => tp.taskId === task.id).length === 0 ? (
                  <p className="py-4 text-center text-slate-400 text-3xs font-semibold italic">Записи о ходе исполнения отсутствуют</p>
                ) : (
                  db.taskProgress
                    .filter(tp => tp.taskId === task.id)
                    .sort((a, b) => b.id.localeCompare(a.id)) // newest first
                    .map(progress => (
                      <div key={progress.id} className="py-2.5 space-y-1">
                        <div className="flex justify-between items-center text-3xs text-slate-400 font-mono">
                          <span className="font-bold text-slate-600">Координатор исполнения</span>
                          <span>{progress.date}</span>
                        </div>
                        <p className="text-3xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-2 border border-slate-100 rounded">
                          {progress.text}
                        </p>

                        {progress.attachments && progress.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5 pl-2">
                            {progress.attachments.map(pa => {
                              return (
                                <div 
                                  key={pa.id} 
                                  onClick={() => pa.fileData && setViewerFile(pa)}
                                  className="text-4xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 p-1 px-2.5 rounded-lg text-slate-550 flex items-center gap-1.5 cursor-pointer transition-colors"
                                  title="Нажмите, чтобы просмотреть/скачать"
                                >
                                  <Paperclip className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="font-bold underline">{pa.fileName}</span>
                                  <span className="text-slate-400">({pa.size || "Снимок"})</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Progress Add Report Form */}
              <form onSubmit={submitProgressReport} onPaste={(e) => handleOnPasteCapture(e, setProgressAttachments)} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <p className="text-[10px] font-bold text-slate-650">Опубликовать форму исполнения / комментарий отдела:</p>
                <div className="flex gap-2">
                  <textarea
                    placeholder="Какая работа проведена по поручению? Опишите ход..."
                    value={progressText}
                    onChange={e => setProgressText(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 p-2 rounded text-xs focus:outline-none min-h-12 resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {progressAttachments.map(pa => (
                      <span key={pa.id} className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        {pa.fileName}
                        <Trash2 className="w-2.5 h-2.5 text-red-500 cursor-pointer" onClick={() => setProgressAttachments(prev => prev.filter(f => f.id !== pa.id))} />
                      </span>
                    ))}

                    <input 
                      type="file" 
                      ref={progressFileInputRef} 
                      onChange={(e) => handleSimulatedFileUpload(e, setProgressAttachments)} 
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => progressFileInputRef.current?.click()}
                      className="text-[9px] bg-white border border-slate-250 py-1 px-2 rounded font-bold hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Paperclip className="w-2.5 h-2.5 text-slate-500" /> Ссылка / Файл
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget("progress");
                        setIsCameraOpen(true);
                      }}
                      className="text-[9px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 py-1 px-2 rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-2.5 h-2.5 text-emerald-600" /> Камера
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClipboardPaste(setProgressAttachments)}
                      className="text-[9px] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-850 py-1 px-2 rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                      title="Вставить скриншот из буфера обмена (также работает Ctrl+V)"
                    >
                      <Clipboard className="w-2.5 h-2.5 text-cyan-600" /> Вставить
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="bg-slate-800 text-white hover:bg-slate-900 font-semibold text-3xs px-3.5 py-1.5 rounded transition-all cursor-pointer"
                  >
                    Добавить в историю
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION 6: Related Documents (Связанные документы) */}
            <div className="p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <FileText className="w-4 h-4 text-slate-500" />
                Связанные приказы и телеграммы
              </h3>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {db.relatedDocuments.filter(rd => rd.taskId === task.id).length === 0 ? (
                  <p className="py-2 text-center text-slate-400 text-3xs font-semibold italic">Связанные документы отсутствуют</p>
                ) : (
                  db.relatedDocuments
                    .filter(rd => rd.taskId === task.id)
                    .map(doc => (
                      <div key={doc.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex justify-between items-start gap-4">
                        <div className="space-y-1 text-3xs">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-extrabold uppercase text-[8px] font-mono">
                              {doc.type}
                            </span>
                            <span className="font-mono font-bold text-slate-800">№ {doc.number}</span>
                            <span className="text-slate-400 font-mono">от {doc.date}</span>
                          </div>
                          <p className="text-slate-600 font-medium leading-normal">{doc.description}</p>
                          
                          {doc.attachments && doc.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1 font-sans">
                              {doc.attachments.map(da => {
                                return (
                                  <div 
                                    key={da.id} 
                                    onClick={() => da.fileData && setViewerFile(da)}
                                    className="text-4xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 p-1 px-2.5 rounded-lg text-slate-550 flex items-center gap-1.5 cursor-pointer transition-colors"
                                    title="Нажмите, чтобы просмотреть/скачать"
                                  >
                                    <Paperclip className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="font-bold underline">{da.fileName}</span>
                                    <span className="text-slate-400">({da.size || "Снимок"})</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => deleteRelatedDocument(doc.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                )}
              </div>

              {/* Add related doc inline form */}
              <form onSubmit={submitRelatedDoc} onPaste={(e) => handleOnPasteCapture(e, setRelAttachments)} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-650">Связать с новым документом:</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-3xs font-semibold text-slate-700">
                  <div>
                    <label className="block text-slate-400 uppercase text-[8px] mb-0.5">Тип док-та</label>
                    <select
                      value={relType}
                      onChange={e => setRelType(e.target.value as DocType)}
                      className="w-full bg-white border border-slate-200 p-1 rounded font-medium focus:outline-none"
                    >
                      <option value={DocType.Telegram}>Телеграмма</option>
                      <option value={DocType.Order}>Приказ</option>
                      <option value={DocType.Directive}>Распоряжение</option>
                      <option value={DocType.Protocol}>Протокол</option>
                      <option value={DocType.Assignment}>Поручение</option>
                      <option value={DocType.Letter}>Письмо</option>
                      <option value={DocType.Other}>Прочее</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 uppercase text-[8px] mb-0.5">Номер</label>
                    <input
                      type="text"
                      placeholder="№ ОБ-412"
                      value={relNumber}
                      onChange={e => setRelNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-1 rounded font-medium focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 uppercase text-[8px] mb-0.5">Дата</label>
                    <input
                      type="date"
                      value={relDate}
                      onChange={e => setRelDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-0.5 rounded font-mono font-medium focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-slate-400 uppercase text-[8px] mb-0.5">Описание / Краткое содержание</label>
                    <input
                      type="text"
                      placeholder="О согласовании работы перегона..."
                      value={relDescription}
                      onChange={e => setRelDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {relAttachments.map(f => (
                      <span key={f.id} className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded">
                        {f.fileName}
                      </span>
                    ))}
                    <input 
                      type="file" 
                      ref={relationFileInputRef} 
                      onChange={(e) => handleSimulatedFileUpload(e, setRelAttachments)} 
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => relationFileInputRef.current?.click()}
                      className="text-[9px] bg-white border border-slate-250 py-1 px-2 rounded font-bold hover:bg-slate-50 text-slate-755 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Paperclip className="w-2.5 h-2.5" /> Файл
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClipboardPaste(setRelAttachments)}
                      className="text-[9px] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-850 py-1 px-2 rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                      title="Вставить скриншот из буфера обмена (также работает Ctrl+V)"
                    >
                      <Clipboard className="w-2.5 h-2.5 text-cyan-600" /> Вставить
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700 font-semibold text-3xs px-4 py-1.5 rounded transition-all cursor-pointer"
                  >
                    Привязать к поручению
                  </button>
                </div>
              </form>
            </div>

            {/* Delete button of general task */}
            <div className="p-4 bg-rose-50/20 flex justify-end gap-3 rounded-b-xl border-t border-slate-100">
              <button
                onClick={() => {
                  if (confirm(`Удалить поручение ${task.id} и все связанные данные?`)) {
                    deleteTask(task.id);
                    onSelectTask(null);
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold border border-rose-200 rounded-lg p-2 px-3 hover:bg-rose-50 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Удалить поручение
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Task Creation Modal Form (Centered overlay overlay) */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-100" id="create-task-modal-form">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600 font-bold" />
                Новое поручение комитета
              </h2>
              <button 
                onClick={() => setIsCreating(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} onPaste={(e) => handleOnPasteCapture(e, setNewAttachments)} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-semibold text-slate-700">
                
                {/* Type Selection */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Тип поручения</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      setNewType(e.target.value as TaskType);
                      setNewAssignments([]);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    <option value={TaskType.Individual}>{TaskType.Individual}</option>
                    <option value={TaskType.Massive}>{TaskType.Massive}</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Категория</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    {db.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Источник предписания</label>
                  <select
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    {db.sources.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="md:col-span-3">
                  <label className="block text-slate-500 mb-0.5">Краткое наименование поручения</label>
                  <input
                    type="text"
                    placeholder="Пример: Провести повторные замеры сопротивления на Южном переезде"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none focus:border-blue-500"
                  />
                </div>

                {/* Text Description */}
                <div className="md:col-span-3">
                  <label className="block text-slate-500 mb-0.5">Подробный текст поручения / Решение совещания</label>
                  <textarea
                    placeholder="Напишите подробный перечень действий, критерии успешности..."
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none focus:border-blue-500 min-h-24 resize-y"
                  />
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Кто утвердил / выдал</label>
                  <select
                    value={newManagerId}
                    onChange={(e) => setNewManagerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    {db.managers.map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                {/* Doc basis number */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Документ-основание (номер)</label>
                  <input
                    type="text"
                    placeholder="№ ТЛГ ОБ-4512"
                    value={newDocBasisNumber}
                    onChange={e => setNewDocBasisNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none"
                  />
                </div>

                {/* Doc basis date */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Для документа (дата)</label>
                  <input
                    type="date"
                    value={newDocBasisDate}
                    onChange={e => setNewDocBasisDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                {/* Deadlines layout */}
                <div>
                  <label className="block text-red-500 mb-0.5">Дата выдачи</label>
                  <input
                    type="date"
                    value={newDateGiven}
                    onChange={e => setNewDateGiven(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-amber-600 mb-0.5">Предоставление информации</label>
                  <input
                    type="date"
                    value={newInfoDeadline}
                    onChange={e => setNewInfoDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-rose-600 mb-0.5">Срок исполнения</label>
                  <input
                    type="date"
                    value={newExecuteDeadline}
                    onChange={e => setNewExecuteDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                {/* Importance Levels */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Важность</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(e.target.value as ImportanceLevel)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    <option value={ImportanceLevel.Normal}>{ImportanceLevel.Normal}</option>
                    <option value={ImportanceLevel.Important}>{ImportanceLevel.Important}</option>
                    <option value={ImportanceLevel.Urgent}>{ImportanceLevel.Urgent}</option>
                    <option value={ImportanceLevel.SpecialControl}>{ImportanceLevel.SpecialControl}</option>
                  </select>
                </div>

                {/* Special Control box */}
                <div className="flex items-center pt-6 space-x-2">
                  <input
                    type="checkbox"
                    id="checkbox-special-control"
                    checked={newSpecialControl}
                    onChange={e => setNewSpecialControl(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="checkbox-special-control" className="text-xs text-indigo-700 font-bold select-none cursor-pointer">
                    Поставить на ОСОБЫЙ контроль!
                  </label>
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">Примечание</label>
                  <input
                    type="text"
                    placeholder="Любая доп. информация..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none"
                  />
                </div>

                {/* Individual assignment picker (only displays if Individual) */}
                {newType === TaskType.Individual && (
                  <div className="col-span-1 md:col-span-3 border-t border-slate-150 pt-3">
                    <label className="block text-slate-500 mb-1">Назначить исполнителей-специалистов (Выберите):</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto pt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {db.employees.map(emp => {
                        const isAssigned = newAssignments.includes(emp.id);
                        return (
                          <label key={emp.id} className="flex items-start gap-2.5 text-3xs font-medium cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAssignments([...newAssignments, emp.id]);
                                } else {
                                  setNewAssignments(newAssignments.filter(id => id !== emp.id));
                                }
                              }}
                              className="w-3.5 h-3.5 mt-0.5 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-800">{emp.fullName}</span>
                              <span className="text-slate-400 block font-normal">{emp.role}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Massive execution station picker */}
                {newType === TaskType.Massive && (
                  <>
                    <div className="col-span-1 md:col-span-3 border-t border-slate-150 pt-3">
                      <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                        <label className="block text-slate-500 font-bold">Выбрать станции ДЦС, для которых необходимо выполнить поручение ({newSelectedStations.length} из {db.stations.length}):</label>
                        <label className="flex items-center gap-1.5 text-3xs font-bold text-indigo-700 cursor-pointer select-none bg-indigo-50/60 p-1 px-2.5 rounded-md border border-indigo-200">
                          <input
                            type="checkbox"
                            checked={newSelectedStations.length === db.stations.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSelectedStations(db.stations.map(st => st.code));
                              } else {
                                setNewSelectedStations([]);
                              }
                            }}
                            className="w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                          />
                          Выбрать все станции
                        </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {db.stations.map(st => {
                          const isSelected = newSelectedStations.includes(st.code);
                          return (
                            <label key={st.code} className="flex items-start gap-2 text-3xs font-medium cursor-pointer py-1 px-1.5 rounded hover:bg-slate-100/80">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewSelectedStations([...newSelectedStations, st.code]);
                                  } else {
                                    setNewSelectedStations(newSelectedStations.filter(code => code !== st.code));
                                  }
                                }}
                                className="w-3.5 h-3.5 mt-0.5 cursor-pointer accent-indigo-650"
                              />
                              <div className="leading-tight">
                                <span className="font-bold text-slate-800 block">{st.name}</span>
                                <span className="text-slate-400 block font-normal text-[8px]">{st.chief}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-3 bg-blue-50/50 rounded-lg p-3 border border-blue-150 flex items-start gap-2.5">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-[11px] font-extrabold text-blue-900 uppercase">Особенности массового поручения</h4>
                        <p className="text-3xs text-blue-700 leading-normal font-medium mt-0.5">
                          Поручение будет создано только для выбранных станций ДЦС ({newSelectedStations.length} шт.). Каждая выбранная станция получит собственный независимый чекбокс выполнения и анкету отчета.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Attachments for draft task */}
                <div className="col-span-1 md:col-span-3 border-t border-slate-150 pt-3 space-y-1.5">
                  <span className="block text-slate-500">Добавить вложения при создании:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {newAttachments.map(att => (
                      <span key={att.id} className="bg-slate-100 border border-slate-200 text-3xs font-mono font-bold p-1 px-2 rounded-lg flex items-center gap-1">
                        {att.fileName}
                        <X className="w-3.5 h-3.5 text-red-500 hover:text-red-700 ml-1 cursor-pointer" onClick={() => setNewAttachments(prev => prev.filter(f => f.id !== att.id))} />
                      </span>
                    ))}
                    <input 
                      type="file" 
                      ref={createFileInputRef} 
                      onChange={(e) => handleSimulatedFileUpload(e, setNewAttachments)} 
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => createFileInputRef.current?.click()}
                      className="text-3xs bg-slate-50 border border-slate-200 hover:bg-slate-100 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" /> Ссылка на файлы
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget("task");
                        setIsCameraOpen(true);
                      }}
                      className="text-3xs bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 p-1.5 px-2.5 rounded-lg font-bold text-emerald-850 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" /> Камера
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClipboardPaste(setNewAttachments)}
                      className="text-3xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 p-1.5 px-2.5 rounded-lg font-bold text-cyan-855 flex items-center gap-1 transition-colors cursor-pointer"
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
                  onClick={() => setIsCreating(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 font-extrabold" />
                  Утвердить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Task Editing Modal Form */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-100" id="edit-task-modal-form">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600 font-bold" />
                Редактирование поручения {editingTask.id}
              </h2>
              <button 
                onClick={() => setEditingTask(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTaskSubmit} onPaste={(e) => handleOnPasteCapture(e, setEditAttachments)} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-semibold text-slate-700">
                
                {/* Type Selection */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Тип поручения</label>
                  <select
                    value={editType}
                    onChange={(e) => {
                      setEditType(e.target.value as TaskType);
                      setEditAssignments([]);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    <option value={TaskType.Individual}>{TaskType.Individual}</option>
                    <option value={TaskType.Massive}>{TaskType.Massive}</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Категория</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    <option value="">Без категории</option>
                    {db.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Источник предписания</label>
                  <select
                    value={editSourceId}
                    onChange={(e) => setEditSourceId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    <option value="">Без источника</option>
                    {db.sources.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="md:col-span-3">
                  <label className="block text-slate-500 mb-0.5">Краткое наименование поручения</label>
                  <input
                    type="text"
                    placeholder="Заголовок поручения"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none focus:border-blue-500"
                  />
                </div>

                {/* Text Description */}
                <div className="md:col-span-3">
                  <label className="block text-slate-500 mb-0.5">Подробный текст поручения / Решение совещания</label>
                  <textarea
                    placeholder="Описание поручения..."
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none focus:border-blue-500 min-h-24 resize-y"
                  />
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Кто утвердил / выдал</label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    <option value="">Не указан</option>
                    {db.managers.map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                {/* Doc basis number */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Документ-основание (номер)</label>
                  <input
                    type="text"
                    value={editDocBasisNumber}
                    onChange={e => setEditDocBasisNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none"
                  />
                </div>

                {/* Doc basis date */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Для документа (дата)</label>
                  <input
                    type="date"
                    value={editDocBasisDate}
                    onChange={e => setEditDocBasisDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                {/* Deadlines layout */}
                <div>
                  <label className="block text-red-500 mb-0.5">Дата выдачи</label>
                  <input
                    type="date"
                    value={editDateGiven}
                    onChange={e => setEditDateGiven(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-amber-600 mb-0.5">Предоставление информации</label>
                  <input
                    type="date"
                    value={editInfoDeadline}
                    onChange={e => setEditInfoDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-rose-600 mb-0.5">Срок исполнения</label>
                  <input
                    type="date"
                    value={editExecuteDeadline}
                    onChange={e => setEditExecuteDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-medium outline-none"
                  />
                </div>

                {/* Importance Levels */}
                <div>
                  <label className="block text-slate-500 mb-0.5">Важность</label>
                  <select
                    value={editImportance}
                    onChange={(e) => setEditImportance(e.target.value as ImportanceLevel)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                  >
                    <option value={ImportanceLevel.Normal}>{ImportanceLevel.Normal}</option>
                    <option value={ImportanceLevel.Important}>{ImportanceLevel.Important}</option>
                    <option value={ImportanceLevel.Urgent}>{ImportanceLevel.Urgent}</option>
                    <option value={ImportanceLevel.SpecialControl}>{ImportanceLevel.SpecialControl}</option>
                  </select>
                </div>

                {/* Special Control box */}
                <div className="flex items-center pt-6 space-x-2">
                  <input
                    type="checkbox"
                    id="edit-checkbox-special-control"
                    checked={editSpecialControl}
                    onChange={e => setEditSpecialControl(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="edit-checkbox-special-control" className="text-xs text-indigo-700 font-bold select-none cursor-pointer">
                    Поставить на ОСОБЫЙ контроль!
                  </label>
                </div>

                <div>
                   <label className="block text-slate-500 mb-0.5">Примечание</label>
                   <input
                     type="text"
                     value={editNote}
                     onChange={e => setEditNote(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none"
                   />
                </div>

                {/* Individual assignment picker (only displays if Individual) */}
                {editType === TaskType.Individual && (
                  <div className="col-span-1 md:col-span-3 border-t border-slate-150 pt-3">
                    <label className="block text-slate-500 mb-1">Назначить исполнителей-специалистов (Выберите):</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto pt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {db.employees.map(emp => {
                        const isAssigned = editAssignments.includes(emp.id);
                        return (
                          <label key={emp.id} className="flex items-start gap-2.5 text-3xs font-medium cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditAssignments([...editAssignments, emp.id]);
                                } else {
                                  setEditAssignments(editAssignments.filter(id => id !== emp.id));
                                }
                              }}
                              className="w-3.5 h-3.5 mt-0.5 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-800">{emp.fullName}</span>
                              <span className="text-slate-400 block font-normal">{emp.role}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Massive execution station picker for Edit */}
                {editType === TaskType.Massive && (
                  <>
                    <div className="col-span-1 md:col-span-3 border-t border-slate-150 pt-3">
                      <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                        <label className="block text-slate-500 font-bold">Выбрать станции ДЦС, для которых необходимо выполнить поручение ({editSelectedStations.length} из {db.stations.length}):</label>
                        <label className="flex items-center gap-1.5 text-3xs font-bold text-indigo-700 cursor-pointer select-none bg-indigo-50/60 p-1 px-2.5 rounded-md border border-indigo-200">
                          <input
                            type="checkbox"
                            checked={editSelectedStations.length === db.stations.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditSelectedStations(db.stations.map(st => st.code));
                              } else {
                                setEditSelectedStations([]);
                              }
                            }}
                            className="w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                          />
                          Выбрать все станции
                        </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {db.stations.map(st => {
                          const isSelected = editSelectedStations.includes(st.code);
                          return (
                            <label key={st.code} className="flex items-start gap-2 text-3xs font-medium cursor-pointer py-1 px-1.5 rounded hover:bg-slate-100/80">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditSelectedStations([...editSelectedStations, st.code]);
                                  } else {
                                    setEditSelectedStations(editSelectedStations.filter(code => code !== st.code));
                                  }
                                }}
                                className="w-3.5 h-3.5 mt-0.5 cursor-pointer accent-indigo-650"
                              />
                              <div className="leading-tight">
                                <span className="font-bold text-slate-800 block">{st.name}</span>
                                <span className="text-slate-400 block font-normal text-[8px]">{st.chief}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-3 bg-blue-50/50 rounded-lg p-3 border border-blue-150 flex items-start gap-2.5">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-[11px] font-extrabold text-blue-900 uppercase">Особенности массового поручения</h4>
                        <p className="text-3xs text-blue-700 leading-normal font-medium mt-0.5">
                          Поручение будет активно только для выбранных станций ДЦС ({editSelectedStations.length} шт.). Исключенные станции будут убраны из списка контроля этого поручения.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Attachments for edit task */}
                <div className="col-span-1 md:col-span-3 border-t border-slate-150 pt-3 space-y-1.5">
                  <span className="block text-slate-500">Добавить вложения при редактировании:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {editAttachments.map(att => (
                      <span key={att.id} className="bg-slate-100 border border-slate-200 text-3xs font-mono font-bold p-1 px-2 rounded-lg flex items-center gap-1">
                        {att.fileName}
                        <X className="w-3.5 h-3.5 text-red-500 hover:text-red-700 ml-1 cursor-pointer" onClick={() => setEditAttachments(prev => prev.filter(f => f.id !== att.id))} />
                      </span>
                    ))}
                    <input 
                      type="file" 
                      ref={editFileInputRef} 
                      onChange={(e) => handleSimulatedFileUpload(e, setEditAttachments)} 
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="text-3xs bg-slate-50 border border-slate-200 hover:bg-slate-100 p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" /> Добавить файлы
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget("edit_task");
                        setIsCameraOpen(true);
                      }}
                      className="text-3xs bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 p-1.5 px-2.5 rounded-lg font-bold text-emerald-850 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" /> Камера
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClipboardPaste(setEditAttachments)}
                      className="text-3xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 p-1.5 px-2.5 rounded-lg font-bold text-cyan-855 flex items-center gap-1 transition-colors cursor-pointer"
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
                  onClick={() => setEditingTask(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 font-extrabold" />
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-55 flex items-center justify-center p-4 font-sans"
          id="common-document-viewer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl text-white">
            {/* Header */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400 shrink-0" />
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
                          <p className="text-[10px] text-slate-400 leading-normal text-left max-w-xl">
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
                        <FileText className="w-16 h-16 text-blue-500 mx-auto" />
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
