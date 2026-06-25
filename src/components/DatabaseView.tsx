import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { AppDatabase, Category, Source } from "../types";
import { safeLocalStorageGetItem } from "../utils/storageFallback";
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  AlertCircle,
  X,
  Copy
} from "lucide-react";

interface DatabaseViewProps {
  db: AppDatabase;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addSource: (name: string) => void;
  updateSource: (id: string, name: string) => void;
  deleteSource: (id: string) => void;
  exportDatabaseJsonString: () => string;
  importDatabaseJsonString: (jsonStr: string) => boolean;
  resetDatabaseToDefault: () => void;
  loadDemoDatabase: () => void;
  onTriggerAutoBackup?: () => void;
}

export default function DatabaseView({
  db,
  addCategory,
  updateCategory,
  deleteCategory,
  addSource,
  updateSource,
  deleteSource,
  exportDatabaseJsonString,
  importDatabaseJsonString,
  resetDatabaseToDefault,
  loadDemoDatabase,
  onTriggerAutoBackup
}: DatabaseViewProps) {
  
  const [activeTab, setActiveTab] = useState<"DIRECTORIES" | "BACKUP">("DIRECTORIES");

  const [copied, setCopied] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [manualTextStatus, setManualTextStatus] = useState<"IDLE" | "SUCCESS" | "FAILED">("IDLE");

  const handleCopyToClipboard = () => {
    const dataStr = exportDatabaseJsonString();
    navigator.clipboard.writeText(dataStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(err => {
      console.warn("Clipboard API failed, trying textarea fallback", err);
      const tempTextarea = document.createElement("textarea");
      tempTextarea.value = dataStr;
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {
        alert("Не удалось автоматически скопировать. Пожалуйста, скопируйте текст вручную.");
      }
      document.body.removeChild(tempTextarea);
    });
  };

  const handleRestoreFromText = () => {
    if (!backupText.trim()) {
      alert("Вставьте код бэкапа в текстовое поле.");
      return;
    }
    const result = importDatabaseJsonString(backupText.trim());
    if (result) {
      setManualTextStatus("SUCCESS");
      setTimeout(() => {
        setManualTextStatus("IDLE");
        window.location.reload();
      }, 1500);
    } else {
      setManualTextStatus("FAILED");
      setTimeout(() => setManualTextStatus("IDLE"), 4000);
    }
  };

  // Load backups history list
  const [backupsHistory, setBackupsHistory] = useState<any[]>(() => {
    try {
      const raw = safeLocalStorageGetItem("controlcenter_auto_backups_registry");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const refreshBackupsHistory = () => {
    try {
      const raw = safeLocalStorageGetItem("controlcenter_auto_backups_registry");
      setBackupsHistory(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    window.addEventListener("localstorage_backups_sync", refreshBackupsHistory);
    return () => {
      window.removeEventListener("localstorage_backups_sync", refreshBackupsHistory);
    };
  }, []);

  // Editable lists states
  const [newCatName, setNewCatName] = useState("");
  const [newSrcName, setNewSrcName] = useState("");

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatVal, setEditingCatVal] = useState("");

  const [editingSrcId, setEditingSrcId] = useState<string | null>(null);
  const [editingSrcVal, setEditingSrcVal] = useState("");

  // Simulated upload state
  const [importStatus, setImportStatus] = useState<"IDLE" | "SUCCESS" | "FAILED">("IDLE");

  // Trigger Download Backup file with HTML5 Blob for absolute reliability
  const triggerBackupDownload = () => {
    const dataStr = exportDatabaseJsonString();
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `ControlCenter_БазаДанных_Резервный_бэкап_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = exportFileDefaultName;
    document.body.appendChild(linkElement);
    linkElement.click();
    
    // Clean up
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
  };

  // Trigger JSON Upload Restore and refresh application state
  const handleBackupUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const result = importDatabaseJsonString(text);
        if (result) {
          setImportStatus("SUCCESS");
          // Safely refresh the browser context after showing the success indicator
          setTimeout(() => {
            setImportStatus("IDLE");
            window.location.reload();
          }, 1500);
        } else {
          setImportStatus("FAILED");
          setTimeout(() => setImportStatus("IDLE"), 4500);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCreateCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName("");
  };

  const handleCreateSource = (e: FormEvent) => {
    e.preventDefault();
    if (!newSrcName.trim()) return;
    addSource(newSrcName.trim());
    setNewSrcName("");
  };

  const saveUpdatedCategory = (id: string) => {
    if (!editingCatVal.trim()) return;
    updateCategory(id, editingCatVal.trim());
    setEditingCatId(null);
  };

  const saveUpdatedSource = (id: string) => {
    if (!editingSrcVal.trim()) return;
    updateSource(id, editingSrcVal.trim());
    setEditingSrcId(null);
  };

  return (
    <div className="space-y-6" id="database-setup-container">
      {/* View Title Grid structure */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-sans flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            База данных и Справочники
          </h1>
          <p className="text-slate-500 font-medium text-sm">Управление структурами данных, редактирование категорий и резервное копирование (Offline-first)</p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab("DIRECTORIES")}
            className={`font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === "DIRECTORIES" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500"
            }`}
          >
            Справочники
          </button>
          <button
            onClick={() => setActiveTab("BACKUP")}
            className={`font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === "BACKUP" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-550"
            }`}
          >
            Бэкап & Резервирование (Room DB)
          </button>
        </div>
      </div>

      {activeTab === "DIRECTORIES" ? (
        /* 1. EDITABLE DIRECTORIES (Section 18) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="directories-management">
          
          {/* Categories card (Категории поручений) */}
          <div className="bg-white rounded-xl border border-slate-205 shadow-xs p-5 space-y-4">
            <h3 className="font-extrabold text-slate-805 text-xs uppercase tracking-wider">Категории поручений (Редактируемые)</h3>
            
            {/* List */}
            <div className="space-y-1.5 h-64 overflow-y-auto">
              {db.categories.map(cat => {
                const isEditing = editingCatId === cat.id;
                return (
                  <div key={cat.id} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 text-xs">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingCatVal}
                        onChange={e => setEditingCatVal(e.target.value)}
                        className="flex-1 bg-white border border-slate-250 p-1 px-1.5 rounded text-xs focus:outline-none"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                    )}

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveUpdatedCategory(cat.id)} className="text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingCatId(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatVal(cat.name);
                            }} 
                            className="text-xs text-blue-600 hover:underline font-bold"
                          >
                            Изменить
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Удалить категорию "${cat.name}"?`)) {
                                deleteCategory(cat.id);
                              }
                            }} 
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Addition form */}
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Новая категория..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none font-medium text-slate-800"
                required
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 px-3 text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors">
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </form>
          </div>

          {/* Sources Card (Источники поручений) */}
          <div className="bg-white rounded-xl border border-slate-205 shadow-xs p-5 space-y-4">
            <h3 className="font-extrabold text-slate-805 text-xs uppercase tracking-wider">Источники поручений (Редактируемые)</h3>
            
            {/* List */}
            <div className="space-y-1.5 h-64 overflow-y-auto">
              {db.sources.map(src => {
                const isEditing = editingSrcId === src.id;
                return (
                  <div key={src.id} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 text-xs">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingSrcVal}
                        onChange={e => setEditingSrcVal(e.target.value)}
                        className="flex-1 bg-white border border-slate-250 p-1 px-1.5 rounded text-xs focus:outline-none"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800">{src.name}</span>
                    )}

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveUpdatedSource(src.id)} className="text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingSrcId(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingSrcId(src.id);
                              setEditingSrcVal(src.name);
                            }} 
                            className="text-xs text-blue-600 hover:underline font-bold"
                          >
                            Изменить
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Удалить источник "${src.name}"?`)) {
                                deleteSource(src.id);
                              }
                            }} 
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Addition Form */}
            <form onSubmit={handleCreateSource} className="flex gap-2">
              <input
                type="text"
                placeholder="Новый источник..."
                value={newSrcName}
                onChange={e => setNewSrcName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none font-medium text-slate-800"
                required
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 px-3 text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors">
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* 2. BACKUP & RESTORE LOGISTICS (Section 21) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="backup-management">
          
          {/* Backup Creator Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
              <Download className="w-4 h-4 text-slate-500" /> Выгрузка резервных копий
            </h3>
            
            <p className="text-slate-500 text-3xs font-medium leading-relaxed">
              Сохраняйте все накопленные данные (справочник станций, сотрудников, руководителей, поручения, связанных документов и вложений, ход исполнения) в единый защищенный JSON-файл резервной копии.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={triggerBackupDownload}
                className="bg-slate-900 border hover:bg-black text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center gap-2 transition-transform cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Скачать файл копии (.json)
              </button>

              <button
                onClick={handleCopyToClipboard}
                className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center gap-2 transition-transform cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Текст скопирован!" : "Скопировать текст базы"}
              </button>
            </div>

            {copied && (
              <div className="bg-emerald-50 text-emerald-800 text-3xs font-bold p-2.5 rounded-lg border border-emerald-100 animate-pulse">
                ✔️ Текст базы данных успешно скопирован в буфер обмена! Вы можете отправить его себе в мессенджер, заметки или сохранить как текстовый файл.
              </div>
            )}
          </div>

          {/* Backup Restore Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
              <Upload className="w-4 h-4 text-slate-500" /> Восстановление данных
            </h3>

            <p className="text-slate-500 text-3xs font-medium leading-relaxed">
              Загрузите JSON-файл резервной копии, созданный ранее на этом или другом устройстве, для полного восстановления всех структур данных и вложений. **Внимание!** Существующие данные будут перезаписаны.
            </p>

            <div className="space-y-3">
              <input
                type="file"
                accept=".json"
                onChange={handleBackupUpload}
                className="block w-full text-xs text-slate-550 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-105 cursor-pointer"
              />

              {importStatus === "SUCCESS" && (
                <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold p-2.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  Резервная копия успешно восстановлена! Страница обновится.
                </div>
              )}

              {importStatus === "FAILED" && (
                <div className="bg-rose-50 text-rose-800 text-xs font-semibold p-2.5 rounded-lg border border-rose-200 flex items-center gap-1.5 flex-wrap">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Ошибка валидации файла! Проверьте формат бэкапа.
                </div>
              )}
            </div>

            {/* Alternative path: Paste text manually */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Альтернативный способ для планшетов (вставка текста):
              </label>
              <textarea
                placeholder="Вставьте скопированный скопированный ранее текст базы данных (JSON)..."
                value={backupText}
                onChange={e => setBackupText(e.target.value)}
                rows={3}
                className="w-full text-3xs font-mono p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleRestoreFromText}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-3xs flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider transition-colors"
              >
                <Upload className="w-3 h-3" />
                Импортировать из вставленного текста
              </button>

              {manualTextStatus === "SUCCESS" && (
                <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold p-2 rounded-lg border border-emerald-100">
                  ✔️ Данные успешно восстановлены из буфера обмена! Идет обновление интерфейса...
                </div>
              )}

              {manualTextStatus === "FAILED" && (
                <div className="bg-rose-50 text-rose-800 text-xs font-semibold p-2 rounded-lg border border-rose-100">
                  ⚠️ Ошибка импорта! Вставленный текст не является валидным JSON-файлом резервной копии.
                </div>
              )}
            </div>
          </div>

          {/* Daily 17:00 Automatic Backups Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 col-span-1 md:col-span-2 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Автоматический ежедневный бэкап (17:00)
                </h3>
                <p className="text-slate-500 text-3xs font-medium leading-relaxed mt-1">
                  Каждый день при открытом приложении в 17:00 система автоматически формирует резервную копию и инициирует её скачивание.
                </p>
              </div>

              {onTriggerAutoBackup && (
                <button
                  type="button"
                  onClick={() => {
                    onTriggerAutoBackup();
                    setTimeout(() => refreshBackupsHistory(), 500);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 font-extrabold text-white px-3 py-1.5 rounded-lg text-3xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs uppercase tracking-wider"
                  title="Эмулировать наступление 17:00 и запустить резервное копирование"
                >
                  <span>⚡ Симуляция 17:00 (Тест)</span>
                </button>
              )}
            </div>

            {/* List of auto backups stored in registry */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-450 uppercase tracking-wider">История автоматических архивов (Внутренний реестр)</h4>
              
              {backupsHistory.length === 0 ? (
                <div className="bg-slate-50/50 text-slate-400 text-center py-6 text-3xs font-bold rounded-lg border border-dashed border-slate-200">
                  Внутренний реестр пуст. Автоархивы создаются ежедневно в 17:00 или при нажатии кнопки «Симуляция 17:00».
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-150 rounded-lg">
                  <table className="w-full text-left text-3xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-black tracking-widest border-b border-slate-150">
                        <th className="p-2.5">Дата и время</th>
                        <th className="p-2.5">Имя файла архива</th>
                        <th className="p-2.5">Тип</th>
                        <th className="p-2.5 text-right font-black">Операции</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-medium">
                      {backupsHistory.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-sans font-bold text-slate-900">{item.timestamp}</td>
                          <td className="p-2.5 font-mono text-slate-600 text-[10px] truncate max-w-[220px]" title={item.filename}>{item.filename}</td>
                          <td className="p-2.5">
                            {item.isSimulation ? (
                              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase font-sans">Симуляция</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase font-sans">Авто (17:00)</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const blob = new Blob([item.content], { type: "application/json;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = item.filename;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-extrabold cursor-pointer hover:underline"
                            >
                              Скачать
                            </button>
                            <span className="text-slate-350">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Вы действительно хотите ВОССТАНОВИТЬ базу данных из архива от ${item.timestamp}? Текущее состояние таблиц будет перезаписано.`)) {
                                  const result = importDatabaseJsonString(item.content);
                                  if (result) {
                                    alert("База данных восстановлена из контрольной точки!");
                                    window.location.reload();
                                  } else {
                                    alert("Ошибка восстановления. Файл поврежден.");
                                  }
                                }
                              }}
                              className="text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:underline"
                            >
                              Восстановить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Reset database default template */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1.5 text-xs text-slate-800 font-semibold font-sans">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase">Управление состоянием базы данных</h4>
                <p className="text-slate-500 leading-normal font-medium">
                  Вы можете полностью очистить базу данных, чтобы начать её заполнение с нуля вручную по мере использования системы, либо загрузить готовый всесторонний демонстрационный шаблон ОАО "РЖД" (железнодорожные станции, список работников, руководителей, предустановленные пробные поручения и совещания) для мгновенного ознакомления со всем функционалом приложения.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 flex-wrap">
              <button
                onClick={() => {
                  if (confirm("Вы уверены, что хотите ПОЛНОСТЬЮ ОЧИСТИТЬ базу данных? Все созданные вами записи будут утеряны.")) {
                    resetDatabaseToDefault();
                    alert("База данных успешно полностью очищена.");
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-all"
              >
                Очистить базу данных (сделать пустой)
              </button>

              <button
                onClick={() => {
                  if (confirm("Загрузить демонстрационные рельсовые данные ОАО 'РЖД'? Это действие перезапишет ваши текущие локальные данные.")) {
                    loadDemoDatabase();
                    alert("Демонстрационный шаблон успешно загружен!");
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-all"
              >
                Загрузить демонстрационный шаблон (РЖД)
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
