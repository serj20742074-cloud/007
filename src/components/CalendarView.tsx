import { useState } from "react";
import { AppDatabase, Task, TaskStatus, Meeting, Note } from "../types";
import { Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye, Clock, X } from "lucide-react";
import { getTodayStr, formatDate, getTaskBgClass, getDaysRemaining } from "../utils/date";

interface CalendarViewProps {
  db: AppDatabase;
  onNavigateToTask: (taskId: string) => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
}

export default function CalendarView({ 
  db, 
  onNavigateToTask,
  onNavigateToMeeting,
  onNavigateToNote
}: CalendarViewProps) {
  const todayDate = new Date();
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth()); // 0-indexed, e.g. 5 = June

  
  const [selectedDayItems, setSelectedDayItems] = useState<{
    dateStr: string;
    tasksDue: Task[];
    tasksInfo: Task[];
    meetings: Meeting[];
    notes: Note[];
  } | null>(null);

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  // Helper: Number of days in current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper: Weekday of 1st day of month (0 = Sun, 1 = Mon...)
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    // Convert to European style (0 = Mon, 6 = Sun)
    return day === 0 ? 6 : day - 1;
  };

  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Month modification handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDayItems(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDayItems(null);
  };

  // Render Days Grid
  const calendarDays = [];
  // Empty slots for preceding days
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Days of month
  for (let i = 1; i <= daysCount; i++) {
    calendarDays.push(i);
  }

  // Retrieve metrics for a specific date cell
  const getItemsForDate = (dayNum: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(dayNum).padStart(2, "0");
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    // 1. Task executions
    const tasksDue = db.tasks.filter(t => t.executeDeadline === dateStr);
    
    // 2. Task info submission dates
    const tasksInfo = db.tasks.filter(t => t.infoDeadline === dateStr);

    // 3. Meetings
    const meetings = db.meetings.filter(m => m.date === dateStr);

    // 4. Notes/notifications
    const notes = db.notes.filter(n => n.reminderDate === dateStr);

    return { dateStr, tasksDue, tasksInfo, meetings, notes };
  };

  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div className="space-y-6" id="calendar-view-container">
      {/* View Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-sans flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-650" />
            Календарь контрольных сроков
          </h1>
          <p className="text-slate-500 font-medium text-sm">Сводное планирование, селекторы, замеры и дедлайны по всем станциям центра</p>
        </div>

        {/* Month Picker Controls */}
        <div className="flex items-center gap-3 bg-white border border-slate-205 p-1 rounded-xl">
          <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-800 text-sm w-36 text-center font-sans">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid + Information Side Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Weekly matrix: 8 Columns */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          {/* Weekdays headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-3xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 font-sans">
            {weekdays.map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Matrix Days Cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="bg-slate-50/20 aspect-video rounded-lg" />;
              }

              const { dateStr, tasksDue, tasksInfo, meetings, notes } = getItemsForDate(dayNum);
              const isToday = dateStr === getTodayStr();
              const totalEvents = tasksDue.length + tasksInfo.length + meetings.length + notes.length;

              // Find the daily urgency status based on tasks and notes
              let cellBgClass = "bg-white border-slate-150";
              const totalColorable = tasksDue.length + tasksInfo.length + notes.length;
              if (totalColorable > 0) {
                // Check if all colorable are completed
                const allCompleted = 
                  tasksDue.every(t => t.status === TaskStatus.Completed) &&
                  tasksInfo.every(t => t.status === TaskStatus.Completed) &&
                  notes.every(n => !!n.isCompleted);

                // Check if any colorable is uncompleted and overdue
                const anyOverdueAndUncompleted =
                  tasksDue.some(t => t.status !== TaskStatus.Completed && (t.status === TaskStatus.Overdue || getDaysRemaining(t.executeDeadline) < 0)) ||
                  tasksInfo.some(t => t.status !== TaskStatus.Completed && getDaysRemaining(t.infoDeadline) < 0) ||
                  notes.some(n => !n.isCompleted && getDaysRemaining(n.reminderDate) < 0);

                if (allCompleted) {
                  cellBgClass = "bg-slate-100 text-slate-400 border-slate-205 hover:bg-slate-150";
                } else if (anyOverdueAndUncompleted) {
                  cellBgClass = "bg-rose-50 text-rose-950 border-rose-300 hover:bg-rose-100";
                } else {
                  // Check if any are <= 6 days
                  const anyNearUncompleted =
                    tasksDue.some(t => t.status !== TaskStatus.Completed && getDaysRemaining(t.executeDeadline) <= 6) ||
                    tasksInfo.some(t => t.status !== TaskStatus.Completed && getDaysRemaining(t.infoDeadline) <= 6) ||
                    notes.some(n => !n.isCompleted && getDaysRemaining(n.reminderDate) <= 6);

                  if (anyNearUncompleted) {
                    cellBgClass = "bg-amber-50 text-amber-950 border-amber-305 hover:bg-amber-100";
                  } else {
                    cellBgClass = "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100/80";
                  }
                }
              }

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDayItems({ dateStr, tasksDue, tasksInfo, meetings, notes })}
                  id={`calendar-day-${dayNum}`}
                  className={`border text-left p-2 rounded-xl min-h-[75px] flex flex-col justify-between hover:scale-[1.01] hover:shadow-xs hover:border-indigo-400 cursor-pointer transition-all ${cellBgClass} ${
                    isToday ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                  } ${totalEvents > 0 ? "shadow-2xs" : ""}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-sans text-xs font-black ${
                      isToday ? "bg-indigo-600 text-white w-5 h-5 inline-flex items-center justify-center rounded-full" : "text-slate-800"
                    }`}>
                      {dayNum}
                    </span>
                    {totalEvents > 0 && (
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    )}
                  </div>

                  {/* Badges indicators for calendar events */}
                  <div className="space-y-1 overflow-hidden max-h-16">
                    {/* Tasks Executions Badges */}
                    {tasksDue.map(t => {
                      const isCompleted = t.status === TaskStatus.Completed;
                      const isOverdue = t.status === TaskStatus.Overdue || getDaysRemaining(t.executeDeadline) < 0;
                      let badgeClass = "bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-105 hover:text-red-700 hover:border-red-300";
                      if (isCompleted) {
                        badgeClass = "bg-slate-200/70 border border-slate-300 text-slate-500 hover:bg-slate-300 hover:text-slate-700";
                      } else if (isOverdue) {
                        badgeClass = "bg-red-100 border border-red-300 text-red-700 hover:bg-red-200 hover:text-red-800";
                      }
                      return (
                        <div 
                          key={t.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTask(t.id);
                          }}
                          className={`${badgeClass} transition-colors text-[8px] font-extrabold px-1 py-0.5 rounded truncate font-mono`}
                          title={`Поручение: ${t.title}`}
                        >
                          К: {t.id} {isCompleted && "✓"}
                        </div>
                      );
                    })}

                    {/* Tasks Info submission Badges */}
                    {tasksInfo.map(t => {
                      const isCompleted = t.status === TaskStatus.Completed;
                      const isOverdue = getDaysRemaining(t.infoDeadline) < 0;
                      let badgeClass = "bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-105 hover:text-amber-800 hover:border-amber-300";
                      if (isCompleted) {
                        badgeClass = "bg-slate-200/70 border border-slate-300 text-slate-500 hover:bg-slate-300 hover:text-slate-700";
                      } else if (isOverdue) {
                        badgeClass = "bg-red-100 border border-red-300 text-red-700 hover:bg-red-200 hover:text-red-800";
                      }
                      return (
                        <div 
                          key={t.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTask(t.id);
                          }}
                          className={`${badgeClass} transition-colors text-[8px] font-extrabold px-1 py-0.5 rounded truncate font-mono`}
                          title={`Срок подачи: ${t.title}`}
                        >
                          И: {t.id} {isCompleted && "✓"}
                        </div>
                      );
                    })}

                    {/* Meetings Badges (Blue) */}
                    {meetings.map(m => (
                      <div 
                        key={m.id} 
                        onClick={(e) => {
                          if (onNavigateToMeeting) {
                            e.stopPropagation();
                            onNavigateToMeeting(m.id);
                          }
                        }}
                        className="bg-blue-50 border border-blue-100 hover:bg-blue-105 hover:text-blue-800 hover:border-blue-300 transition-colors text-blue-700 text-[8px] font-extrabold px-1 py-0.5 rounded truncate font-mono"
                        title={`Совещание: ${m.theme}`}
                      >
                        С: {m.theme}
                      </div>
                    ))}

                    {/* Notes (Indigo) */}
                    {notes.map(n => {
                      const isCompleted = !!n.isCompleted;
                      const isOverdue = getDaysRemaining(n.reminderDate) < 0;
                      let badgeClass = "bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-105 hover:text-indigo-800 hover:border-indigo-305";
                      if (isCompleted) {
                        badgeClass = "bg-slate-200/70 border border-slate-300 text-slate-500 hover:bg-slate-300 hover:text-slate-750";
                      } else if (isOverdue) {
                        badgeClass = "bg-red-100 border border-red-300 text-red-700 hover:bg-red-200 hover:text-red-800";
                      }
                      return (
                        <div 
                          key={n.id} 
                          onClick={(e) => {
                            if (onNavigateToNote) {
                              e.stopPropagation();
                              onNavigateToNote(n.id);
                            }
                          }}
                          className={`${badgeClass} transition-colors text-[8px] font-extrabold px-1 py-0.5 rounded truncate font-mono`}
                          title={`Напоминание: ${n.title}`}
                        >
                          Н: {n.title} {isCompleted && "✓"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected date drawer panel: 4 Columns */}
        <div className="xl:col-span-4">
          {!selectedDayItems ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-250 p-10 text-center text-slate-400 text-xs font-semibold h-full flex flex-col items-center justify-center">
              <CalendarIcon className="w-10 h-10 text-slate-200 mb-2" />
              Выберите конкретный день на календаре для раскрытия подробного плана контролей
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-205 shadow-xs p-5 space-y-4" id="calendar-day-drawer">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">План контролей на день</h3>
                  <span className="text-indigo-600 font-mono font-bold text-xs">{formatDate(selectedDayItems.dateStr)}</span>
                </div>
                <button onClick={() => setSelectedDayItems(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Day items lists */}
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {/* 1. Task executution due dates (К) */}
                {selectedDayItems.tasksDue.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-red-650 uppercase font-black tracking-wider block">Исполнение поручений (КАРТОЧКА)</span>
                    {selectedDayItems.tasksDue.map(t => {
                      const bgClass = getTaskBgClass(t.executeDeadline, t.status);
                      return (
                        <div key={t.id} className={`${bgClass} p-2.5 rounded-lg border text-3xs space-y-1`}>
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900 leading-tight underline hover:text-indigo-650 cursor-pointer" onClick={() => onNavigateToTask(t.id)}>
                              [{t.id}] {t.title}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium line-clamp-2">{t.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Tasks info deadlines (И) */}
                {selectedDayItems.tasksInfo.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-amber-650 uppercase font-black tracking-wider block font-sans">Срок подачи информации (СВЕРКА)</span>
                    {selectedDayItems.tasksInfo.map(t => {
                      const bgClass = getTaskBgClass(t.executeDeadline, t.status);
                      return (
                        <div key={t.id} className={`${bgClass} p-2.5 rounded-lg border text-3xs space-y-1`}>
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900 leading-tight underline hover:text-indigo-650 cursor-pointer" onClick={() => onNavigateToTask(t.id)}>
                              [{t.id}] {t.title}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium line-clamp-2">{t.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Meetings (С) */}
                {selectedDayItems.meetings.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-blue-600 uppercase font-black tracking-wider block">Селекторы & Совещания</span>
                    {selectedDayItems.meetings.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => onNavigateToMeeting && onNavigateToMeeting(m.id)}
                        className={`bg-blue-50/50 p-2.5 rounded-lg border border-blue-155 text-3xs space-y-1 cursor-pointer transition-all ${
                          onNavigateToMeeting ? "hover:bg-blue-100/55 hover:border-blue-300" : ""
                        }`}
                        title={onNavigateToMeeting ? "Нажмите, чтобы открыть карточку совещания" : undefined}
                      >
                        <span className="font-bold text-slate-900 block font-mono underline hover:text-indigo-650">[{m.time}] {m.theme}</span>
                        <p className="text-slate-500 font-semibold line-clamp-2 leading-relaxed">Председатель: {m.leader}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Notes (Н) */}
                {selectedDayItems.notes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-indigo-650 uppercase font-black tracking-wider block">Активные напоминания</span>
                    {selectedDayItems.notes.map(n => {
                      const isCompleted = !!n.isCompleted;
                      const isOverdue = getDaysRemaining(n.reminderDate) < 0;
                      let noteBgClass = "bg-indigo-50/50 border-indigo-155";
                      let titleClass = "text-slate-900";
                      
                      if (isCompleted) {
                        noteBgClass = "bg-slate-100 border-slate-205 opacity-80";
                        titleClass = "text-slate-500 line-through decoration-emerald-500/50";
                      } else if (isOverdue) {
                        noteBgClass = "bg-rose-50/50 border-rose-200";
                        titleClass = "text-red-900";
                      }

                      return (
                        <div 
                          key={n.id} 
                          onClick={() => onNavigateToNote && onNavigateToNote(n.id)}
                          className={`${noteBgClass} p-2.5 rounded-lg border text-3xs space-y-1 cursor-pointer transition-all ${
                            onNavigateToNote ? "hover:bg-indigo-100/55 hover:border-indigo-305" : ""
                          }`}
                          title={onNavigateToNote ? "Нажмите, чтобы открыть эту заметку" : undefined}
                        >
                          <span className={`font-bold ${titleClass} block underline hover:text-emerald-700`}>
                            [{n.reminderTime || "Весь день"}] {n.title} {isCompleted && "✓ (Отработано)"}
                          </span>
                          <p className={`font-medium leading-relaxed ${isCompleted ? "text-slate-400" : "text-slate-500"}`}>{n.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Blank check */}
                {selectedDayItems.tasksDue.length === 0 &&
                 selectedDayItems.tasksInfo.length === 0 &&
                 selectedDayItems.meetings.length === 0 &&
                 selectedDayItems.notes.length === 0 && (
                  <div className="p-10 text-center text-slate-400 text-xs italic font-medium">
                    Нет активных контролей или событий на данный день.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
