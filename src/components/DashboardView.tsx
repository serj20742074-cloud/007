import { 
  AppDatabase, 
  Task, 
  TaskStatus, 
  TaskType, 
  Meeting, 
  Note, 
  ImportanceLevel 
} from "../types";
import { 
  CheckSquare, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  ShieldAlert, 
  ChevronRight, 
  Users, 
  Clock, 
  Bell 
} from "lucide-react";
import { getTodayStr, formatDate } from "../utils/date";

interface DashboardViewProps {
  db: AppDatabase;
  onNavigateToTask: (taskId: string) => void;
  onNavigateToTab: (tabId: string) => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
}

export default function DashboardView({ 
  db, 
  onNavigateToTask, 
  onNavigateToTab,
  onNavigateToMeeting,
  onNavigateToNote
}: DashboardViewProps) {
  const todayStr = getTodayStr();


  // Calculations
  const activeTasks = db.tasks.filter(t => t.status !== TaskStatus.Completed).length;
  
  const dueTodayTasks = db.tasks.filter(t => 
    t.status !== TaskStatus.Completed && 
    (t.executeDeadline === todayStr || t.infoDeadline === todayStr)
  );

  const overdueTasks = db.tasks.filter(t => t.status === TaskStatus.Overdue).length;

  const specialControlTasks = db.tasks.filter(t => t.specialControl).length;

  // Mass tasks with debtors
  // A mass task has debtors if there are stations associated with it that have states: NotStarted or InWork
  const massTasksWithDebtors = db.tasks.filter(t => t.type === TaskType.Massive).map(task => {
    const associatedStations = db.taskStations.filter(ts => ts.taskId === task.id);
    const debtors = associatedStations.filter(
      ts => ts.status === TaskStatus.NotStarted || ts.status === TaskStatus.InWork
    ).map(ts => {
      const station = db.stations.find(s => s.code === ts.stationId);
      return {
        code: ts.stationId,
        name: station ? station.name : ts.stationId,
        status: ts.status,
        chief: station ? station.chief : ""
      };
    });

    return {
      task,
      debtors,
      total: associatedStations.length,
      done: associatedStations.filter(ts => ts.status === TaskStatus.Completed).length
    };
  }).filter(item => item.debtors.length > 0);

  // Upcoming meetings (meetings from today onwards, sorted by date then time)
  const upcomingMeetings = db.meetings
    .filter(m => m.date >= todayStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    })
    .slice(0, 5);

  // Active reminders
  // Filter notes that have reminderDate set
  const activeNotesReminders = db.notes
    .filter(n => n.reminderDate)
    .sort((a, b) => (a.reminderDate || "").localeCompare(b.reminderDate || ""))
    .slice(0, 5);

  return (
    <div className="space-y-6" id="dashboard-view-container">
      {/* Top Banner & Stats Bento Layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Сводный дашборд</h1>
          <p className="text-slate-500 font-medium text-sm">Оперативная обстановка на {todayStr} | АРМ Руководителя центра</p>
        </div>
        
        {/* Connection status for offline reassurance */}
        <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-800 border border-emerald-250 p-2 px-3 rounded-xl text-3xs font-extrabold uppercase tracking-wide shrink-0">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          РЦ-Офлайн: Полная автономность
        </div>
      </div>


      {/* Grid count cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Tasks Card */}
        <div 
          onClick={() => onNavigateToTab("tasks")}
          id="stat-card-active"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer flex items-center space-x-4"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Поручения в работе</p>
            <p className="text-2xl font-bold text-slate-900">{activeTasks}</p>
          </div>
        </div>

        {/* Due Today Card */}
        <div 
          onClick={() => onNavigateToTab("tasks")}
          id="stat-card-due-today"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer flex items-center space-x-4"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Срок сегодня</p>
            <p className="text-2xl font-bold text-slate-900">{dueTodayTasks.length}</p>
          </div>
        </div>

        {/* Overdue Card */}
        <div 
          onClick={() => onNavigateToTab("tasks")}
          id="stat-card-overdue"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all cursor-pointer flex items-center space-x-4"
        >
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Просроченные</p>
            <p className="text-2xl font-bold text-rose-600">{overdueTasks}</p>
          </div>
        </div>

        {/* Special Control Card */}
        <div 
          onClick={() => onNavigateToTab("tasks")}
          id="stat-card-special-control"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer flex items-center space-x-4"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Особый контроль</p>
            <p className="text-2xl font-bold text-slate-900">{specialControlTasks}</p>
          </div>
        </div>
      </div>

      {/* Main Content Areas split horizontally */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Debtors / Mass tasks & notes (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: Mass tasks with debtors */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="dashboard-mass-tasks-section">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                Массовые поручения с должниками
              </h2>
              <span className="text-xs bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-medium">
                {massTasksWithDebtors.length} поруч.
              </span>
            </div>
            
            <div className="p-4 divide-y divide-slate-150">
              {massTasksWithDebtors.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm font-medium">
                  Должников по массовым поручениям не обнаружено. Отличная дисциплина!
                </div>
              ) : (
                massTasksWithDebtors.map(item => (
                  <div key={item.task.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.task.id}
                          </span>
                          <span className={`text-2xs px-2 py-0.5 rounded font-semibold ${
                            item.task.importance === ImportanceLevel.Urgent ? "bg-red-50 text-red-700 border border-red-150" :
                            item.task.importance === ImportanceLevel.Important ? "bg-amber-50 text-amber-700 border border-amber-150" :
                            "bg-slate-50 text-slate-600 border border-slate-150"
                          }`}>
                            {item.task.importance}
                          </span>
                        </div>
                        <h4 
                          onClick={() => onNavigateToTask(item.task.id)}
                          className="font-medium text-slate-900 border-b border-transparent hover:border-blue-600 hover:text-blue-600 transition-colors text-sm mt-1 cursor-pointer"
                        >
                          {item.task.title}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block font-medium">
                          Срок: <strong className="text-slate-800">{formatDate(item.task.executeDeadline)}</strong>
                        </span>
                        <div className="mt-1 text-2xs text-slate-500 font-bold">
                          Исполнение: <span className="text-blue-600 font-extrabold">{item.done}/{item.total}</span> ст.
                        </div>
                      </div>
                    </div>

                    {/* Progress bar of station completion */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3 border border-slate-200">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                        style={{ width: `${item.total > 0 ? (item.done / item.total) * 100 : 0}%` }}
                      />
                    </div>

                    {/* List of debtor stations */}
                    <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-150">
                      <p className="text-2xs text-slate-400 font-bold uppercase tracking-wider mb-2">Не отчитались станций ({item.debtors.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {item.debtors.map(debtor => (
                          <div 
                            key={debtor.code}
                            id={`debtor-${debtor.code}`}
                            className="bg-white hover:bg-slate-50 border border-slate-200 rounded p-1.5 px-2.5 text-xs flex justify-between items-center gap-4 cursor-pointer transition-colors"
                            onClick={() => onNavigateToTask(item.task.id)}
                          >
                            <span className="font-semibold text-slate-800">{debtor.name}</span>
                            <span className="text-3xs font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded font-mono">
                              {debtor.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Meetings and Reminders (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upcoming Meetings widget */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="dashboard-meetings-widget">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                Ближайшие совещания
              </h3>
              <button 
                onClick={() => onNavigateToTab("meetings")}
                className="text-xs text-blue-600 font-medium hover:underline flex items-center"
              >
                Все
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {upcomingMeetings.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs font-medium">
                  Нет запланированных совещаний.
                </div>
              ) : (
                upcomingMeetings.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => onNavigateToMeeting && onNavigateToMeeting(m.id)}
                    className={`py-3 first:pt-0 last:pb-0 space-y-1 block p-1.5 rounded-lg transition-all cursor-pointer ${
                      onNavigateToMeeting ? "hover:bg-indigo-50/70" : ""
                    }`}
                    title={onNavigateToMeeting ? "Нажмите, чтобы открыть карточку совещания" : undefined}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        m.date === todayStr ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {m.date === todayStr ? "Сегодня" : formatDate(m.date)} в {m.time}
                      </span>
                    </div>
                    <h5 className="font-semibold text-slate-900 text-xs line-clamp-2 hover:text-indigo-600 hover:underline">
                      {m.theme}
                    </h5>
                    <p className="text-slate-500 text-3xs line-clamp-2 leading-relaxed">
                      {m.description || "Описания нет"}
                    </p>
                    <div className="text-3xs text-slate-400 font-medium font-mono">
                      Руководитель: {m.leader}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Reminders / Notes widget */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="dashboard-reminders-widget">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                Напоминания и заметки
              </h3>
              <button 
                onClick={() => onNavigateToTab("notes")}
                className="text-xs text-blue-600 font-medium hover:underline flex items-center"
              >
                Архив
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {activeNotesReminders.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs font-medium">
                  Активных напоминаний нет.
                </div>
              ) : (
                activeNotesReminders.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => onNavigateToNote && onNavigateToNote(note.id)}
                    className={`py-3 first:pt-0 last:pb-0 space-y-1 block p-1.5 rounded-lg transition-all cursor-pointer ${
                      onNavigateToNote ? "hover:bg-emerald-50/70" : ""
                    }`}
                    title={onNavigateToNote ? "Нажмите, чтобы открыть эту заметку" : undefined}
                  >
                    <div className="flex justify-between items-center text-3xs font-bold text-indigo-600 uppercase tracking-wider">
                      <span>Напоминание</span>
                      <span className="font-mono">
                        {note.reminderDate} {note.reminderTime}
                      </span>
                    </div>
                    <h5 className="font-semibold text-slate-900 text-xs hover:text-emerald-700 hover:underline">
                      {note.title}
                    </h5>
                    <p className="text-slate-500 text-3xs line-clamp-3 leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
