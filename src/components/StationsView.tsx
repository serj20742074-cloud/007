import React, { useState, FormEvent } from "react";
import { AppDatabase, Station, TaskStatus, TaskType } from "../types";
import { Landmark, User, Phone, Edit3, Plus, X, Check, Trash2, ArrowRight } from "lucide-react";
import { getTodayStr, formatDate } from "../utils/date";

interface StationsViewProps {
  db: AppDatabase;
  onNavigateToTask: (taskId: string) => void;
  addStation: (station: Station) => void;
  updateStation: (code: string, updated: Partial<Station>) => void;
  deleteStation: (code: string) => void;
}

export default function StationsView({ 
  db, 
  onNavigateToTask, 
  addStation, 
  updateStation, 
  deleteStation 
}: StationsViewProps) {
  
  const sortedStations = [...db.stations].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);
  const activeStationCode = selectedStationCode || sortedStations[0]?.code || null;

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [leaders, setLeaders] = useState<{ name: string; phone: string }[]>([
    { name: "", phone: "" }
  ]);

  const station = sortedStations.find(s => s.code === activeStationCode);

  // Derive station tasks
  // Filter taskStates from db.taskStations matching this station code
  const stationTaskStates = db.taskStations.filter(ts => ts.stationId === activeStationCode);
  
  const stationTasksDetailed = stationTaskStates.map(state => {
    const parentTask = db.tasks.find(t => t.id === state.taskId);
    return {
      state,
      task: parentTask
    };
  }).filter(item => item.task !== undefined);

  // Calculate statistics (Section 10)
  const activeCount = stationTasksDetailed.filter(item => 
    item.state.status === TaskStatus.InWork || item.state.status === TaskStatus.NotStarted
  ).length;

  const overdueCount = stationTasksDetailed.filter(item => 
    item.state.status === TaskStatus.Overdue || 
    (item.state.status !== TaskStatus.Completed && item.state.status !== TaskStatus.ReportReceived && (item.task?.executeDeadline || "") < getTodayStr())
  ).length;

  const completedCount = stationTasksDetailed.filter(item => 
    item.state.status === TaskStatus.Completed
  ).length;

  const totalCount = stationTasksDetailed.length;
  const executionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Add Station action
  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert("Необходимо указать наименование станции!");
      return;
    }
    // Auto-generate station code (e.g., СТ-8123)
    const generatedCode = `СТ-${Math.floor(1000+Math.random()*9000)}`;
    try {
      const cleanLeaders = leaders.filter(l => l.name.trim() !== "");
      addStation({ 
        code: generatedCode, 
        name, 
        chief: cleanLeaders[0]?.name || "", 
        phone: cleanLeaders[0]?.phone || "",
        leaders: cleanLeaders
      });
      setSelectedStationCode(generatedCode);
      setIsAdding(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Ошибка добавления");
    }
  };

  // Edit Station action
  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStationCode) return;
    const cleanLeaders = leaders.filter(l => l.name.trim() !== "");
    updateStation(selectedStationCode, { 
      name, 
      chief: cleanLeaders[0]?.name || "", 
      phone: cleanLeaders[0]?.phone || "",
      leaders: cleanLeaders
    });
    setIsEditing(false);
  };

  const startEdit = () => {
    if (!station) return;
    setName(station.name);
    if (station.leaders && station.leaders.length > 0) {
      setLeaders(station.leaders.map(l => ({ name: l.name, phone: l.phone })));
    } else if (station.chief) {
      setLeaders([{ name: station.chief, phone: station.phone || "" }]);
    } else {
      setLeaders([{ name: "", phone: "" }]);
    }
    setIsEditing(true);
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const resetForm = () => {
    setName("");
    setLeaders([{ name: "", phone: "" }]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full" id="stations-view-grid">
      {/* 1. Left panel: stations table list (4 columns) */}
      <div className={`lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px] ${
        (selectedStationCode !== null || isAdding || isEditing) ? "hidden lg:flex" : "flex"
      }`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-slate-500" />
            Справочник станций ДЦС
          </h2>
          <button
            onClick={startAdd}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white p-1 text-[11px] px-2 font-semibold rounded flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Добавить
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {sortedStations.map(st => (
            <div
              key={st.code}
              onClick={() => {
                setSelectedStationCode(st.code);
                setIsAdding(false);
                setIsEditing(false);
              }}
              className={`p-3.5 px-4 cursor-pointer transition-all flex justify-between items-center ${
                st.code === activeStationCode ? "bg-blue-50/30 border-r-4 border-blue-600 font-bold" : "hover:bg-slate-50/50"
              }`}
            >
              <div>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded mr-2 uppercase font-extrabold">
                  {st.code}
                </span>
                <span className="text-slate-900 font-bold text-xs">{st.name}</span>
                <p className="text-slate-400 text-4xs font-medium mt-0.5">{st.chief}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Right panel: Detailed view or additions form (8 columns) */}
      <div className={`lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px] overflow-hidden ${
        (selectedStationCode !== null || isAdding || isEditing) ? "flex" : "hidden lg:flex"
      }`}>
        {isAdding ? (
          /* Add Station Form */
          <form onSubmit={handleAddSubmit} className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setSelectedStationCode(null);
                    }}
                    className="lg:hidden bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded text-xs font-bold font-sans transition-colors cursor-pointer"
                  >
                    ← Назад
                  </button>
                  <h3 className="font-bold text-slate-900 text-sm">Регистрация новой железнодорожной станции</h3>
                </div>
                <button type="button" onClick={() => { setIsAdding(false); setSelectedStationCode(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Наименование станции</label>
                  <input
                    type="text"
                    placeholder="Пример: Челябинск-Южный"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none text-xs"
                    required
                  />
                </div>

                <div className="sm:col-span-2 space-y-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Список руководителей станции</span>
                    <button
                      type="button"
                      onClick={() => setLeaders([...leaders, { name: "", phone: "" }])}
                      className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 py-1 px-2.5 rounded font-bold text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-slate-500" /> Добавить строку
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {leaders.map((leader, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50/50 p-2.5 border border-slate-200 rounded-lg">
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              placeholder="ФИО руководителя (например: Иванов И.И.)"
                              value={leader.name}
                              onChange={e => {
                                const updated = [...leaders];
                                updated[index].name = e.target.value;
                                setLeaders(updated);
                              }}
                              className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-semibold focus:outline-none"
                              required={index === 0}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Телефонный номер"
                              value={leader.phone}
                              onChange={e => {
                                const updated = [...leaders];
                                updated[index].phone = e.target.value;
                                setLeaders(updated);
                              }}
                              className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-semibold font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                        {leaders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = leaders.filter((_, i) => i !== index);
                              setLeaders(updated);
                            }}
                            className="p-1 px-2 text-rose-600 hover:bg-rose-50 border border-rose-100 rounded text-xs transition-all cursor-pointer font-bold"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="bg-slate-100 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white font-bold px-5 py-2 rounded-lg text-xs"
              >
                Записать станцию
              </button>
            </div>
          </form>
        ) : isEditing ? (
          /* Edit Station Form */
          <form onSubmit={handleEditSubmit} className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedStationCode(null);
                    }}
                    className="lg:hidden bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded text-xs font-bold font-sans transition-colors cursor-pointer"
                  >
                    ← Назад
                  </button>
                  <h3 className="font-bold text-slate-900 text-sm">Редактирование карточки станции: <span className="text-blue-600">{selectedStationCode}</span></h3>
                </div>
                <button type="button" onClick={() => { setIsEditing(false); setSelectedStationCode(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Наименование станции</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2 space-y-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Список руководителей станции</span>
                    <button
                      type="button"
                      onClick={() => setLeaders([...leaders, { name: "", phone: "" }])}
                      className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 py-1 px-2.5 rounded font-bold text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-slate-500" /> Добавить строку
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {leaders.map((leader, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50/50 p-2.5 border border-slate-200 rounded-lg">
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              placeholder="ФИО руководителя (например: Иванов И.И.)"
                              value={leader.name}
                              onChange={e => {
                                const updated = [...leaders];
                                updated[index].name = e.target.value;
                                setLeaders(updated);
                              }}
                              className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-semibold focus:outline-none"
                              required={index === 0}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Телефонный номер"
                              value={leader.phone}
                              onChange={e => {
                                const updated = [...leaders];
                                updated[index].phone = e.target.value;
                                setLeaders(updated);
                              }}
                              className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-semibold font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                        {leaders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = leaders.filter((_, i) => i !== index);
                              setLeaders(updated);
                            }}
                            className="p-1 px-2 text-rose-600 hover:bg-rose-50 border border-rose-100 rounded text-xs transition-all cursor-pointer font-bold"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-slate-100 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white font-bold px-5 py-2 rounded-lg text-xs animate-none"
              >
                Сохранить изменения
              </button>
            </div>
          </form>
        ) : !station ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 text-center">
            <Landmark className="w-12 h-12 mb-3 text-slate-200" />
            <p className="font-semibold text-sm">Выберите станцию для детальной информации</p>
          </div>
        ) : (
          /* Detailed Station Card and Metrics */
          <div className="flex-1 flex flex-col h-full overflow-y-auto">
            {/* Header portion */}
            <div className="p-5 bg-slate-50/50 border-b border-rose-100/10 space-y-3">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setSelectedStationCode(null)}
                    className="lg:hidden bg-slate-200 hover:bg-slate-300 active:bg-slate-350 text-slate-800 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    ← К списку
                  </button>
                  <div>
                    <span className="bg-slate-200 text-slate-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                      Код: {station.code}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 border-none mt-1">{station.name}</h2>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={startEdit}
                    className="bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Изменить данные
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Вы уверены, что хотите удалить станцию ${station.name}? Это сотрет ее из всех ассоциированных массовых поручений.`)) {
                        deleteStation(station.code);
                        setSelectedStationCode(sortedStations[1]?.code || sortedStations[0]?.code || null);
                      }
                    }}
                    className="border border-rose-200 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-lg text-xs text-rose-600 font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Удалить
                  </button>
                </div>
              </div>

              {/* Leader Profiles details display */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl text-3xs font-semibold leading-relaxed space-y-3">
                <span className="text-[10px] text-slate-400 block font-normal uppercase tracking-wider">Руководство станции</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(station.leaders && station.leaders.length > 0 ? station.leaders : [{ name: station.chief, phone: station.phone }]).map((leader, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150 gap-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-800 font-bold text-xs">{leader.name || "Не указан"}</span>
                      </div>
                      {leader.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{leader.phone}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics Row (Section 10) */}
            <div className="p-5">
              <h3 className="font-bold text-slate-900 text-xs mb-3 uppercase tracking-wider">Показатели исполнительской дисциплины станции</h3>
              
              <div className="grid grid-cols-4 gap-3 text-center text-xs font-semibold">
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block uppercase font-normal mb-1">Всего поручений</span>
                  <span className="font-mono text-xl font-extrabold text-slate-900">{totalCount}</span>
                </div>

                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                  <span className="text-amber-500 block uppercase font-normal text-[10px] mb-1">В работе</span>
                  <span className="font-mono text-xl font-extrabold text-slate-900">{activeCount}</span>
                </div>

                <div className="bg-rose-50/40 border border-rose-150 rounded-xl p-3">
                  <span className="text-rose-600 block uppercase font-normal text-[10px] mb-1">Просрочено</span>
                  <span className="font-mono text-xl font-extrabold text-rose-600">{overdueCount}</span>
                </div>

                <div className="bg-blue-50/25 border border-blue-150 rounded-xl p-3">
                  <span className="text-blue-600 block uppercase font-normal text-[10px] mb-1">ИСПОЛНЕНИЕ В СРОК</span>
                  <span className="font-mono text-xl font-extrabold text-blue-600">{executionRate}%</span>
                </div>
              </div>
            </div>

            {/* List of Tasks Assigned below (Section 10) */}
            <div className="p-5 border-t border-slate-100 flex-1 space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Все поручения по данной станции</h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {stationTasksDetailed.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-10 font-bold italic">Станция не завязана ни в одном активном массовом или индивидуальном поручении.</p>
                ) : (
                  stationTasksDetailed.map(item => (
                    <div 
                      key={item.state.taskId} 
                      className="bg-slate-50/50 hover:bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-200 text-slate-800 text-[9px] font-bold font-mono px-1 rounded">
                            {item.task?.id}
                          </span>
                          <span className="text-3xs text-slate-400 font-bold font-mono">Срок исполнения: {formatDate(item.task?.executeDeadline)}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs border-none leading-tight">{item.task?.title}</h4>
                        {item.state.comment && (
                          <p className="text-[10px] text-slate-500 font-medium italic">« {item.state.comment} »</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase inline-block ${
                            item.state.status === TaskStatus.Completed ? "bg-emerald-105 text-emerald-700" :
                            item.state.status === TaskStatus.ReportReceived ? "bg-blue-105 text-blue-700" :
                            item.state.status === TaskStatus.InWork ? "bg-amber-105 text-amber-700" : "bg-rose-105 text-rose-700"
                          }`}>
                            ДС: {item.state.status}
                          </span>
                        </div>

                        <button
                          onClick={() => onNavigateToTask(item.state.taskId)}
                          className="bg-white hover:bg-slate-105 text-slate-700 border border-slate-205 p-1 px-2.5 rounded font-bold text-[9px] flex items-center gap-0.5 cursor-pointer transition-colors"
                        >
                          Смотреть
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
