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
  Download
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
                  <tr key={item.code} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-500">{item.code}</td>
                    <td className="p-3 font-bold text-slate-900">{item.name}</td>
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
                  <tr key={item.code} className="hover:bg-slate-50/40">
                    <td className="p-3 font-bold text-slate-900">{item.chief || "Вакансия ДС"}</td>
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
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-905">{item.name}</td>
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
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{item.name}</td>
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
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{item.name}</td>
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
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{item.name}</td>
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
                    <td className="p-3 font-bold text-slate-900">{item.stationName}</td>
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
    </div>
  );
}
