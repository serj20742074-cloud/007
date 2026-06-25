export enum TaskType {
  Individual = "Индивидуальное",
  Massive = "Массовое"
}

export enum ImportanceLevel {
  Normal = "Обычное",
  Important = "Важное",
  Urgent = "Срочное",
  SpecialControl = "Особый контроль"
}

export enum TaskStatus {
  NotStarted = "Не начато",
  InWork = "В работе",
  ReportReceived = "Отчет получен",
  Completed = "Исполнено",
  Overdue = "Просрочено"
}

export enum DocType {
  Telegram = "Телеграмма",
  Order = "Приказ",
  Directive = "Распоряжение",
  Protocol = "Протокол",
  Assignment = "Поручение",
  Letter = "Письмо",
  Other = "Прочее"
}

export interface StationLeader {
  name: string;
  phone: string;
}

export interface Station {
  code: string; // Код
  name: string; // Наименование
  chief: string; // Начальник
  deputy?: string; // Заместитель (убран из форм)
  phone: string; // Телефон
  note?: string; // Примечание (убран из форм)
  leaders?: StationLeader[]; // Добавленные руководители и телефоны
}

export interface Employee {
  id: string;
  fullName: string; // ФИО
  role: string; // Должность
  department: string; // Подразделение
  phone: string; // Телефон
  note: string; // Примечание
}

export interface Manager {
  id: string;
  fullName: string;
  role: string;
  department: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Source {
  id: string;
  name: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string; // "pdf" | "docx" | "xlsx" | "jpg" | "png" | "other"
  fileData?: string; // Base64 content or static/mock URL info
  size?: string;
}

export interface Task {
  id: string; // Внутренний номер
  type: TaskType;
  title: string;
  text: string;
  categoryId: string; // Справочник категорий
  sourceId: string; // Справочник источников
  managerId: string; // Кто дал поручение
  docBasisNumber: string; // Номер документа-основания
  docBasisDate: string; // Дата документа-основания
  dateGiven: string; // Дата выдачи (YYYY-MM-DD)
  infoDeadline: string; // Срок предоставления информации (YYYY-MM-DD)
  executeDeadline: string; // Срок исполнения (YYYY-MM-DD)
  importance: ImportanceLevel;
  specialControl: boolean; // Особый контроль
  status: TaskStatus;
  note: string; // Примечание
  assignments?: string[]; // Исполнители (Employee IDs, для индивидуального поручения)
  attachments: Attachment[];
}

export interface RelatedDocument {
  id: string;
  taskId: string;
  type: DocType;
  number: string;
  date: string;
  description: string;
  attachments: Attachment[];
}

export interface TaskProgress {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD HH:MM
  text: string;
  attachments: Attachment[];
}

export interface TaskStationState {
  taskId: string;
  stationId: string;
  status: TaskStatus;
  reportDate?: string;
  comment: string;
  attachments: Attachment[];
}

export interface Meeting {
  id: string;
  theme: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  leader: string; // ФИО руководителя
  description: string;
  attachments: Attachment[];
}

export interface Note {
  id: string;
  title: string;
  text: string;
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:MM
  attachments: Attachment[];
  isCompleted?: boolean;
}

export interface AppDatabase {
  stations: Station[];
  employees: Employee[];
  managers: Manager[];
  categories: Category[];
  sources: Source[];
  tasks: Task[];
  relatedDocuments: RelatedDocument[];
  taskProgress: TaskProgress[];
  taskStations: TaskStationState[];
  meetings: Meeting[];
  notes: Note[];
}
