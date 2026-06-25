import React, { useState, FormEvent } from "react";
import { AppDatabase, Employee, Manager } from "../types";
import { Users, User, Phone, Plus, X, Briefcase, Trash2, Edit } from "lucide-react";

interface EmployeesViewProps {
  db: AppDatabase;
  addEmployee: (emp: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, updated: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addManager: (man: Omit<Manager, "id">) => void;
  updateManager: (id: string, updated: Partial<Manager>) => void;
  deleteManager: (id: string) => void;
}

export default function EmployeesView({
  db,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  addManager,
  updateManager,
  deleteManager
}: EmployeesViewProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<"EMPLOYEES" | "MANAGERS">("EMPLOYEES");
  
  // Dialog / Edit states
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const startAdd = () => {
    setFullName("");
    setRole("");
    setDepartment("");
    setPhone("");
    setNote("");
    setEditingId(null);
    setIsAdding(true);
  };

  const startEdit = (item: any) => {
    setFullName(item.fullName);
    setRole(item.role);
    setDepartment(item.department);
    setPhone(item.phone || "");
    setNote(item.note || "");
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName || !role) {
      alert("Заполните ФИО и должность!");
      return;
    }

    if (activeSubTab === "EMPLOYEES") {
      if (editingId) {
        updateEmployee(editingId, { fullName, role, department, phone, note });
      } else {
        addEmployee({ fullName, role, department, phone, note });
      }
    } else {
      // MANAGERS
      if (editingId) {
        updateManager(editingId, { fullName, role, department });
      } else {
        addManager({ fullName, role, department });
      }
    }

    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6" id="personnel-view-container">
      {/* Top Navigation Row */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Персонал и Руководство</h1>
          <p className="text-slate-500 font-medium text-sm">Справочники работников и руководителей, контролирующих исполнение поручений</p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => { setActiveSubTab("EMPLOYEES"); setIsAdding(false); }}
            className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "EMPLOYEES" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Работники центра (ДЦС)
          </button>
          <button
            onClick={() => { setActiveSubTab("MANAGERS"); setIsAdding(false); }}
            className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "MANAGERS" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Утверждающие Руководители
          </button>
        </div>
      </div>

      {/* Main workspace layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left hand list panels (2 columns) */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                {activeSubTab === "EMPLOYEES" ? "Список работников центра" : "Список руководителей"}
              </h3>
              <button
                onClick={startAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-1 px-3 text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 font-bold" />
                Добавить позицию
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activeSubTab === "EMPLOYEES" ? (
                db.employees.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 text-xs italic font-medium">Справочник работников пуст.</p>
                ) : (
                  db.employees.map(emp => (
                    <div key={emp.id} className="p-4 flex justify-between items-start gap-4 hover:bg-slate-50/40">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-blue-500" />
                          <h4 className="font-bold text-slate-900 text-xs border-none">{emp.fullName}</h4>
                        </div>
                        <p className="font-medium text-slate-600 flex items-center gap-1 font-mono">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          {emp.role} | {emp.department}
                        </p>
                        {emp.phone && (
                          <p className="text-slate-500 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {emp.phone}
                          </p>
                        )}
                        {emp.note && <p className="text-slate-400 font-medium italic">Заметка: {emp.note}</p>}
                      </div>

                      <div className="flex gap-1">
                        <button onClick={() => startEdit(emp)} className="text-slate-400 hover:text-blue-600 p-1.5 cursor-pointer">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Удалить сотрудника ${emp.fullName}? Все его связки исполнителя в поручениях очистятся.`)) {
                              deleteEmployee(emp.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-650 p-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                db.managers.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 text-xs italic font-medium">Справочник руководителей пуст.</p>
                ) : (
                  db.managers.map(man => (
                    <div key={man.id} className="p-4 flex justify-between items-start gap-4 hover:bg-slate-50/40">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-700" />
                          <h4 className="font-bold text-slate-900 text-xs border-none">{man.fullName}</h4>
                        </div>
                        <p className="font-medium text-slate-600 font-mono">
                          {man.role} | {man.department}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <button onClick={() => startEdit(man)} className="text-slate-400 hover:text-blue-600 p-1.5 cursor-pointer">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Удалить руководителя ${man.fullName}?`)) {
                              deleteManager(man.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-655 p-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {/* Right hand add/edit form panel (1 column) */}
        <div className="md:col-span-1">
          {isAdding ? (
            <div className="bg-white rounded-xl border border-slate-205 shadow-xs p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-805 text-sm">
                  {editingId ? "Редактировать запись" : "Создать новую запись"}
                </h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-slate-400 uppercase text-[9px] mb-0.5">ФИО сотрудника</label>
                  <input
                    type="text"
                    placeholder="Пример: Смирнов Александр Сергеевич"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Должность</label>
                  <input
                    type="text"
                    placeholder="Пример: Старший ревизор"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Подразделение / Отдел</label>
                  <input
                    type="text"
                    placeholder="Пример: Ш или ДЦС"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium outline-none"
                  />
                </div>

                {activeSubTab === "EMPLOYEES" && (
                  <>
                    <div>
                      <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Контактный телефон</label>
                      <input
                        type="text"
                        placeholder="+7-999-..."
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 uppercase text-[9px] mb-0.5">Примечание</label>
                      <input
                        type="text"
                        placeholder="Особые отметки квалификации..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 px-4 rounded-lg mt-3 transition-colors text-[11px] cursor-pointer"
                >
                  {editingId ? "Сохранить изменения" : "Добавить в реестр ДЦС"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-55/3 bg-slate-50/50 rounded-xl border border-dashed border-slate-250 p-6 text-center text-slate-400 text-xs font-semibold leading-relaxed">
              Выберите сотрудника для редактирования, или нажмите кнопку «Добавить позицию» для регистрации персонала.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
