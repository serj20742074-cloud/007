import { useState, useEffect } from "react";
import { useAppStore } from "./hooks/useAppStore";
import { 
  LayoutDashboard,
  CheckSquare,
  FileText,
  Landmark,
  Users,
  Calendar,
  Bell,
  BarChart2,
  Database,
  Moon,
  Sun,
  Search,
  X,
  Clock,
  ArrowRight
} from "lucide-react";
import { getTodayStr } from "./utils/date";
import { saveToIndexedDB, safeLocalStorageGetItem, safeLocalStorageSetItem } from "./utils/storageFallback";

import DashboardView from "./components/DashboardView";
import TasksView from "./components/TasksView";
import DocumentsView from "./components/DocumentsView";
import StationsView from "./components/StationsView";
import EmployeesView from "./components/EmployeesView";
import MeetingsView from "./components/MeetingsView";
import CalendarView from "./components/CalendarView";
import NotesView from "./components/NotesView";
import ReportsView from "./components/ReportsView";
import DatabaseView from "./components/DatabaseView";

export default function App() {
  const store = useAppStore();
  const { db } = store;

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Global Search state (Section 16)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");

  const todayStr = getTodayStr();

  // --- DAILY AUTOMATIC BACKUP (17:00) ---
  const [isAutoBackupModalOpen, setIsAutoBackupModalOpen] = useState<boolean>(false);
  const [autoBackupFilename, setAutoBackupFilename] = useState<string>("");
  const [autoBackupData, setAutoBackupData] = useState<string>("");
  const [autoBackupSummary, setAutoBackupSummary] = useState({
    stationsCount: 0,
    tasksCount: 0,
    employeesCount: 0,
    meetingsCount: 0
  });

  const triggerBackupDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement("a");
    linkElement.href = url;
    linkElement.download = filename;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
  };

  const handleRunDailyBackup = (isSimulation: boolean = false) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;
    
    // Export base
    const dataStr = store.exportDatabaseJsonString();
    const fName = `ControlCenter_РезервныйБэкап_${isSimulation ? "Симуляция_" : "Авто_"}${dateKey}_1700.json`;
    
    setAutoBackupFilename(fName);
    setAutoBackupData(dataStr);
    setAutoBackupSummary({
      stationsCount: db.stations.length,
      tasksCount: db.tasks.length,
      employeesCount: db.employees.length,
      meetingsCount: db.meetings.length
    });
    
    // Save to auto backups registry in localStorage safely
    const savedBackupsRaw = safeLocalStorageGetItem("controlcenter_auto_backups_registry");
    const savedBackups = savedBackupsRaw ? JSON.parse(savedBackupsRaw) : [];
    savedBackups.unshift({
      date: dateKey,
      time: "17:00",
      filename: fName,
      content: dataStr,
      timestamp: new Date().toLocaleString("ru-RU"),
      isSimulation
    });
    // Keep last 15 auto-backups strictly
    if (savedBackups.length > 15) savedBackups.pop();
    safeLocalStorageSetItem("controlcenter_auto_backups_registry", JSON.stringify(savedBackups));

    // Also mirror to IndexedDB for persistent preservation
    saveToIndexedDB("controlcenter_auto_backups_registry", savedBackups).catch(err => {
      console.warn("StorageFallback: Failed to save backups registry into IndexedDB", err);
    });
    
    // Open Success confirmation dialog/modal
    setIsAutoBackupModalOpen(true);

    // Trigger physical files download
    try {
      triggerBackupDownloadFile(fName, dataStr);
    } catch (err) {
      console.warn("Auto-download may have been blocked by browser sandbox. User can download via explicit button.", err);
    }
  };

  // Run periodic automated backup check (every 10 seconds)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // If exactly 17:00
      if (currentHour === 17) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;
        
        const lastBackupDate = safeLocalStorageGetItem("last_auto_backup_date_1700");
        if (lastBackupDate !== dateKey) {
          safeLocalStorageSetItem("last_auto_backup_date_1700", dateKey);
          handleRunDailyBackup(false);
        }
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [db, store]);

  // Navigation callbacks
  const navigateToSpecificTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveTab("tasks");
  };

  const navigateToSpecificMeeting = (meetingId: string) => {
    setActiveTab("meetings");
    setTimeout(() => {
      const el = document.getElementById(`meet-card-${meetingId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-indigo-600", "ring-offset-2", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-indigo-650", "ring-offset-2");
        }, 3000);
      }
    }, 150);
  };

  const navigateToSpecificNote = (noteId: string) => {
    setActiveTab("notes");
    setTimeout(() => {
      const el = document.getElementById(`note-card-${noteId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-emerald-600", "ring-offset-2", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-emerald-650", "ring-offset-2");
        }, 3000);
      }
    }, 150);
  };

  const navigateToTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Global search filtering mechanism (Section 16)
  const performGlobalSearchMatch = () => {
    if (!globalQuery.trim()) return [];

    const results: Array<{
      type: "TASK" | "STATION" | "DOC" | "NOTE" | "PERSONNEL";
      id: string;
      title: string;
      text: string;
      tabToNavigate: string;
      callback: () => void;
    }> = [];

    const q = globalQuery.toLowerCase();

    // 1. Search Tasks (by ID, Title, Text, Category, Doc base number)
    db.tasks.forEach(t => {
      const categoryName = db.categories.find(c => c.id === t.categoryId)?.name || "";
      const sourceName = db.sources.find(s => s.id === t.sourceId)?.name || "";
      const managerName = db.managers.find(m => m.id === t.managerId)?.fullName || "";

      if (
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.text.toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q) ||
        sourceName.toLowerCase().includes(q) ||
        managerName.toLowerCase().includes(q) ||
        t.docBasisNumber.toLowerCase().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q))
      ) {
        results.push({
          type: "TASK",
          id: t.id,
          title: `[Поручение] ${t.id} - ${t.title}`,
          text: t.text,
          tabToNavigate: "tasks",
          callback: () => {
            setSelectedTaskId(t.id);
            setActiveTab("tasks");
          }
        });
      }
    });

    // 2. Search Stations (by code, name, chief, deputy)
    db.stations.forEach(s => {
      if (
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.chief.toLowerCase().includes(q) ||
        s.deputy.toLowerCase().includes(q) ||
        (s.note && s.note.toLowerCase().includes(q))
      ) {
        results.push({
          type: "STATION",
          id: s.code,
          title: `[Станция] ${s.code} - ${s.name}`,
          text: `ДС: ${s.chief} | Тел: ${s.phone}`,
          tabToNavigate: "stations",
          callback: () => {
            setActiveTab("stations");
          }
        });
      }
    });

    // 3. Search Related Documents (Doc type, number, description, file names)
    db.relatedDocuments.forEach(d => {
      const matchFiles = d.attachments.some(a => a.fileName.toLowerCase().includes(q));
      if (
        d.number.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        matchFiles
      ) {
        results.push({
          type: "DOC",
          id: d.id,
          title: `[Документ] ${d.type} № ${d.number}`,
          text: d.description,
          tabToNavigate: "documents",
          callback: () => {
            setActiveTab("documents");
          }
        });
      }
    });

    // 4. Search Notes (title, text)
    db.notes.forEach(n => {
      const matchFiles = n.attachments.some(a => a.fileName.toLowerCase().includes(q));
      if (
        n.title.toLowerCase().includes(q) ||
        n.text.toLowerCase().includes(q) ||
        matchFiles
      ) {
        results.push({
          type: "NOTE",
          id: n.id,
          title: `[Заметка] ${n.title}`,
          text: n.text,
          tabToNavigate: "notes",
          callback: () => {
            setActiveTab("notes");
          }
        });
      }
    });

    // 5. Workers (FIO, role, department)
    db.employees.forEach(emp => {
      if (
        emp.fullName.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      ) {
        results.push({
          type: "PERSONNEL",
          id: emp.id,
          title: `[Работники] ${emp.fullName}`,
          text: `${emp.role} в ${emp.department}`,
          tabToNavigate: "employees",
          callback: () => {
            setActiveTab("employees");
          }
        });
      }
    });

    return results;
  };

  const globalSearchResults = performGlobalSearchMatch();

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${isDarkMode ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"}`} id="app-view-container">
      
      {/* 0. RESPONSIVE TOP HEADER FOR COMPACT / TABLET DEVICES */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white print:hidden shrink-0 z-30" id="tablet-top-header">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-705 active:bg-slate-750 text-slate-205 rounded-lg flex items-center gap-1.5 transition-colors text-2xs font-extrabold cursor-pointer"
            title="Открыть навигационное меню"
          >
            <span className="text-sm font-black">☰</span> Меню
          </button>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="w-2.5 h-2.5 bg-blue-550 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider font-sans">ControlCenter</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-1.5 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Глобальный поиск"
          >
            <Search className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 bg-slate-800 hover:bg-slate-705 text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Сменить тему оформления"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* 0.5 SIDEBAR BACKDROP DRAWER OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-[1px] z-30 lg:hidden transition-opacity duration-300"
          id="sidebar-overlay-backdrop"
        />
      )}

      {/* 1. LEFT SIDEBAR NAVIGATION COLUMN (Section 22 - Minimized transition actions) */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 border-r flex flex-col justify-between p-4 print:hidden shrink-0 transition-transform duration-300 lg:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-900 border-slate-200 text-white"
      }`} id="sidebar-navigation">
        <div className="space-y-6">
          {/* Workstation Brandy label */}
          <div className="flex justify-between items-center lg:block">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-wider font-sans text-white border-none m-0">ControlCenter</h2>
              </div>
              <p className="text-slate-450 text-[10px] font-bold uppercase mt-1">РЦ управления движением</p>
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 bg-slate-800 border border-slate-705 text-slate-300 rounded hover:bg-slate-700 cursor-pointer"
              title="Закрыть меню"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nav buttons */}
          <nav className="space-y-1 flex flex-col" id="sidebar-nav-container">
            {[
              { id: "dashboard", label: "Главный экран", icon: <LayoutDashboard className="w-4.5 h-4.5 text-blue-400" /> },
              { id: "tasks", label: "Поручения", icon: <CheckSquare className="w-4.5 h-4.5 text-emerald-400" /> },
              { id: "documents", label: "Документы", icon: <FileText className="w-4.5 h-4.5 text-amber-400" /> },
              { id: "stations", label: "Станции", icon: <Landmark className="w-4.5 h-4.5 text-indigo-400" /> },
              { id: "employees", label: "Работники & ДЦС", icon: <Users className="w-4.5 h-4.5 text-purple-400" /> },
              { id: "meetings", label: "Совещания", icon: <Clock className="w-4.5 h-4.5 text-rose-400" /> },
              { id: "calendar", label: "Календарь", icon: <Calendar className="w-4.5 h-4.5 text-teal-400" /> },
              { id: "notes", label: "Заметки", icon: <Bell className="w-4.5 h-4.5 text-yellow-400" /> },
              { id: "reports", label: "Отчеты", icon: <BarChart2 className="w-4.5 h-4.5 text-cyan-400" /> },
              { id: "database", label: "База данных", icon: <Database className="w-4.5 h-4.5 text-slate-400" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false); // Auto close sidebar drawer on tablet click
                }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-slate-800 text-white shadow-xs font-sans text-extrabold border-l-4 border-blue-500"
                    : "text-slate-350 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Global Controls & Theme Trigger bottom */}
        <div className="space-y-3.5 border-t border-slate-800 pt-4">
          {/* Global Search Button */}
          <button
            onClick={() => {
              setIsSearchOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center gap-2.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer text-left"
          >
            <Search className="w-4.5 h-4.5 text-slate-450" />
            <span>Глобальный Поиск...</span>
          </button>

          {/* Theme switcher */}
          <div className="flex justify-between items-center text-xs text-slate-450 font-bold">
            <span className="text-[10px] text-slate-450 uppercase">Световое оформление</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-all text-2xs font-extrabold cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Светлая
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  Тёмная
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. CENTRAL WORKSPACE PANEL */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-screen relative" id="workspace-main-panel">
        
        {/* Render selected view tab */}
        {activeTab === "dashboard" && (
          <DashboardView 
            db={db} 
            onNavigateToTask={navigateToSpecificTask}
            onNavigateToTab={navigateToTab}
            onNavigateToMeeting={navigateToSpecificMeeting}
            onNavigateToNote={navigateToSpecificNote}
          />
        )}

        {activeTab === "tasks" && (
          <TasksView
            db={db}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            addTask={store.addTask}
            updateTask={store.updateTask}
            deleteTask={store.deleteTask}
            addTaskAttachment={store.addTaskAttachment}
            deleteDraftFile={store.deleteDraftFile}
            addRelatedDocument={store.addRelatedDocument}
            deleteRelatedDocument={store.deleteRelatedDocument}
            addTaskProgress={store.addTaskProgress}
            deleteTaskProgress={store.deleteTaskProgress}
            updateTaskStationState={store.updateTaskStationState}
            renameAttachment={store.renameAttachment}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsView 
            db={db}
            onNavigateToTask={navigateToSpecificTask}
            onNavigateToMeeting={navigateToSpecificMeeting}
            onNavigateToNote={navigateToSpecificNote}
            renameAttachment={store.renameAttachment}
          />
        )}

        {activeTab === "stations" && (
          <StationsView
            db={db}
            onNavigateToTask={navigateToSpecificTask}
            addStation={store.addStation}
            updateStation={store.updateStation}
            deleteStation={store.deleteStation}
          />
        )}

        {activeTab === "employees" && (
          <EmployeesView
            db={db}
            addEmployee={store.addEmployee}
            updateEmployee={store.updateEmployee}
            deleteEmployee={store.deleteEmployee}
            addManager={store.addManager}
            updateManager={store.updateManager}
            deleteManager={store.deleteManager}
          />
        )}

        {activeTab === "meetings" && (
          <MeetingsView
            db={db}
            addMeeting={store.addMeeting}
            updateMeeting={store.updateMeeting}
            deleteMeeting={store.deleteMeeting}
            renameAttachment={store.renameAttachment}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarView 
            db={db}
            onNavigateToTask={navigateToSpecificTask}
            onNavigateToMeeting={navigateToSpecificMeeting}
            onNavigateToNote={navigateToSpecificNote}
          />
        )}

        {activeTab === "notes" && (
          <NotesView
            db={db}
            addNote={store.addNote}
            updateNote={store.updateNote}
            deleteNote={store.deleteNote}
            renameAttachment={store.renameAttachment}
          />
        )}

        {activeTab === "reports" && (
          <ReportsView 
            db={db}
            onNavigateToTask={navigateToSpecificTask}
          />
        )}

        {activeTab === "database" && (
          <DatabaseView
            db={db}
            addCategory={store.addCategory}
            updateCategory={store.updateCategory}
            deleteCategory={store.deleteCategory}
            addSource={store.addSource}
            updateSource={store.updateSource}
            deleteSource={store.deleteSource}
            exportDatabaseJsonString={store.exportDatabaseJsonString}
            importDatabaseJsonString={store.importDatabaseJsonString}
            resetDatabaseToDefault={store.resetDatabaseToDefault}
            loadDemoDatabase={store.loadDemoDatabase}
            onTriggerAutoBackup={() => handleRunDailyBackup(true)}
          />
        )}
      </main>

      {/* 3. GLOBAL SEARCH OVERLAY MODAL FORM (Section 16) */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex justify-center p-4 pt-16">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-100 flex flex-col h-[500px]" id="global-search-modal">
            
            {/* Header portion */}
            <div className="p-4 border-b border-slate-150 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Глобальный поиск в базе (поручения, станции, заметки, работники)..."
                  value={globalQuery}
                  onChange={e => setGlobalQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-lg text-sm font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  autoFocus
                />
              </div>
              <button 
                onClick={() => { setIsSearchOpen(false); setGlobalQuery(""); }}
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable results list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4" id="global-search-results-list">
              {globalQuery.trim() === "" ? (
                <div className="p-10 text-center text-slate-400 text-xs font-semibold">
                  Введите ключевые слова (номер поручения, название станции, фамилию ДС, ФИО работника или имя файла)...
                </div>
              ) : globalSearchResults.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs font-semibold">
                  Совпадений в базе данных не обнаружено.
                </div>
              ) : (
                globalSearchResults.map((res, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      res.callback();
                      setIsSearchOpen(false);
                      setGlobalQuery("");
                    }}
                    className="py-3 px-2 rounded-lg hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 border-none leading-snug">{res.title}</h4>
                      <p className="text-3xs text-slate-500 font-semibold line-clamp-1 mt-0.5">{res.text}</p>
                    </div>

                    <span className="text-[10px] bg-blue-50 text-blue-600 font-extrabold px-2 py-1 rounded inline-flex items-center gap-0.5">
                      Перейти <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. DAILY AUTOMATIC BACKUP ALERTER DIALOG */}
      {isAutoBackupModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-emerald-100 overflow-hidden transform transition-all">
            
            {/* Header badge decorative band */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex flex-col items-center text-center">
              <div className="bg-white/20 p-3 rounded-full mb-3 shrink-0 ring-4 ring-white/10">
                <Database className="w-8 h-8 text-white animate-bounce" />
              </div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider font-sans border-none text-white">
                Автоматический Бэкап
              </h3>
              <p className="text-white/80 text-[9px] font-extrabold tracking-widest uppercase mt-0.5">
                Режим: Ежедневно в 17:00
              </p>
            </div>

            {/* Content body */}
            <div className="p-6 text-center space-y-4 text-xs">
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 text-emerald-950 leading-relaxed text-center font-medium">
                Система выполнила контрольное резервное копирование вашей рабочей базы по состоянию на <strong className="text-emerald-800">17:00 часов местного времени</strong>.
              </div>

              <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-left">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Параметры файла копии</div>
                <div className="space-y-1.5 text-3xs text-slate-700 font-medium">
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span>Имя файла:</span>
                    <span className="font-mono font-bold text-slate-930 break-all max-w-[200px] text-right">{autoBackupFilename}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span>Перегонные станции:</span>
                    <strong className="text-slate-900 font-mono">{autoBackupSummary.stationsCount} шт.</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span>Активные поручения:</span>
                    <strong className="text-slate-900 font-mono">{autoBackupSummary.tasksCount} шт.</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span>ДЦС & Работники:</span>
                    <strong className="text-slate-900 font-mono">{autoBackupSummary.employeesCount} шт.</strong>
                  </div>
                  <div className="flex justify-between pb-0.5">
                    <span>Селекторные совещания:</span>
                    <strong className="text-slate-900 font-mono">{autoBackupSummary.meetingsCount} шт.</strong>
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-[9px] leading-relaxed text-center font-bold font-sans uppercase">
                📥 Проверьте папку «Загрузки» в вашем браузере. Если скачивание не началось автоматически, воспользуйтесь кнопкой ниже:
              </p>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => triggerBackupDownloadFile(autoBackupFilename, autoBackupData)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Database className="w-4 h-4" />
                  Скачать файл вручную
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutoBackupModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  Продолжить работу
                </button>
              </div>

              <div className="text-[9px] text-slate-400 text-center font-medium leading-relaxed">
                Копия автоматически захеширована и также доступна во внутренней истории архивов на вкладке <strong className="text-slate-500">«База данных»</strong>.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
