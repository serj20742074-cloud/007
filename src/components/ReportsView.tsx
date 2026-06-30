import { useState } from "react";
import { AppDatabase, Task, TaskStatus, TaskType } from "../types";
import { 
  FileSpreadsheet, 
  Printer, 
  ChevronRight, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  BarChart, 
  Activity, 
  Award,
  Download,
  X,
  Paperclip,
  User,
  Folder,
  FileText,
  Calendar
} from "lucide-react";
import { getTodayStr, formatDate } from "../utils/date";

interface ReportsViewProps {
  db: AppDatabase;
  onNavigateToTask?: (taskId: string) => void;
}

type ReportType = 
  | "STATION"
  | "CHIEF"
  | "EMPLOYEE"
  | "MANAGER"
  | "CATEGORY"
  | "SOURCE"
  | "DEADLINE"
  | "MASSIVE"
  | "DEBTORS"
  | "OVERDUE";

export default function ReportsView({ db, onNavigateToTask }: ReportsViewProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("STATION");
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Auxiliary date mock
  const todayStr = getTodayStr();

  // Excel UTF-8 CSV download trigger
  const exportToExcelFormat = (title: string, headers: string[], rows: string[][]) => {
    // Construct tab separated text with BOM to support Russian Cyrillic characters perfectly inside MS Excel
    const BOM = "\uFEFF";
    let tsvContent = BOM + headers.join("\t") + "\n";
    rows.forEach(row => {
      tsvContent += row.map(val => String(val).replace(/[\t\n]/g, " ")).join("\t") + "\n";
    });

    const blob = new Blob([tsvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}_Экспорт.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDFFormat = (title: string, reportName: string, headers: string[], rows: string[][]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Не удалось открыть окно экспорта. Пожалуйста, разрешите всплывающие окна.");
      return;
    }

    const headerThs = headers.map(h => `<th>${h}</th>`).join("");
    const bodyTrs = rows.map(row => {
      const tds = row.map(val => `<td>${val}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportName}</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1e293b;
              margin: 30px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #ef4444;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 11px;
              font-family: monospace;
              color: #64748b;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: bold;
              color: #475569;
              margin-bottom: 15px;
              background-color: #f8fafc;
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px dashed #cbd5e1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-top: 10px;
              color: #0f172a;
            }
            th {
              background-color: #ef4444;
              color: white;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              padding: 8px 10px;
              text-align: left;
              border: 1px solid #dc2626;
            }
            td {
              padding: 7px 10px;
              border: 1px solid #e2e8f0;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
            @media print {
              body { margin: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportName}</h1>
            <p>АРМ ControlCenter • Аналитическая отчетность</p>
          </div>
          <div class="meta-info">
            <div>Дата формирования: ${todayStr}</div>
            <div>Статус: Сформировано успешно</div>
          </div>
          <table>
            <thead>
              <tr>
                ${headerThs}
              </tr>
            </thead>
            <tbody>
              ${bodyTrs}
            </tbody>
          </table>
          <div class="footer">
            Документ сформирован автоматически в АРМ ControlCenter.
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // 1. STATION REPORT LOGIC
  const getStationReportData = () => {
    const stationStats = db.stations.map(st => {
      const parentStates = db.taskStations.filter(ts => ts.stationId === st.code);
      const total = parentStates.length;
      const completed = parentStates.filter(ts => ts.status === TaskStatus.Completed).length;
      const progress = parentStates.filter(ts => ts.status === TaskStatus.ReportReceived).length;
      const inWork = parentStates.filter(ts => ts.status === TaskStatus.InWork).length;
      const overdue = parentStates.filter(ts => 
        ts.status === TaskStatus.Overdue || 
        (ts.status !== TaskStatus.Completed && ts.status !== TaskStatus.ReportReceived && (db.tasks.find(t => t.id === ts.taskId)?.executeDeadline || "") < todayStr)
      ).length;

      const rate = total > 0 ? Math.round((completed / total) * 105) : 100;
      return {
        code: st.code,
        name: st.name,
        chief: st.chief,
        total,
        completed,
        progress,
        inWork,
        overdue,
        rate: rate > 100 ? 100 : rate // bound at 100%
      };
    }).sort((a,b) => b.rate - a.rate);

    const headers = ["Код", "Станция", "ДС (Начальник)", "Поручений", "Выполнено", "В работе", "С задержкой(Просрочено)", "Процент дисциплины"];
    const rows = stationStats.map(s => [s.code, s.name, s.chief, String(s.total), String(s.completed), String(s.inWork + s.progress), String(s.overdue), `${s.rate}%`]);

    return { data: stationStats, headers, rows, title: "Реестр_показателей_станций_ДЦС" };
  };

  // 2. CHIEF DISCIPLINE REPORT LOGIC
  const getChiefReportData = () => {
    return getStationReportData(); // Since chiefs are directly on stations, this maps cleanly.
  };

  // 3. EMPLOYEE DISCIPLINE REPORT LOGIC
  const getEmployeeReportData = () => {
    const empStats = db.employees.map(emp => {
      // Find all individual tasks where this employee is assigned
      const assignedTasks = db.tasks.filter(t => 
        t.type === TaskType.Individual && t.assignments?.includes(emp.id)
      );
      const total = assignedTasks.length;
      const completed = assignedTasks.filter(t => t.status === TaskStatus.Completed).length;
      const inWork = assignedTasks.filter(t => t.status === TaskStatus.InWork || t.status === TaskStatus.ReportReceived).length;
      const overdue = assignedTasks.filter(t => t.status === TaskStatus.Overdue).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

      return {
        id: emp.id,
        name: emp.fullName,
        role: emp.role,
        department: emp.department,
        total,
        completed,
        inWork,
        overdue,
        rate
      };
    });

    const headers = ["ФИО Работника", "Должность", "Подразделение", "Всего поручений", "Выполнено", "В работе", "Задержано", "Процент исполнения"];
    const rows = empStats.map(e => [e.name, e.role, e.department, String(e.total), String(e.completed), String(e.inWork), String(e.overdue), `${e.rate}%`]);

    return { data: empStats, headers, rows, title: "Дисциплина_работников_ДЦС" };
  };

  // 4. MANAGER REPORT LOGIC
  const getManagerReportData = () => {
    const manStats = db.managers.map(man => {
      const givenTasks = db.tasks.filter(t => t.managerId === man.id);
      const total = givenTasks.length;
      const completed = givenTasks.filter(t => t.status === TaskStatus.Completed).length;
      const inWork = givenTasks.filter(t => t.status === TaskStatus.InWork || t.status === TaskStatus.ReportReceived).length;
      const overdue = givenTasks.filter(t => t.status === TaskStatus.Overdue).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

      return {
        id: man.id,
        name: man.fullName,
        role: man.role,
        total,
        completed,
        inWork,
        overdue,
        rate
      };
    });

    const headers = ["ФИО Руководителя", "Должность", "Разослано поручений", "Выполнено", "На контроле", "Просрочено", "Процент выполнения"];
    const rows = manStats.map(m => [m.name, m.role, String(m.total), String(m.completed), String(m.inWork), String(m.overdue), `${m.rate}%`]);

    return { data: manStats, headers, rows, title: "Выдача_поручений_руководством" };
  };

  // 5. CATEGORY DATA
  const getCategoryReportData = () => {
    const catStats = db.categories.map(cat => {
      const catTasks = db.tasks.filter(t => t.categoryId === cat.id);
      const total = catTasks.length;
      const completed = catTasks.filter(t => t.status === TaskStatus.Completed).length;
      const overdue = catTasks.filter(t => t.status === TaskStatus.Overdue).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

      return {
        id: cat.id,
        name: cat.name,
        total,
        completed,
        overdue,
        rate
      };
    });

    const headers = ["Категория", "Всего поручений", "Исполнено в срок", "Просрочено", "Исполнение %"];
    const rows = catStats.map(c => [c.name, String(c.total), String(c.completed), String(c.overdue), `${c.rate}%`]);

    return { data: catStats, headers, rows, title: "Исполнение_по_категориям" };
  };

  // 6. SOURCE DATA
  const getSourceReportData = () => {
    const srcStats = db.sources.map(src => {
      const srcTasks = db.tasks.filter(t => t.sourceId === src.id);
      const total = srcTasks.length;
      const completed = srcTasks.filter(t => t.status === TaskStatus.Completed).length;
      const overdue = srcTasks.filter(t => t.status === TaskStatus.Overdue).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

      return {
        id: src.id,
        name: src.name,
        total,
        completed,
        overdue,
        rate
      };
    });

    const headers = ["Источник поручений", "Всего поручений", "Выполнено в срок", "Просрочено", "Уровень исполнения"];
    const rows = srcStats.map(s => [s.name, String(s.total), String(s.completed), String(s.overdue), `${s.rate}%`]);

    return { data: srcStats, headers, rows, title: "Исполнение_по_источникам" };
  };

  // 7. DEADLINE PERIODS
  const getDeadlineReportData = () => {
    const tasks = db.tasks.sort((a,b) => a.executeDeadline.localeCompare(b.executeDeadline));
    
    const headers = ["ID", "Тема Поручения", "Дата Выдачи", "Срок Предост. Инфо", "Срок Исполнения", "Статус", "Важность"];
    const rows = tasks.map(t => [t.id, t.title, t.dateGiven, t.infoDeadline, t.executeDeadline, t.status, t.importance]);

    return { data: tasks, headers, rows, title: "Расписание_контрольных_сроков_всех_поручений" };
  };

  // 8. MASSIVE ASSIGNMENTS STATS
  const getMassiveReportData = () => {
    const massTasks = db.tasks.filter(t => t.type === TaskType.Massive);
    const massStats = massTasks.map(t => {
      const parentStates = db.taskStations.filter(ts => ts.taskId === t.id);
      const total = db.stations.length;
      const completed = parentStates.filter(ts => ts.status === TaskStatus.Completed).length;
      const progress = parentStates.filter(ts => ts.status === TaskStatus.ReportReceived).length;
      const debtCount = total - completed - progress;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: t.id,
        title: t.title,
        executeDeadline: t.executeDeadline,
        importance: t.importance,
        total,
        completed,
        debtCount,
        pct
      };
    });

    const headers = ["ID Поручения", "Наименование", "Срок исполнения", "Важность", "К-во Станций", "Выполнили", "Должники", "Процент покрытия"];
    const rows = massStats.map(ms => [ms.id, ms.title, ms.executeDeadline, ms.importance, String(ms.total), String(ms.completed), String(ms.debtCount), `${ms.pct}%`]);

    return { data: massStats, headers, rows, title: "Массовые_поручения_статистика" };
  };

  // 9. DEBTORS (ДОЛЖНИКИ)
  const getDebtorsReportData = () => {
    // Collect all unfulfilled station reports (status !== Completed and status !== ReportReceived)
    const debtorList = db.taskStations
      .filter(ts => ts.status !== TaskStatus.Completed && ts.status !== TaskStatus.ReportReceived)
      .map(state => {
        const station = db.stations.find(s => s.code === state.stationId);
        const task = db.tasks.find(t => t.id === state.taskId);
        return {
          id: state.taskId,
          taskTitle: task ? task.title : "",
          deadline: task ? task.executeDeadline : "",
          comment: state.comment,
          stationCode: state.stationId,
          stationName: station ? station.name : state.stationId,
          stationChief: station ? station.chief : "",
          phone: station ? station.phone : "",
          status: state.status
        };
      })
      .sort((a,b) => a.stationName.localeCompare(b.stationName));

    const headers = ["Код Станции", "Железнодорожная Станция", "Начальник Станции", "Телефон", "ID Зависшего Поручения", "Наименование поручения", "Срок Сдачи", "Текущий Статус"];
    const rows = debtorList.map(dl => [dl.stationCode, dl.stationName, dl.stationChief, dl.phone, dl.id, dl.taskTitle, dl.deadline, dl.status]);

    return { data: debtorList, headers, rows, title: "Реестр_должников_по_контролям" };
  };

  // 10. OVERDUE (ПРОСРОЧЕННЫЕ)
  const getOverdueReportData = () => {
    const overdueTasks = db.tasks.filter(t => t.status === TaskStatus.Overdue);

    const headers = ["Внутренний Номер", "Заголовок поручения", "Срок исполнения", "Кто утвердил", "Важность", "Категория"];
    const rows = overdueTasks.map(t => [
      t.id, 
      t.title, 
      t.executeDeadline, 
      db.managers.find(m => m.id === t.managerId)?.fullName || "Б/А", 
      t.importance, 
      db.categories.find(c => c.id === t.categoryId)?.name || "Прочее"
    ]);

    return { data: overdueTasks, headers, rows, title: "Просроченные_поручения_АРМ" };
  };

  // Print function
  const triggerPrintLayout = () => {
    window.print();
  };

  // Get selected package data
  let currentReportData: { data: any[]; headers: string[]; rows: string[][]; title: string };
  switch (selectedReport) {
    case "CHIEF":
      currentReportData = getChiefReportData();
      break;
    case "EMPLOYEE":
      currentReportData = getEmployeeReportData();
      break;
    case "MANAGER":
      currentReportData = getManagerReportData();
      break;
    case "CATEGORY":
      currentReportData = getCategoryReportData();
      break;
    case "SOURCE":
      currentReportData = getSourceReportData();
      break;
    case "DEADLINE":
      currentReportData = getDeadlineReportData();
      break;
    case "MASSIVE":
      currentReportData = getMassiveReportData();
      break;
    case "DEBTORS":
      currentReportData = getDebtorsReportData();
      break;
    case "OVERDUE":
      currentReportData = getOverdueReportData();
      break;
    case "STATION":
    default:
      currentReportData = getStationReportData();
      break;
  }

  // Render Station Modal Detail Card
  const renderStationModal = () => {
    if (!selectedStationCode) return null;
    const station = db.stations.find(s => s.code === selectedStationCode);
    if (!station) return null;

    // Get all tasks and task states for this station
    const stationTaskStates = db.taskStations.filter(ts => ts.stationId === station.code);
    
    // Detailed stats
    const total = stationTaskStates.length;
    const completed = stationTaskStates.filter(ts => ts.status === TaskStatus.Completed).length;
    const progress = stationTaskStates.filter(ts => ts.status === TaskStatus.ReportReceived).length;
    const inWork = stationTaskStates.filter(ts => ts.status === TaskStatus.InWork).length;
    const overdue = stationTaskStates.filter(ts => 
      ts.status === TaskStatus.Overdue || 
      (ts.status !== TaskStatus.Completed && ts.status !== TaskStatus.ReportReceived && (db.tasks.find(t => t.id === ts.taskId)?.executeDeadline || "") < todayStr)
    ).length;
    const rate = total > 0 ? Math.round((completed / total) * 105) : 100;
    const finalRate = rate > 100 ? 100 : rate;

    return (
      <div className="fixed inset-0 bg-slate-950/70 z-50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30">
                Карточка Станции • {station.code}
              </span>
              <h3 className="text-lg font-bold flex items-center gap-2 mt-1">
                <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
                Станция {station.name}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedStationCode(null)} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Stats and Contacts block */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Contact details */}
              <div className="md:col-span-4 bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Контакты и состав
                </h4>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Начальник (ДС)</span>
                    <span className="font-bold text-slate-900">{station.chief || "ДС не назначен"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Основной Телефон</span>
                    <a href={`tel:${station.phone}`} className="font-mono text-blue-600 hover:underline">{station.phone || "Нет телефона"}</a>
                  </div>
                  {station.leaders && station.leaders.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Другие руководители</span>
                      {station.leaders.map((lead, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-slate-200 text-[11px]">
                          <span className="font-semibold text-slate-800 block">{lead.name}</span>
                          <span className="text-slate-500 font-mono text-[10px]">{lead.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Execution Stats */}
              <div className="md:col-span-8 bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    Статистика дисциплины
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-lg border border-slate-150 text-center">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Поручений</span>
                      <span className="text-lg font-black text-slate-800 font-mono">{total}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-150 text-center">
                      <span className="block text-[10px] text-emerald-600 font-semibold uppercase">Выполнено</span>
                      <span className="text-lg font-black text-emerald-700 font-mono">{completed}</span>
                    </div>
                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-150 text-center">
                      <span className="block text-[10px] text-indigo-600 font-semibold uppercase">В работе</span>
                      <span className="text-lg font-black text-indigo-700 font-mono">{inWork + progress}</span>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-150 text-center">
                      <span className="block text-[10px] text-rose-600 font-semibold uppercase">Просрочено</span>
                      <span className="text-lg font-black text-rose-700 font-mono">{overdue}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Уровень исполнительской дисциплины</span>
                      <span>{finalRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          finalRate >= 80 ? "bg-emerald-500" : finalRate >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${finalRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Оценка</span>
                    <span className={`text-sm font-black uppercase ${
                      finalRate >= 85 ? "text-emerald-600" : finalRate >= 70 ? "text-blue-600" : finalRate >= 50 ? "text-amber-600" : "text-rose-600"
                    }`}>
                      {finalRate >= 85 ? "Отлично" : finalRate >= 70 ? "Хорошо" : finalRate >= 50 ? "Удовл." : "Неудовл."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed work by task */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                Реестр выполненных и закрепленных работ
              </h4>

              {stationTaskStates.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                  По данной станции не закреплено ни одного поручения
                </div>
              ) : (
                <div className="space-y-4">
                  {stationTaskStates.map(state => {
                    const task = db.tasks.find(t => t.id === state.taskId);
                    if (!task) return null;

                    return (
                      <div key={state.taskId} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:shadow-xs transition-shadow">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                              № {state.taskId}
                            </span>
                            <h5 
                              className="font-bold text-slate-900 text-sm hover:underline cursor-pointer" 
                              onClick={() => {
                                setSelectedStationCode(null);
                                onNavigateToTask && onNavigateToTask(state.taskId);
                              }}
                              title="Перейти к деталям поручения"
                            >
                              {task.title}
                            </h5>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              state.status === TaskStatus.Completed ? "bg-emerald-100 text-emerald-800" :
                              state.status === TaskStatus.ReportReceived ? "bg-blue-100 text-blue-800" :
                              state.status === TaskStatus.InWork ? "bg-amber-100 text-amber-800" :
                              state.status === TaskStatus.Overdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800"
                            }`}>
                              {state.status}
                            </span>
                          </div>
                        </div>

                        {/* Description / comment on how the work was done */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                          <div className="md:col-span-5 space-y-1.5 border-r border-slate-200/60 pr-2 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Срок сдачи:</span>
                              <span className="font-semibold text-rose-700 font-mono">{formatDate(task.executeDeadline)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Дата отчета:</span>
                              <span className="font-semibold text-slate-700 font-mono">{state.reportDate ? formatDate(state.reportDate) : "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Тип контроля:</span>
                              <span className="font-semibold text-slate-700">{task.importance}</span>
                            </div>
                          </div>

                          <div className="md:col-span-7 space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Отчет станции / Проведенная работа:</span>
                            <p className="text-slate-800 font-medium leading-relaxed bg-white p-2 border border-slate-200 rounded text-[11px] whitespace-pre-wrap italic">
                              {state.comment ? state.comment : "Отчет о выполнении пока не предоставлен станцией"}
                            </p>
                          </div>
                        </div>

                        {/* Attachments (photos, documents) uploaded by station */}
                        {state.attachments && state.attachments.length > 0 && (
                          <div className="pt-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">Прикрепленные фотоматериалы и файлы:</span>
                            <div className="flex flex-wrap gap-2">
                              {state.attachments.map(att => (
                                <div 
                                  key={att.id}
                                  className="group relative text-[11px] bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center gap-2 max-w-xs hover:bg-slate-200/80 transition-colors cursor-pointer"
                                  onClick={() => {
                                    if (att.fileData) {
                                      // If there's fileData (like base64 image), open in new window or view it
                                      const win = window.open();
                                      if (win) {
                                        win.document.write(`<iframe src="${att.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                      }
                                    }
                                  }}
                                  title="Нажмите для полноэкранного просмотра снимка"
                                >
                                  {att.fileType === "jpg" || att.fileType === "png" ? (
                                    <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                                      <img src={att.fileData} className="w-full h-full object-cover" alt="Attached photo" referrerPolicy="no-referrer" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                                      <FileSpreadsheet className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div className="truncate flex-1">
                                    <span className="font-bold text-slate-800 block truncate underline">{att.fileName}</span>
                                    <span className="text-slate-400 font-mono text-[9px]">{att.size || "Снимок с планшета"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
              onClick={() => setSelectedStationCode(null)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Employee Modal Detail Card
  const renderEmployeeModal = () => {
    if (!selectedEmployeeId) return null;
    const employee = db.employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return null;

    // Get all individual tasks where this employee is assigned
    const assignedTasks = db.tasks.filter(t => 
      t.type === TaskType.Individual && t.assignments?.includes(employee.id)
    );

    const total = assignedTasks.length;
    const completed = assignedTasks.filter(t => t.status === TaskStatus.Completed).length;
    const inWork = assignedTasks.filter(t => t.status === TaskStatus.InWork || t.status === TaskStatus.ReportReceived).length;
    const overdue = assignedTasks.filter(t => t.status === TaskStatus.Overdue).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return (
      <div className="fixed inset-0 bg-slate-950/70 z-50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-500/30">
                Карточка Исполнителя • {employee.id}
              </span>
              <h3 className="text-lg font-bold flex items-center gap-2 mt-1">
                <Award className="w-5 h-5 text-blue-400 shrink-0" />
                {employee.fullName}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedEmployeeId(null)} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Stats and Contacts block */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Contact details */}
              <div className="md:col-span-4 bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Профиль специалиста
                </h4>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Должность</span>
                    <span className="font-bold text-slate-900">{employee.role}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Подразделение</span>
                    <span className="font-bold text-slate-900">{employee.department}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Телефон связи</span>
                    <a href={`tel:${employee.phone}`} className="font-mono text-blue-650 hover:underline">{employee.phone || "Нет телефона"}</a>
                  </div>
                  {employee.note && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Примечание</span>
                      <p className="text-slate-600 text-[11px] italic mt-1 leading-relaxed bg-white p-2 border border-slate-200 rounded">{employee.note}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Execution Stats */}
              <div className="md:col-span-8 bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    Индивидуальная дисциплина
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-lg border border-slate-150 text-center">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Поручений</span>
                      <span className="text-lg font-black text-slate-800 font-mono">{total}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-150 text-center">
                      <span className="block text-[10px] text-emerald-600 font-semibold uppercase">Выполнено</span>
                      <span className="text-lg font-black text-emerald-700 font-mono">{completed}</span>
                    </div>
                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-150 text-center">
                      <span className="block text-[10px] text-indigo-600 font-semibold uppercase">В работе</span>
                      <span className="text-lg font-black text-indigo-700 font-mono">{inWork}</span>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-150 text-center">
                      <span className="block text-[10px] text-rose-600 font-semibold uppercase">Просрочено</span>
                      <span className="text-lg font-black text-rose-700 font-mono">{overdue}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Процент исполнения индивидуальных поручений</span>
                      <span>{rate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Оценка</span>
                    <span className={`text-sm font-black uppercase ${
                      rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-blue-600" : rate >= 50 ? "text-amber-600" : "text-rose-600"
                    }`}>
                      {rate >= 85 ? "Отлично" : rate >= 70 ? "Хорошо" : rate >= 50 ? "Удовл." : "Неудовл."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed work by task */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                Закрепленные индивидуальные поручения и ход выполнения
              </h4>

              {assignedTasks.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                  За исполнителем не закреплено индивидуальных поручений в АРМ
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedTasks.map(task => {
                    const progressList = db.taskProgress.filter(tp => tp.taskId === task.id);

                    return (
                      <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:shadow-xs transition-shadow">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                              № {task.id}
                            </span>
                            <h5 
                              className="font-bold text-slate-900 text-sm hover:underline cursor-pointer"
                              onClick={() => {
                                setSelectedEmployeeId(null);
                                onNavigateToTask && onNavigateToTask(task.id);
                              }}
                              title="Перейти к деталям поручения"
                            >
                              {task.title}
                            </h5>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              task.status === TaskStatus.Completed ? "bg-emerald-100 text-emerald-800" :
                              task.status === TaskStatus.ReportReceived ? "bg-blue-100 text-blue-800" :
                              task.status === TaskStatus.InWork ? "bg-amber-100 text-amber-800" :
                              task.status === TaskStatus.Overdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800"
                            }`}>
                              {task.status}
                            </span>
                          </div>
                        </div>

                        {/* General task info */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                          <div className="md:col-span-4 space-y-1.5 border-r border-slate-200/60 pr-2 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Срок исполнения:</span>
                              <span className="font-semibold text-rose-700 font-mono">{formatDate(task.executeDeadline)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Срок информ.:</span>
                              <span className="font-semibold text-slate-700 font-mono">{formatDate(task.infoDeadline)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Важность:</span>
                              <span className="font-semibold text-slate-700">{task.importance}</span>
                            </div>
                          </div>

                          <div className="md:col-span-8 space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Формулировка задачи:</span>
                            <p className="text-slate-705 text-[11px] leading-relaxed bg-white p-2 border border-slate-200 rounded">
                              {task.text}
                            </p>
                          </div>
                        </div>

                        {/* Progress Activity Feed */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Ход проработки и отчетность по задаче:</span>
                          {progressList.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">Активность по исполнению пока не зарегистрирована</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {progressList.map(prog => (
                                <div key={prog.id} className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-[11px] space-y-1.5">
                                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                    <span className="font-semibold text-slate-600">Отчет от исполнителя</span>
                                    <span>{formatDate(prog.date)}</span>
                                  </div>
                                  <p className="text-slate-800 font-medium whitespace-pre-wrap">{prog.text}</p>
                                  
                                  {prog.attachments && prog.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 mt-1">
                                      {prog.attachments.map(att => (
                                        <div 
                                          key={att.id}
                                          className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 p-1 px-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                                          onClick={() => {
                                            if (att.fileData) {
                                              const win = window.open();
                                              if (win) {
                                                win.document.write(`<iframe src="${att.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                              }
                                            }
                                          }}
                                        >
                                          <Paperclip className="w-2.5 h-2.5 text-blue-500" />
                                          <span className="underline font-medium text-slate-700">{att.fileName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
              onClick={() => setSelectedEmployeeId(null)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Manager Modal Detail Card
  const renderManagerModal = () => {
    if (!selectedManagerId) return null;
    const manager = db.managers.find(m => m.id === selectedManagerId);
    if (!manager) return null;

    // Get all tasks issued by this manager
    const managerTasks = db.tasks.filter(t => t.managerId === manager.id);
    const total = managerTasks.length;
    const completed = managerTasks.filter(t => t.status === TaskStatus.Completed).length;
    const inWork = managerTasks.filter(t => t.status === TaskStatus.InWork || t.status === TaskStatus.ReportReceived).length;
    const overdue = managerTasks.filter(t => t.status === TaskStatus.Overdue).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return (
      <div className="fixed inset-0 bg-slate-950/70 z-50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/30">
                Карточка Руководителя • {manager.id}
              </span>
              <h3 className="text-lg font-bold flex items-center gap-2 mt-1">
                <User className="w-5 h-5 text-indigo-400 shrink-0" />
                {manager.fullName}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedManagerId(null)} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Profile and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4 bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Профиль Руководителя
                </h4>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Должность</span>
                    <span className="font-bold text-slate-900">{manager.role}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Департамент / Отдел</span>
                    <span className="font-bold text-slate-900">{manager.department}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    Статистика выданных поручений
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-lg border border-slate-150 text-center">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Выдано</span>
                      <span className="text-lg font-black text-slate-800 font-mono">{total}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-150 text-center">
                      <span className="block text-[10px] text-emerald-600 font-semibold uppercase">Выполнено</span>
                      <span className="text-lg font-black text-emerald-700 font-mono">{completed}</span>
                    </div>
                    <div className="bg-indigo-55/50 p-3 rounded-lg border border-indigo-150 text-center">
                      <span className="block text-[10px] text-indigo-600 font-semibold uppercase">В работе</span>
                      <span className="text-lg font-black text-indigo-700 font-mono">{inWork}</span>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-150 text-center">
                      <span className="block text-[10px] text-rose-600 font-semibold uppercase">Просрочено</span>
                      <span className="text-lg font-black text-rose-700 font-mono">{overdue}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Процент своевременного закрытия</span>
                      <span>{rate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Issued tasks list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Реестр выданных поручений
              </h4>

              {managerTasks.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                  Руководитель пока не зафиксировал выданных поручений
                </div>
              ) : (
                <div className="space-y-4">
                  {managerTasks.map(task => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:shadow-xs transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 shrink-0">
                            № {task.id}
                          </span>
                          <h5 
                            className="font-bold text-slate-900 text-sm hover:underline cursor-pointer"
                            onClick={() => {
                              setSelectedManagerId(null);
                              onNavigateToTask && onNavigateToTask(task.id);
                            }}
                            title="Перейти к деталям поручения"
                          >
                            {task.title}
                          </h5>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          task.status === TaskStatus.Completed ? "bg-emerald-100 text-emerald-800" :
                          task.status === TaskStatus.ReportReceived ? "bg-blue-100 text-blue-800" :
                          task.status === TaskStatus.InWork ? "bg-amber-100 text-amber-800" :
                          task.status === TaskStatus.Overdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800"
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                        <div className="md:col-span-4 space-y-1.5 border-r border-slate-200/60 pr-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Срок окончательный:</span>
                            <span className="font-semibold text-rose-700 font-mono">{formatDate(task.executeDeadline)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Срок информирования:</span>
                            <span className="font-semibold text-slate-700 font-mono">{formatDate(task.infoDeadline)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Тип:</span>
                            <span className="font-semibold text-slate-700">{task.type}</span>
                          </div>
                        </div>
                        <div className="md:col-span-8 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Формулировка контроля:</span>
                          <p className="text-slate-800 text-[11px] leading-relaxed bg-white p-2 border border-slate-200 rounded">
                            {task.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
              onClick={() => setSelectedManagerId(null)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Category Modal Detail Card
  const renderCategoryModal = () => {
    if (!selectedCategoryId) return null;
    const category = db.categories.find(c => c.id === selectedCategoryId);
    if (!category) return null;

    // Get all tasks in this category
    const categoryTasks = db.tasks.filter(t => t.categoryId === category.id);
    const total = categoryTasks.length;
    const completed = categoryTasks.filter(t => t.status === TaskStatus.Completed).length;
    const inWork = categoryTasks.filter(t => t.status === TaskStatus.InWork || t.status === TaskStatus.ReportReceived).length;
    const overdue = categoryTasks.filter(t => t.status === TaskStatus.Overdue).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return (
      <div className="fixed inset-0 bg-slate-950/70 z-50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30">
                Карточка Категории
              </span>
              <h3 className="text-lg font-bold flex items-center gap-2 mt-1">
                <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                {category.name}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedCategoryId(null)} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Stats */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col justify-between">
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Сводная статистика исполнения по тематике
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-150 text-center">
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">Предписаний</span>
                    <span className="text-lg font-black text-slate-800 font-mono">{total}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-150 text-center">
                    <span className="block text-[10px] text-emerald-600 font-semibold uppercase">Исполнено</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">{completed}</span>
                  </div>
                  <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-150 text-center">
                    <span className="block text-[10px] text-indigo-600 font-semibold uppercase">В работе</span>
                    <span className="text-lg font-black text-indigo-700 font-mono">{inWork}</span>
                  </div>
                  <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-150 text-center">
                    <span className="block text-[10px] text-rose-600 font-semibold uppercase">Просрочено</span>
                    <span className="text-lg font-black text-rose-700 font-mono">{overdue}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Общий процент успешного выполнения</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Закрепленные поручения в данной категории
              </h4>

              {categoryTasks.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                  Поручения по данной тематике отсутствуют в АРМ
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryTasks.map(task => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:shadow-xs transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                            № {task.id}
                          </span>
                          <h5 
                            className="font-bold text-slate-900 text-sm hover:underline cursor-pointer"
                            onClick={() => {
                              setSelectedCategoryId(null);
                              onNavigateToTask && onNavigateToTask(task.id);
                            }}
                            title="Перейти к деталям поручения"
                          >
                            {task.title}
                          </h5>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          task.status === TaskStatus.Completed ? "bg-emerald-100 text-emerald-800" :
                          task.status === TaskStatus.ReportReceived ? "bg-blue-100 text-blue-800" :
                          task.status === TaskStatus.InWork ? "bg-amber-100 text-amber-800" :
                          task.status === TaskStatus.Overdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800"
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                        <div className="md:col-span-4 space-y-1.5 border-r border-slate-200/60 pr-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Срок окончательный:</span>
                            <span className="font-semibold text-rose-700 font-mono">{formatDate(task.executeDeadline)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Автор контроля:</span>
                            <span className="font-semibold text-slate-700">
                              {db.managers.find(m => m.id === task.managerId)?.fullName || "Не указан"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Важность:</span>
                            <span className="font-semibold text-slate-700">{task.importance}</span>
                          </div>
                        </div>
                        <div className="md:col-span-8 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Формулировка контроля:</span>
                          <p className="text-slate-800 text-[11px] leading-relaxed bg-white p-2 border border-slate-200 rounded">
                            {task.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
              onClick={() => setSelectedCategoryId(null)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Source Modal Detail Card
  const renderSourceModal = () => {
    if (!selectedSourceId) return null;
    const source = db.sources.find(s => s.id === selectedSourceId);
    if (!source) return null;

    // Get all tasks from this source
    const sourceTasks = db.tasks.filter(t => t.sourceId === source.id);
    const total = sourceTasks.length;
    const completed = sourceTasks.filter(t => t.status === TaskStatus.Completed).length;
    const inWork = sourceTasks.filter(t => t.status === TaskStatus.InWork || t.status === TaskStatus.ReportReceived).length;
    const overdue = sourceTasks.filter(t => t.status === TaskStatus.Overdue).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return (
      <div className="fixed inset-0 bg-slate-950/70 z-50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-500/30">
                Карточка Источника Поручений
              </span>
              <h3 className="text-lg font-bold flex items-center gap-2 mt-1">
                <FileSpreadsheet className="w-5 h-5 text-blue-400 shrink-0" />
                {source.name}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedSourceId(null)} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Stats */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col justify-between">
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Сводная статистика исполнения по источнику
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-150 text-center">
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">Поручений</span>
                    <span className="text-lg font-black text-slate-800 font-mono">{total}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-150 text-center">
                    <span className="block text-[10px] text-emerald-600 font-semibold uppercase">Устранено</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">{completed}</span>
                  </div>
                  <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-150 text-center">
                    <span className="block text-[10px] text-indigo-600 font-semibold uppercase">В работе</span>
                    <span className="text-lg font-black text-indigo-700 font-mono">{inWork}</span>
                  </div>
                  <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-150 text-center">
                    <span className="block text-[10px] text-rose-600 font-semibold uppercase">Просрочено</span>
                    <span className="text-lg font-black text-rose-700 font-mono">{overdue}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Уровень исполнительской дисциплины</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Связанные поручения по данному источнику / процедуре
              </h4>

              {sourceTasks.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                  Поручения по данному источнику документов отсутствуют в АРМ
                </div>
              ) : (
                <div className="space-y-4">
                  {sourceTasks.map(task => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:shadow-xs transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                            № {task.id}
                          </span>
                          <h5 
                            className="font-bold text-slate-900 text-sm hover:underline cursor-pointer"
                            onClick={() => {
                              setSelectedSourceId(null);
                              onNavigateToTask && onNavigateToTask(task.id);
                            }}
                            title="Перейти к деталям поручения"
                          >
                            {task.title}
                          </h5>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          task.status === TaskStatus.Completed ? "bg-emerald-100 text-emerald-800" :
                          task.status === TaskStatus.ReportReceived ? "bg-blue-100 text-blue-800" :
                          task.status === TaskStatus.InWork ? "bg-amber-100 text-amber-800" :
                          task.status === TaskStatus.Overdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800"
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                        <div className="md:col-span-4 space-y-1.5 border-r border-slate-200/60 pr-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Срок окончательный:</span>
                            <span className="font-semibold text-rose-700 font-mono">{formatDate(task.executeDeadline)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Тематика:</span>
                            <span className="font-semibold text-slate-700">
                              {db.categories.find(c => c.id === task.categoryId)?.name || "Общая"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Важность:</span>
                            <span className="font-semibold text-slate-700">{task.importance}</span>
                          </div>
                        </div>
                        <div className="md:col-span-8 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Формулировка контроля:</span>
                          <p className="text-slate-850 text-[11px] leading-relaxed bg-white p-2 border border-slate-200 rounded">
                            {task.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
              onClick={() => setSelectedSourceId(null)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full print:p-0 select-none pb-12" id="reports-view-root">
      {/* 1. Left side controls: Report categorizer list */}
      <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-slate-205 shadow-xs h-fit space-y-4 print:hidden">
        <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
          <BarChart className="w-4 h-4 text-slate-500" />
          Разделы аналитики
        </h2>

        <div className="space-y-1.5 flex flex-col">
          {[
            { id: "STATION", label: "По исполнительской дисциплине станций" },
            { id: "CHIEF", label: "По начальникам станций (ДС)" },
            { id: "EMPLOYEE", label: "По ответственным исполнителям" },
            { id: "MANAGER", label: "По выдающим руководителям" },
            { id: "CATEGORY", label: "По категориям поручений" },
            { id: "SOURCE", label: "По источникам предписаний" },
            { id: "DEADLINE", label: "По календарным срокам" },
            { id: "MASSIVE", label: "По массовым поручениям" },
            { id: "DEBTORS", label: "Реестр долгов (Списком станций)" },
            { id: "OVERDUE", label: "Просроченные / Пропущенные сроки" }
          ].map(sel => (
            <button
              key={sel.id}
              onClick={() => setSelectedReport(sel.id as ReportType)}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex justify-between items-center transition-all cursor-pointer ${
                selectedReport === sel.id 
                  ? "bg-blue-600 text-white font-bold" 
                  : "text-slate-650 hover:bg-slate-100"
              }`}
            >
              <span>{sel.label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main details reporting visual canvas */}
      <div className="lg:col-span-9 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 flex flex-col h-full overflow-hidden print:border-none print:shadow-none">
        {/* Action Header section */}
        <div className="flex justify-between items-center border-b border-slate-150 pb-4 print:hidden">
          <div>
            <span className="text-[10px] text-blue-650 font-extrabold uppercase tracking-widest font-mono">Аналитический Отчет</span>
            <h2 className="text-lg font-bold text-slate-900 border-none leading-snug">
              {selectedReport === "STATION" && "Исполнительская дисциплина железнодорожных станций"}
              {selectedReport === "CHIEF" && "Индивидуальный рейтинг начальников станций (ДС)"}
              {selectedReport === "EMPLOYEE" && "Рейтинг сотрудников & инженеров по выполнению"}
              {selectedReport === "MANAGER" && "Контроль поручений по выдававшему руководству"}
              {selectedReport === "CATEGORY" && "Выполнение задач по тематическим категориям"}
              {selectedReport === "SOURCE" && "Эффективность устранения по источникам задач"}
              {selectedReport === "DEADLINE" && "График распределения контрольных поручений"}
              {selectedReport === "MASSIVE" && "Закрытие массовых групповых циркуляров"}
              {selectedReport === "DEBTORS" && "Ведомость должников по дисциплине ДЦС"}
              {selectedReport === "OVERDUE" && "Перечень критически просроченных поручений"}
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={triggerPrintLayout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" /> Печать
            </button>
            <button
              onClick={() => exportToPDFFormat(
                currentReportData.title,
                selectedReport === "STATION" ? "Исполнительская дисциплина железнодорожных станций" :
                selectedReport === "CHIEF" ? "Рейтинг начальников станций (ДС)" :
                selectedReport === "EMPLOYEE" ? "Рейтинг сотрудников" :
                selectedReport === "MANAGER" ? "Контроль поручений по выдающему руководству" :
                selectedReport === "CATEGORY" ? "Выполнение по категориям" :
                selectedReport === "SOURCE" ? "Выполнение по источникам задач" :
                selectedReport === "DEADLINE" ? "График контрольных сроков" :
                selectedReport === "MASSIVE" ? "Закрытие массовых поручений" :
                selectedReport === "DEBTORS" ? "Ведомость должников по дисциплине" : "Перечень критически просроченных поручений",
                currentReportData.headers,
                currentReportData.rows
              )}
              className="bg-red-650 hover:bg-red-700 text-white py-1.5 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" /> Экспорт PDF
            </button>
            <button
              onClick={() => exportToExcelFormat(currentReportData.title, currentReportData.headers, currentReportData.rows)}
              className="bg-emerald-650 hover:bg-emerald-750 text-white py-1.5 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" /> Экспорт Excel
            </button>
          </div>
        </div>

        {/* Printable pure header display */}
        <div className="hidden print:block text-center space-y-1">
          <h1 className="text-xl font-bold font-sans">ОТЧЕТ КОНТРОЛЯ ИСПОЛНИТЕЛЬСКОЙ ДИСЦИПЛИНЫ</h1>
          <p className="text-xs text-slate-500 font-mono">Экстракция АРМ ControlCenter | Станция: Все депо | Состояние на {todayStr}</p>
          <div className="h-0.5 bg-slate-900 my-4" />
        </div>

        {/* Dynamic rendering cards and tables depending on selection */}
        {selectedReport === "STATION" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-station-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase font-bold text-left">
                  <th className="p-3">Код</th>
                  <th className="p-3">Название станции</th>
                  <th className="p-3">Начальник (ДС)</th>
                  <th className="p-3 text-center">Всего задач</th>
                  <th className="p-3 text-center text-emerald-600 font-bold">Выполнено</th>
                  <th className="p-3 text-center text-rose-600 font-bold">Просрочено</th>
                  <th className="p-3 text-center">Дисциплина %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any) => (
                  <tr 
                    key={item.code} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedStationCode(item.code)}
                    title="Нажмите, чтобы открыть карточку станции и посмотреть работу по поручениям"
                  >
                    <td className="p-3 font-mono font-bold text-slate-500">{item.code}</td>
                    <td className="p-3 font-bold text-blue-600 hover:underline">{item.name}</td>
                    <td className="p-3">{item.chief || "Не указан"}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.total}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold bg-emerald-50/20">{item.completed}</td>
                    <td className="p-3 text-center font-mono text-rose-600 font-bold bg-rose-50/20">{item.overdue}</td>
                    <td className="p-3 text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5 font-sans">
                        <span className={`font-black ${item.rate >= 80 ? "text-emerald-600" : item.rate >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                          {item.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "CHIEF" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-chief-table">
            <p className="text-slate-500 text-3xs font-semibold leading-relaxed print:hidden">
              Индивидуальная инфо-таблица ответственности начальников станций (ДС) по всем закрепленным массовым плановым отчетам и инвентаризациям.
            </p>
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase font-semibold text-left">
                  <th className="p-3">ФИО ДС</th>
                  <th className="p-3">Железнодорожная Станция</th>
                  <th className="p-3 text-center">Контрольных задач</th>
                  <th className="p-3 text-center text-emerald-600">Закрыто</th>
                  <th className="p-3 text-center text-rose-600">В просрочке</th>
                  <th className="p-3 text-center">Рейтинг сдачи %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-medium">
                {currentReportData.data.map((item: any) => (
                  <tr 
                    key={item.code} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedStationCode(item.code)}
                    title="Нажмите, чтобы открыть карточку начальника станции и посмотреть работу по поручениям"
                  >
                    <td className="p-3 font-bold text-blue-600 hover:underline">{item.chief || "Вакансия ДС"}</td>
                    <td className="p-3 font-semibold text-slate-600">{item.name}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.total}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold">{item.completed}</td>
                    <td className="p-3 text-center font-mono text-rose-600 font-bold">{item.overdue}</td>
                    <td className="p-3 text-center font-mono font-black text-indigo-650">{item.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "EMPLOYEE" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-employee-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 text-[10px] uppercase text-left">
                  <th className="p-3">Специалист / Исполнитель</th>
                  <th className="p-3">Отдел</th>
                  <th className="p-3 text-center">Выдано индивидуально</th>
                  <th className="p-3 text-center text-emerald-600">Исполнил</th>
                  <th className="p-3 text-center text-amber-600">На проработке</th>
                  <th className="p-3 text-center text-red-600">Просрочил</th>
                  <th className="p-3 text-center">Результативность %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedEmployeeId(item.id)}
                    title="Нажмите, чтобы открыть карточку исполнителя и посмотреть работу по поручениям"
                  >
                    <td className="p-3 font-bold text-blue-600 hover:underline">{item.name}</td>
                    <td className="p-3 text-slate-500 font-mono text-3xs font-normal">{item.role} ({item.department})</td>
                    <td className="p-3 text-center font-mono font-bold">{item.total}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold">{item.completed}</td>
                    <td className="p-3 text-center font-mono text-amber-600 font-bold">{item.inWork}</td>
                    <td className="p-3 text-center font-mono text-rose-600 font-bold">{item.overdue}</td>
                    <td className="p-3 text-center font-mono font-black text-blue-600">{item.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "MANAGER" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-manager-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase text-left">
                  <th className="p-3">Руководитель</th>
                  <th className="p-3">Должность</th>
                  <th className="p-3 text-center">Поручений выдано</th>
                  <th className="p-3 text-center text-emerald-600">Закрытых</th>
                  <th className="p-3 text-center text-rose-600">Зависших</th>
                  <th className="p-3 text-center">Качество исполнения %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedManagerId(item.id)}
                    title="Нажмите, чтобы открыть карточку руководителя и посмотреть его поручения"
                  >
                    <td className="p-3 font-bold text-blue-600 hover:underline">{item.name}</td>
                    <td className="p-3 text-slate-500">{item.role}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.total}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold">{item.completed}</td>
                    <td className="p-3 text-center font-mono text-rose-600 font-bold">{item.overdue}</td>
                    <td className="p-3 text-center font-mono font-black text-slate-800">{item.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "CATEGORY" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-category-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase text-left">
                  <th className="p-3">Тематическая Категория</th>
                  <th className="p-3 text-center">Количество предписаний</th>
                  <th className="p-3 text-center text-emerald-600">Выполнено</th>
                  <th className="p-3 text-center text-rose-600">Просрочено</th>
                  <th className="p-3 text-center">Закрытие %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any, index: number) => (
                  <tr 
                    key={index} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCategoryId(item.id)}
                    title="Нажмите, чтобы открыть карточку категории и посмотреть ее поручения"
                  >
                    <td className="p-3 font-bold text-blue-600 hover:underline">{item.name}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.total}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold">{item.completed}</td>
                    <td className="p-3 text-center font-mono text-rose-600 font-bold">{item.overdue}</td>
                    <td className="p-3 text-center font-mono font-black text-indigo-650">{item.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "SOURCE" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-source-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase text-left">
                  <th className="p-3">Источник документа / Процедура</th>
                  <th className="p-3 text-center">Выдано задач</th>
                  <th className="p-3 text-center text-emerald-600">Устранено</th>
                  <th className="p-3 text-center text-rose-605">Просрочено</th>
                  <th className="p-3 text-center">Процент решения %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any, idx: number) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedSourceId(item.id)}
                    title="Нажмите, чтобы открыть карточку источника и посмотреть его поручения"
                  >
                    <td className="p-3 font-bold text-blue-600 hover:underline">{item.name}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.total}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold">{item.completed}</td>
                    <td className="p-3 text-center font-mono text-rose-600 font-bold">{item.overdue}</td>
                    <td className="p-3 text-center font-mono font-black text-blue-600">{item.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "DEADLINE" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-deadline-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase text-left">
                  <th className="p-3">Внутренний Номер</th>
                  <th className="p-3">Наименование контроля</th>
                  <th className="p-3">Дата выдачи</th>
                  <th className="p-3">Срок информирования</th>
                  <th className="p-3">Срок окончательный</th>
                  <th className="p-3">Статус на сегодня</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/70 hover:text-blue-900 cursor-pointer transition-colors"
                    onClick={() => onNavigateToTask && onNavigateToTask(item.id)}
                    title="Нажмите, чтобы открыть поручение"
                  >
                    <td className="p-3 font-mono font-extrabold text-blue-600">{item.id}</td>
                    <td className="p-3 font-bold text-slate-900">{item.title}</td>
                    <td className="p-3 font-mono text-slate-505">{formatDate(item.dateGiven)}</td>
                    <td className="p-3 font-mono text-amber-700 font-semibold">{formatDate(item.infoDeadline)}</td>
                    <td className="p-3 font-mono text-rose-700 font-bold">{formatDate(item.executeDeadline)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold uppercase ${
                        item.status === TaskStatus.Completed ? "text-emerald-700" :
                        item.status === TaskStatus.Overdue ? "text-rose-700" : "text-slate-600"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "MASSIVE" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-massive-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase text-left">
                  <th className="p-3">ID Поручения</th>
                  <th className="p-3">Наименование массового контроля</th>
                  <th className="p-3 font-mono">Срок Сдачи</th>
                  <th className="p-3 text-center">Всего Станций</th>
                  <th className="p-3 text-center text-emerald-600">Сдали отчет</th>
                  <th className="p-3 text-center text-rose-600">Задержали</th>
                  <th className="p-3 text-center">Покрытие отчетами %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/70 hover:text-blue-900 cursor-pointer transition-colors"
                    onClick={() => onNavigateToTask && onNavigateToTask(item.id)}
                    title="Нажмите, чтобы открыть поручение"
                  >
                    <td className="p-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="p-3 font-bold text-slate-900">{item.title}</td>
                    <td className="p-3 font-mono">{formatDate(item.executeDeadline)}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.total}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold bg-emerald-50/10">{item.completed}</td>
                    <td className="p-3 text-center font-mono text-rose-600 font-bold bg-rose-50/10">{item.debtCount}</td>
                    <td className="p-3 text-center font-mono font-black text-indigo-650">{item.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "DEBTORS" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-debtors-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase text-left">
                  <th className="p-3">Код</th>
                  <th className="p-3">Название должника-станции</th>
                  <th className="p-3">Начальник (ДС) / Контакт</th>
                  <th className="p-3">Зависшее поручение</th>
                  <th className="p-3 font-mono text-rose-700">Срок Сдачи</th>
                  <th className="p-3">Текущий Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any, idx: number) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-blue-50/70 hover:text-blue-900 cursor-pointer transition-colors bg-rose-50/10"
                    onClick={() => onNavigateToTask && onNavigateToTask(item.id)}
                    title="Нажмите, чтобы открыть поручение"
                  >
                    <td className="p-3 font-mono font-bold text-slate-500">{item.stationCode}</td>
                    <td 
                      className="p-3 font-bold text-blue-600 hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStationCode(item.stationCode);
                      }}
                      title="Нажмите, чтобы открыть подробную карточку станции"
                    >
                      {item.stationName}
                    </td>
                    <td className="p-3">
                      <div>{item.stationChief || "ДС не назначен"}</div>
                      <div className="text-slate-400 text-4xs font-mono font-normal">{item.phone}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-slate-405 font-bold mr-1">[{item.id}]</span>
                      <span className="text-slate-700 text-3xs font-medium">{item.taskTitle}</span>
                    </td>
                    <td className="p-3 font-mono font-black text-rose-650">{formatDate(item.deadline)}</td>
                    <td className="p-3 font-bold text-red-600 text-3xs">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === "OVERDUE" && (
          <div className="space-y-4 flex-1 overflow-x-auto" id="report-overdue-table">
            <table className="w-full text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] uppercase text-left">
                  <th className="p-3">Внутренний №</th>
                  <th className="p-3">Заголовок невыполненного поручения</th>
                  <th className="p-3 font-mono text-rose-700">Срок просрочен</th>
                  <th className="p-3">Кто утвердил</th>
                  <th className="p-3">Важность</th>
                  <th className="p-3">Категория</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentReportData.data.map((item: any) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/70 hover:text-blue-900 cursor-pointer transition-colors bg-rose-50/10 text-rose-950"
                    onClick={() => onNavigateToTask && onNavigateToTask(item.id)}
                    title="Нажмите, чтобы открыть поручение"
                  >
                    <td className="p-3 font-mono font-extrabold text-rose-600">{item.id}</td>
                    <td className="p-3 font-bold text-slate-900">{item.title}</td>
                    <td className="p-3 font-mono font-black text-rose-600 text-center">{formatDate(item.executeDeadline)}</td>
                    <td className="p-3">{item.managerId ? (db.managers.find(m => m.id === item.managerId)?.fullName) : "Романов К.Б."}</td>
                    <td className="p-3 font-bold text-red-500">{item.importance}</td>
                    <td className="p-3 text-slate-500">{db.categories.find(c => c.id === item.categoryId)?.name || "Прочее"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Render Details Modals */}
      {renderStationModal()}
      {renderEmployeeModal()}
      {renderManagerModal()}
      {renderCategoryModal()}
      {renderSourceModal()}
    </div>
  );
}
