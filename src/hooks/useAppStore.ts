import { useState, useEffect } from "react";
import { 
  AppDatabase, 
  Station, 
  Employee, 
  Manager, 
  Category, 
  Source, 
  Task, 
  RelatedDocument, 
  TaskProgress, 
  TaskStationState, 
  Meeting, 
  Note, 
  TaskStatus,
  TaskType,
  ImportanceLevel,
  Attachment
} from "../types";
import { INITIAL_DATABASE, DEMO_DATABASE } from "../data";
import { getTodayStr } from "../utils/date";
import { 
  getFromIndexedDB, 
  saveToIndexedDB, 
  safeLocalStorageGetItem, 
  safeLocalStorageSetItem 
} from "../utils/storageFallback";

const LOCAL_STORAGE_KEY = "control_center_db_v1";
const BACKUPS_REGISTRY_KEY = "controlcenter_auto_backups_registry";

export function useAppStore() {
  const [db, setDb] = useState<AppDatabase>(() => {
    try {
      const saved = safeLocalStorageGetItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all required top level arrays exist in loaded db
        return {
          stations: parsed.stations || [],
          employees: parsed.employees || [],
          managers: parsed.managers || [],
          categories: parsed.categories || [],
          sources: parsed.sources || [],
          tasks: parsed.tasks || [],
          relatedDocuments: parsed.relatedDocuments || [],
          taskProgress: parsed.taskProgress || [],
          taskStations: parsed.taskStations || [],
          meetings: parsed.meetings || [],
          notes: parsed.notes || [],
        };
      }
    } catch (e) {
      console.error("Failed to load DB from localStorage, falling back to initial", e);
    }
    return INITIAL_DATABASE;
  });

  // Automatically update Task status based on current date
  // e.g. status inWork/notStarted where executeDeadline < today becomes Overdue
  const checkOverdueTasks = (currentDb: AppDatabase): AppDatabase => {
    const todayStr = getTodayStr(); // Dynamically calculated today's date
    let updated = false;
    const updatedTasks = currentDb.tasks.map(task => {
      // If task is not completed, check if its deadline is in the past
      if (
        task.status !== TaskStatus.Completed &&
        task.status !== TaskStatus.ReportReceived &&
        task.status !== TaskStatus.Overdue
      ) {
        if (task.executeDeadline < todayStr) {
          updated = true;
          return { ...task, status: TaskStatus.Overdue };
        }
      }
      return task;
    });

    if (updated) {
      return { ...currentDb, tasks: updatedTasks };
    }
    return currentDb;
  };

  useEffect(() => {
    // Run an initial check for overdue status and save safely
    const checked = checkOverdueTasks(db);
    safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(checked));
    if (checked !== db) {
      setDb(checked);
    }

    // --- IndexedDB Sync & Fallback System ---
    const syncWithIndexedDB = async () => {
      try {
        // A. Restore database if localStorage was wiped/reset (common in iOS PWA / tablet standalone scope)
        const idbSaved = await getFromIndexedDB(LOCAL_STORAGE_KEY);
        if (idbSaved) {
          const lsRaw = safeLocalStorageGetItem(LOCAL_STORAGE_KEY);
          let needsIdbRestore = false;
          
          if (!lsRaw) {
            needsIdbRestore = true;
          } else {
            try {
              const parsedLS = JSON.parse(lsRaw);
              const lsTasksCount = parsedLS.tasks?.length || 0;
              const lsStationsCount = parsedLS.stations?.length || 0;
              const idbTasksCount = idbSaved.tasks?.length || 0;
              const idbStationsCount = idbSaved.stations?.length || 0;

              // If localStorage contains fewer data items than IndexedDB (possibly due to partial reset / eviction)
              if (idbTasksCount > lsTasksCount || idbStationsCount > lsStationsCount) {
                needsIdbRestore = true;
              }
            } catch {
              needsIdbRestore = true;
            }
          }
          
          if (needsIdbRestore) {
            console.log("StorageFallback: Restoring database from IndexedDB to current memory store...", idbSaved);
            const checkedIdb = checkOverdueTasks(idbSaved);
            setDb(checkedIdb);
            safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(checkedIdb));
          }
        } else if (db && (db.stations.length > 0 || db.tasks.length > 0)) {
          // If IndexedDB is empty but we have data in memory, write it now to secure it
          await saveToIndexedDB(LOCAL_STORAGE_KEY, db);
        }

        // B. Restore backups registry lists if wiped
        const idbBackupsRegistry = await getFromIndexedDB(BACKUPS_REGISTRY_KEY);
        if (idbBackupsRegistry) {
          const lsBackupsRaw = safeLocalStorageGetItem(BACKUPS_REGISTRY_KEY);
          if (!lsBackupsRaw || JSON.parse(lsBackupsRaw).length === 0) {
            console.log("StorageFallback: Restoring auto backups registry from IndexedDB...");
            safeLocalStorageSetItem(BACKUPS_REGISTRY_KEY, JSON.stringify(idbBackupsRegistry));
            // Trigger a custom event so other components (like DatabaseView) update if they are active
            window.dispatchEvent(new Event("localstorage_backups_sync"));
          }
        } else {
          // Backup the current registry to IndexedDB
          const lsBackupsRaw = safeLocalStorageGetItem(BACKUPS_REGISTRY_KEY);
          if (lsBackupsRaw) {
            await saveToIndexedDB(BACKUPS_REGISTRY_KEY, JSON.parse(lsBackupsRaw));
          }
        }
      } catch (err) {
        console.warn("StorageFallback: Error synchronizing files with IndexedDB", err);
      }
    };

    syncWithIndexedDB();
  }, []);

  const saveDbState = (newDb: AppDatabase) => {
    const checked = checkOverdueTasks(newDb);
    setDb(checked);
    safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(checked));
    
    // Also store in IndexedDB for mobile/tablet Standalone PWA durability
    saveToIndexedDB(LOCAL_STORAGE_KEY, checked).catch(e => {
      console.warn("StorageFallback: Non-blocking IndexedDB save failed", e);
    });
  };

  // ----- STATIONS OPERATIONS -----
  const addStation = (station: Station) => {
    if (db.stations.some(s => s.code === station.code)) {
      throw new Error(`Станция с кодом ${station.code} уже существует!`);
    }
    const newDb = { ...db, stations: [...db.stations, station] };
    saveDbState(newDb);
  };

  const updateStation = (code: string, updated: Partial<Station>) => {
    const newDb = {
      ...db,
      stations: db.stations.map(s => s.code === code ? { ...s, ...updated } : s)
    };
    saveDbState(newDb);
  };

  const deleteStation = (code: string) => {
    const newDb = {
      ...db,
      stations: db.stations.filter(s => s.code !== code),
      taskStations: db.taskStations.filter(ts => ts.stationId !== code)
    };
    saveDbState(newDb);
  };

  // ----- EMPLOYEES OPERATIONS -----
  const addEmployee = (emp: Omit<Employee, "id">) => {
    const id = "emp-" + Date.now();
    const newDb = { ...db, employees: [...db.employees, { ...emp, id }] };
    saveDbState(newDb);
  };

  const updateEmployee = (id: string, updated: Partial<Employee>) => {
    const newDb = {
      ...db,
      employees: db.employees.map(e => e.id === id ? { ...e, ...updated } : e)
    };
    saveDbState(newDb);
  };

  const deleteEmployee = (id: string) => {
    const newDb = {
      ...db,
      employees: db.employees.filter(e => e.id !== id),
      // Clean up references in tasks if any
      tasks: db.tasks.map(t => ({
        ...t,
        assignments: t.assignments ? t.assignments.filter(aId => aId !== id) : []
      }))
    };
    saveDbState(newDb);
  };

  // ----- MANAGERS OPERATIONS -----
  const addManager = (man: Omit<Manager, "id">) => {
    const id = "man-" + Date.now();
    const newDb = { ...db, managers: [...db.managers, { ...man, id }] };
    saveDbState(newDb);
  };

  const updateManager = (id: string, updated: Partial<Manager>) => {
    const newDb = {
      ...db,
      managers: db.managers.map(m => m.id === id ? { ...m, ...updated } : m)
    };
    saveDbState(newDb);
  };

  const deleteManager = (id: string) => {
    const newDb = {
      ...db,
      managers: db.managers.filter(m => m.id !== id)
    };
    saveDbState(newDb);
  };

  // ----- CATEGORIES -----
  const addCategory = (name: string) => {
    const id = "cat-" + Date.now();
    const newDb = { ...db, categories: [...db.categories, { id, name }] };
    saveDbState(newDb);
  };

  const updateCategory = (id: string, name: string) => {
    const newDb = {
      ...db,
      categories: db.categories.map(c => c.id === id ? { ...c, name } : c)
    };
    saveDbState(newDb);
  };

  const deleteCategory = (id: string) => {
    const newDb = {
      ...db,
      categories: db.categories.filter(c => c.id !== id)
    };
    saveDbState(newDb);
  };

  // ----- SOURCES -----
  const addSource = (name: string) => {
    const id = "src-" + Date.now();
    const newDb = { ...db, sources: [...db.sources, { id, name }] };
    saveDbState(newDb);
  };

  const updateSource = (id: string, name: string) => {
    const newDb = {
      ...db,
      sources: db.sources.map(s => s.id === id ? { ...s, name } : s)
    };
    saveDbState(newDb);
  };

  const deleteSource = (id: string) => {
    const newDb = {
      ...db,
      sources: db.sources.filter(s => s.id !== id)
    };
    saveDbState(newDb);
  };

  // ----- TASKS -----
  const addTask = (
    task: Omit<Task, "id" | "status" | "attachments">, 
    initialAttachments: Attachment[] = [],
    selectedStationIds?: string[]
  ) => {
    const id = "П-" + new Date(getTodayStr()).getFullYear() + "-" + String(db.tasks.length + 1).padStart(3, "0");
    const newTask: Task = {
      ...task,
      id,
      status: TaskStatus.NotStarted,
      attachments: initialAttachments
    };

    // If it's a massive task, prepare initial state for SELECTED stations (or ALL if none selected)
    let stationStates: TaskStationState[] = [];
    if (task.type === TaskType.Massive) {
      const targetIds = selectedStationIds && selectedStationIds.length > 0
        ? selectedStationIds
        : db.stations.map(st => st.code);

      stationStates = targetIds.map(stId => ({
        taskId: id,
        stationId: stId,
        status: TaskStatus.NotStarted,
        comment: "",
        attachments: []
      }));
    }

    const newDb = {
      ...db,
      tasks: [...db.tasks, newTask],
      taskStations: [...db.taskStations, ...stationStates]
    };
    saveDbState(newDb);
    return id;
  };

  const updateTask = (id: string, updated: Partial<Task>, selectedStationIds?: string[]) => {
    let updatedTaskStations = db.taskStations;
    
    // Check if task type is massive now or stayed massive
    const taskBefore = db.tasks.find(t => t.id === id);
    const isMassiveNow = updated.type === TaskType.Massive || (!updated.type && taskBefore?.type === TaskType.Massive);

    if (isMassiveNow && selectedStationIds) {
      const otherTasksStations = db.taskStations.filter(ts => ts.taskId !== id);
      const currentTaskStations = db.taskStations.filter(ts => ts.taskId === id);
      
      const newStationsList = selectedStationIds.map(stId => {
        const existing = currentTaskStations.find(ts => ts.stationId === stId);
        if (existing) {
          return existing;
        } else {
          return {
            taskId: id,
            stationId: stId,
            status: TaskStatus.NotStarted,
            comment: "",
            attachments: []
          };
        }
      });
      updatedTaskStations = [...otherTasksStations, ...newStationsList];
    } else if (updated.type === TaskType.Individual) {
      // If converted to Individual, clear task stations
      updatedTaskStations = db.taskStations.filter(ts => ts.taskId !== id);
    }

    const newDb = {
      ...db,
      tasks: db.tasks.map(t => t.id === id ? { ...t, ...updated } : t),
      taskStations: updatedTaskStations
    };
    saveDbState(newDb);
  };

  const deleteTask = (id: string) => {
    const newDb = {
      ...db,
      tasks: db.tasks.filter(t => t.id !== id),
      taskProgress: db.taskProgress.filter(tp => tp.taskId !== id),
      relatedDocuments: db.relatedDocuments.filter(rd => rd.taskId !== id),
      taskStations: db.taskStations.filter(ts => ts.taskId !== id)
    };
    saveDbState(newDb);
  };

  // ----- TASK ATTACHMENTS -----
  const addTaskAttachment = (taskId: string, attachment: Attachment) => {
    const newDb = {
      ...db,
      tasks: db.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, attachments: [...t.attachments, attachment] };
        }
        return t;
      })
    };
    saveDbState(newDb);
  };

  const deleteDraftFile = (taskId: string, attachmentId: string) => {
     const newDb = {
      ...db,
      tasks: db.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, attachments: t.attachments.filter(att => att.id !== attachmentId) };
        }
        return t;
      })
    };
    saveDbState(newDb);
  };

  // ----- RELATED DOCUMENTS -----
  const addRelatedDocument = (doc: Omit<RelatedDocument, "id">) => {
    const id = "doc-" + Date.now();
    const newDb = {
      ...db,
      relatedDocuments: [...db.relatedDocuments, { ...doc, id }]
    };
    saveDbState(newDb);
  };

  const deleteRelatedDocument = (id: string) => {
    const newDb = {
      ...db,
      relatedDocuments: db.relatedDocuments.filter(d => d.id !== id)
    };
    saveDbState(newDb);
  };

  // ----- TASK PROGRESS -----
  const addTaskProgress = (prog: Omit<TaskProgress, "id">) => {
    const id = "prog-" + Date.now();
    const newProgress: TaskProgress = { ...prog, id };
    const newDb = {
      ...db,
      taskProgress: [...db.taskProgress, newProgress]
    };
    // If individual task, progress might update overall task status
    saveDbState(newDb);
  };

  const deleteTaskProgress = (id: string) => {
    const newDb = {
      ...db,
      taskProgress: db.taskProgress.filter(tp => tp.id !== id)
    };
    saveDbState(newDb);
  };

  // ----- MASSIVE TASK STATIONS STATE -----
  const updateTaskStationState = (taskId: string, stationId: string, updated: Partial<TaskStationState>) => {
    const existing = db.taskStations.find(ts => ts.taskId === taskId && ts.stationId === stationId);
    
    let updatedStations: TaskStationState[];
    if (existing) {
      updatedStations = db.taskStations.map(ts => 
        (ts.taskId === taskId && ts.stationId === stationId) ? { ...ts, ...updated } : ts
      );
    } else {
      updatedStations = [
        ...db.taskStations,
        {
          taskId,
          stationId,
          status: updated.status || TaskStatus.NotStarted,
          comment: updated.comment || "",
          attachments: updated.attachments || [],
          reportDate: updated.reportDate
        }
      ];
    }

    // Now recalculate the overall status of the massive task based on individual station metrics!
    // Automatic statuses:
    // If all stations are "completed" -> task is Completed
    // If some reports received, others completed, no one overdue -> InWork, etc.
    const relevantStationStates = updatedStations.filter(ts => ts.taskId === taskId);
    const totalStations = relevantStationStates.length;
    const completedStations = relevantStationStates.filter(ts => ts.status === TaskStatus.Completed).length;
    const reportReceivedStations = relevantStationStates.filter(ts => ts.status === TaskStatus.ReportReceived).length;

    let overallStatus = TaskStatus.InWork;
    if (completedStations === totalStations && totalStations > 0) {
      overallStatus = TaskStatus.Completed;
    } else if (completedStations + reportReceivedStations === totalStations && totalStations > 0) {
      overallStatus = TaskStatus.ReportReceived;
    } else if (completedStations > 0 || reportReceivedStations > 0) {
      overallStatus = TaskStatus.InWork;
    }

    const currentTask = db.tasks.find(t => t.id === taskId);
    const newTasks = db.tasks.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          status: (overallStatus !== TaskStatus.Completed && t.executeDeadline < getTodayStr()) 
            ? TaskStatus.Overdue 
            : overallStatus 
        };
      }
      return t;
    });

    const newDb = {
      ...db,
      taskStations: updatedStations,
      tasks: newTasks
    };
    saveDbState(newDb);
  };

  // ----- MEETINGS -----
  const addMeeting = (meet: Omit<Meeting, "id">) => {
    const id = "meet-" + Date.now();
    const newDb = { ...db, meetings: [...db.meetings, { ...meet, id }] };
    saveDbState(newDb);
  };

  const updateMeeting = (id: string, updated: Partial<Meeting>) => {
    const newDb = {
      ...db,
      meetings: db.meetings.map(m => m.id === id ? { ...m, ...updated } : m)
    };
    saveDbState(newDb);
  };

  const deleteMeeting = (id: string) => {
    const newDb = {
      ...db,
      meetings: db.meetings.filter(m => m.id !== id)
    };
    saveDbState(newDb);
  };

  // ----- NOTES -----
  const addNote = (note: Omit<Note, "id">) => {
    const id = "note-" + Date.now();
    const newDb = { ...db, notes: [...db.notes, { ...note, id }] };
    saveDbState(newDb);
  };

  const updateNote = (id: string, updated: Partial<Note>) => {
    const newDb = {
      ...db,
      notes: db.notes.map(n => n.id === id ? { ...n, ...updated } : n)
    };
    saveDbState(newDb);
  };

  const deleteNote = (id: string) => {
    const newDb = {
      ...db,
      notes: db.notes.filter(n => n.id !== id)
    };
    saveDbState(newDb);
  };

  const renameAttachment = (attachmentId: string, newName: string) => {
    const renameInArray = (arr: Attachment[]) => {
      if (!arr) return [];
      return arr.map(att => att.id === attachmentId ? { ...att, fileName: newName } : att);
    };

    const newDb = {
      ...db,
      tasks: db.tasks.map(t => ({
        ...t,
        attachments: renameInArray(t.attachments)
      })),
      taskStations: db.taskStations.map(ts => ({
        ...ts,
        attachments: renameInArray(ts.attachments)
      })),
      taskProgress: db.taskProgress.map(tp => ({
        ...tp,
        attachments: renameInArray(tp.attachments)
      })),
      relatedDocuments: db.relatedDocuments.map(rd => ({
        ...rd,
        attachments: renameInArray(rd.attachments)
      })),
      meetings: db.meetings.map(m => ({
        ...m,
        attachments: renameInArray(m.attachments || [])
      })),
      notes: db.notes.map(n => ({
        ...n,
        attachments: renameInArray(n.attachments || [])
      }))
    };
    saveDbState(newDb);
  };

  // ----- BACKUP / RESTORE -----
  const exportDatabaseJsonString = (): string => {
    return JSON.stringify(db, null, 2);
  };

  const importDatabaseJsonString = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      // Validate schema minimally
      if (
        Array.isArray(parsed.stations) &&
        Array.isArray(parsed.employees) &&
        Array.isArray(parsed.managers) &&
        Array.isArray(parsed.tasks) &&
        Array.isArray(parsed.categories) &&
        Array.isArray(parsed.sources)
      ) {
        saveDbState(parsed);
        return true;
      }
    } catch (e) {
      console.error("Failed to parse or restore database JSON string", e);
    }
    return false;
  };

  const resetDatabaseToDefault = () => {
    saveDbState(INITIAL_DATABASE);
  };

  const loadDemoDatabase = () => {
    saveDbState(DEMO_DATABASE);
  };

  return {
    db,
    addStation,
    updateStation,
    deleteStation,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addManager,
    updateManager,
    deleteManager,
    addCategory,
    updateCategory,
    deleteCategory,
    addSource,
    updateSource,
    deleteSource,
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
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addNote,
    updateNote,
    deleteNote,
    renameAttachment,
    exportDatabaseJsonString,
    importDatabaseJsonString,
    resetDatabaseToDefault,
    loadDemoDatabase
  };
}
