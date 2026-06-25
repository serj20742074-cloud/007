import { 
  AppDatabase, 
  TaskType, 
  ImportanceLevel, 
  TaskStatus, 
  DocType 
} from "./types";

export const INITIAL_DATABASE: AppDatabase = {
  stations: [],
  employees: [],
  managers: [],
  categories: [],
  sources: [],
  tasks: [],
  relatedDocuments: [],
  taskProgress: [],
  taskStations: [],
  meetings: [],
  notes: []
};

export const DEFAULT_CATEGORIES = [
  { id: "cat-1", name: "Безопасность движения" },
  { id: "cat-2", name: "Техническая документация" },
  { id: "cat-3", name: "Технология работы" },
  { id: "cat-4", name: "Производственная деятельность" },
  { id: "cat-5", name: "Проверки" },
  { id: "cat-6", name: "Ревизии" },
  { id: "cat-7", name: "Охрана труда" },
  { id: "cat-8", name: "Прочее" }
];

export const DEFAULT_SOURCES = [
  { id: "src-1", name: "Совещание" },
  { id: "src-2", name: "Селектор" },
  { id: "src-3", name: "Протокол" },
  { id: "src-4", name: "Мероприятие" },
  { id: "src-5", name: "Телеграмма" },
  { id: "src-6", name: "Приказ" },
  { id: "src-7", name: "Распоряжение" },
  { id: "src-8", name: "Проверка" },
  { id: "src-9", name: "Ревизия" },
  { id: "src-10", name: "Письмо" },
  { id: "src-11", name: "Указание руководителя" },
  { id: "src-12", name: "Прочее" }
];

export const DEMO_DATABASE: AppDatabase = {
  stations: [
    {
      code: "ST-8001",
      name: "Челябинск-Главный",
      chief: "Петров Сергей Николаевич",
      deputy: "Козлов Андрей Викторович",
      phone: "+7 (351) 268-30-01",
      note: "Крупная внеклассная сортировочная станция ЮУЖД."
    },
    {
      code: "ST-8012",
      name: "Златоуст",
      chief: "Сидоров Валерий Михайлович",
      deputy: "Григорьев Игорь Олегович",
      phone: "+7 (351) 364-12-15",
      note: "Участковая станция 1-го класса."
    },
    {
      code: "ST-8033",
      name: "Магнитогорск-Пассажирский",
      chief: "Кузнецов Дмитрий Павлович",
      deputy: "Антонов Руслан Юрьевич",
      phone: "+7 (351) 929-45-20",
      note: "Грузопассажирская станция 2-го класса."
    },
    {
      code: "ST-8045",
      name: "Миасс-1",
      chief: "Лебедев Леонид Эдуардович",
      deputy: "Светлов Артем Владимирович",
      phone: "+7 (351) 355-66-77",
      note: "Промежуточная станция 3-го класса."
    },
    {
      code: "ST-8105",
      name: "Курган-Пассажирский",
      chief: "Морозов Вячеслав Александрович",
      deputy: "Власов Кирилл Сергеевич",
      phone: "+7 (352) 249-10-88",
      note: "Пассажирская станция 1-го класса."
    },
    {
      code: "ST-8120",
      name: "Шадринск",
      chief: "Федоров Алексей Петрович",
      deputy: "Давыдов Роман Игоревич",
      phone: "+7 (352) 539-44-12",
      note: "Грузовая станция 3-го класса."
    },
    {
      code: "ST-8201",
      name: "Карталы-1",
      chief: "Тарасов Владимир Георгиевич",
      deputy: "Николаев Денис Анатольевич",
      phone: "+7 (351) 332-23-45",
      note: "Участковая пограничная станция."
    }
  ],
  employees: [
    {
      id: "emp-1",
      fullName: "Алексеев Максим Романович",
      role: "Главный инженер отдела движения",
      department: "Отдел движения (ДЗД)",
      phone: "+7 (999) 123-45-67",
      note: "Ответственный за технологические карты."
    },
    {
      id: "emp-2",
      fullName: "Васильева Елена Сергеевна",
      role: "Ревизор по безопасности",
      department: "Ревизорский аппарат центра (РБ)",
      phone: "+7 (999) 234-56-78",
      note: "Контроль выполнения предписаний."
    },
    {
      id: "emp-3",
      fullName: "Дмитриев Николай Семенович",
      role: "Ведущий технолог",
      department: "Технический отдел",
      phone: "+7 (999) 345-67-89",
      note: "Ведет разработку ТРА станций."
    },
    {
      id: "emp-4",
      fullName: "Захарова Ольга Петровна",
      role: "Старший специалист по охране труда",
      department: "Служба охраны труда",
      phone: "+7 (999) 456-78-90",
      note: "Координатор весеннего осмотра."
    }
  ],
  managers: [
    {
      id: "man-1",
      fullName: "Романов Константин Борисович",
      role: "Начальник Центра управления",
      department: "Руководство ДЦС"
    },
    {
      id: "man-2",
      fullName: "Савельев Петр Иванович",
      role: "Заместитель начальника Центра по безопасности",
      department: "Руководство ДЦС"
    },
    {
      id: "man-3",
      fullName: "Шевелев Михаил Федорович",
      role: "Главный ревизор железной дороги",
      department: "РБ ЮУЖД"
    }
  ],
  categories: DEFAULT_CATEGORIES,
  sources: DEFAULT_SOURCES,
  tasks: [
    {
      id: "П-2026-001",
      type: TaskType.Individual,
      title: "Корректировка технико-распорядительных актов (ТРА)",
      text: "Провести детальную сверку и внести корректировки в ТРА промежуточных станций в связи с вводом новой автоматизированной системы сигнализации.",
      categoryId: "cat-2", // Техническая документация
      sourceId: "src-1", // Совещание
      managerId: "man-1", // Романов К.Б.
      docBasisNumber: "Протокол ДЦС №3/44",
      docBasisDate: "2026-05-15",
      dateGiven: "2026-06-01",
      infoDeadline: "2026-06-15",
      executeDeadline: "2026-06-25",
      importance: ImportanceLevel.Important,
      specialControl: true,
      status: TaskStatus.InWork,
      note: "Требуется согласование с дорожным ревизором.",
      assignments: ["emp-3", "emp-1"],
      attachments: [
        { id: "att-1", fileName: "Положение_сигнализации_v2.pdf", fileType: "pdf", size: "3.2 МБ" }
      ]
    },
    {
      id: "П-2026-002",
      type: TaskType.Massive,
      title: "Проведение внепланового инструктажа по безопасности движения",
      text: "В связи с допущением случая проезда запрещающего показания на соседней дороге, провести со всеми дежурными по станциям (ДСП) внеплановый инструктаж по регламенту переговоров.",
      categoryId: "cat-1", // Безопасность движения
      sourceId: "src-5", // Телеграмма
      managerId: "man-2", // Савельев П.И.
      docBasisNumber: "ТЛГ РЖД №ОБ-5120",
      docBasisDate: "2026-06-10",
      dateGiven: "2026-06-11",
      infoDeadline: "2026-06-12", // Сегодня!
      executeDeadline: "2026-06-18",
      importance: ImportanceLevel.Urgent,
      specialControl: false,
      status: TaskStatus.InWork,
      note: "Предоставить списки ознакомления.",
      attachments: [
        { id: "att-2", fileName: "Телеграмма_РЖД_проезд.pdf", fileType: "pdf", size: "1.4 МБ" },
        { id: "att-3", fileName: "Регламент_переговоров_приложение.docx", fileType: "docx", size: "220 КБ" }
      ]
    },
    {
      id: "П-2026-003",
      type: TaskType.Individual,
      title: "Устранение замечаний весеннего комиссионного осмотра",
      text: "Подготовить отчет об устранении несоответствий теплового режима в модульных бытовых помещениях составителей поездов.",
      categoryId: "cat-7", // Охрана труда
      sourceId: "src-8", // Проверка
      managerId: "man-2", // Савельев П.И.
      docBasisNumber: "Акт осмотра №ВКО-7",
      docBasisDate: "2026-05-10",
      dateGiven: "2026-05-12",
      infoDeadline: "2026-06-05",
      executeDeadline: "2026-06-10", // УЖЕ ПРОСРОЧЕНО
      importance: ImportanceLevel.Normal,
      specialControl: false,
      status: TaskStatus.Overdue,
      note: "Ждем отчет АХО.",
      assignments: ["emp-4"],
      attachments: []
    },
    {
      id: "П-2026-004",
      type: TaskType.Massive,
      title: "Проверка пожарного инвентаря на постах ЭЦ",
      text: "Проверить укомплектованность всех противопожарных щитов на станциях, наличие исправных огнетушителей, даты последней перезарядки.",
      categoryId: "cat-7", // Охрана труда
      sourceId: "src-11", // Указание руководителя
      managerId: "man-1", // Романов К.Б.
      docBasisNumber: "Распоряжение №Р-991",
      docBasisDate: "2026-06-02",
      dateGiven: "2026-06-02",
      infoDeadline: "2026-06-08",
      executeDeadline: "2026-06-12", // Сегодня дедлайн!
      importance: ImportanceLevel.SpecialControl,
      specialControl: true,
      status: TaskStatus.InWork,
      note: "Контроль ведут ревизоры по безопасности.",
      attachments: []
    }
  ],
  relatedDocuments: [
    {
      id: "doc-ref-1",
      taskId: "П-2026-001",
      type: DocType.Protocol,
      number: "ДЦС №3/44",
      date: "2026-05-15",
      description: "Протокол узлового совещания по оптимизации поездного графика и внедрению автоматизации СЦБ.",
      attachments: [
        { id: "ref-att-1", fileName: "Протокол_совещания_актуальный.docx", fileType: "docx", size: "450 КБ" }
      ]
    },
    {
      id: "doc-ref-2",
      taskId: "П-2026-002",
      type: DocType.Telegram,
      number: "РЖД №ОБ-5120",
      date: "2026-06-10",
      description: "Срочная телеграмма ОАО РЖД о случае нарушений регламента безопасности на станции С.",
      attachments: []
    }
  ],
  taskProgress: [
    {
      id: "prog-1",
      taskId: "П-2026-001",
      date: "2026-06-08 14:30",
      text: "Собраны предварительные данные от станций Челябинск-Главный и Златоуст. Замечания переданы ведущему технологу для проработки форм.",
      attachments: [
        { id: "prog-att-1", fileName: "Предложения_технолога.docx", fileType: "docx", size: "128 КБ" }
      ]
    },
    {
      id: "prog-2",
      taskId: "П-2026-001",
      date: "2026-06-11 11:15",
      text: "Проведено мини-совещание с инженерами движения. Выявлена необходимость уточнения 5-го пункта регламента смены локомотивных бригад.",
      attachments: []
    }
  ],
  taskStations: [
    // Task 2: Внеплановый инструктаж MASSIVE (П-2026-002)
    {
      taskId: "П-2026-002",
      stationId: "ST-8001", // Челябинск-Главный
      status: TaskStatus.Completed,
      reportDate: "2026-06-11",
      comment: "Инструктаж проведен в полном объеме. Ознакомлено 42 сотрудника ДСП.",
      attachments: [
        { id: "m-att-1", fileName: "Листы_ознакомления_Челябинск.pdf", fileType: "pdf", size: "1.2 МБ" }
      ]
    },
    {
      taskId: "П-2026-002",
      stationId: "ST-8012", // Златоуст
      status: TaskStatus.ReportReceived,
      reportDate: "2026-06-12",
      comment: "Списки сформированы, инструктаж пройден 90% персонала. Оставшиеся дежурные пройдут при заступлении в ночные смены.",
      attachments: []
    },
    {
      taskId: "П-2026-002",
      stationId: "ST-8033", // Магнитогорск
      status: TaskStatus.InWork,
      comment: "В процессе проведения инструктажа. Плановое окончание – 14.06.",
      attachments: []
    },
    {
      taskId: "П-2026-002",
      stationId: "ST-8045", // Миасс-1
      status: TaskStatus.InWork,
      comment: "Инструктажи начаты, задержек нет.",
      attachments: []
    },
    {
      taskId: "П-2026-002",
      stationId: "ST-8105", // Курган-Пассажирский
      status: TaskStatus.NotStarted,
      comment: "Заявка на проведение инструктажа в работе, ответственный начальник смены задержан.",
      attachments: []
    },
    {
      taskId: "П-2026-002",
      stationId: "ST-8120", // Шадринск
      status: TaskStatus.Completed,
      reportDate: "2026-06-12",
      comment: "Полный объем инструктажей выполнен, листы отправлены в ДЦС.",
      attachments: []
    },
    {
      taskId: "П-2026-002",
      stationId: "ST-8201", // Карталы-1
      status: TaskStatus.NotStarted,
      comment: "Нет связи с начальником станции, поручение принято позже в работу.",
      attachments: []
    },

    // Task 4: Проверка пожарного инвентаря MASSIVE (П-2026-004) - executeDeadline 2026-06-12 (Сегодня!)
    {
      taskId: "П-2026-004",
      stationId: "ST-8001", // Челябинск-Главный
      status: TaskStatus.Completed,
      reportDate: "2026-06-10",
      comment: "Все посты ЭЦ проверены. Огнетушители все поверены (следующая дата ноябрь 2026). Замечаний нет.",
      attachments: [
        { id: "m-att-2", fileName: "Фото_щита_Челябинск.jpg", fileType: "jpg", size: "2.1 МБ" }
      ]
    },
    {
      taskId: "П-2026-004",
      stationId: "ST-8012", // Златоуст
      status: TaskStatus.Completed,
      reportDate: "2026-06-12",
      comment: "Проверено, огнетушители в норме, песок укомплектован.",
      attachments: []
    },
    {
      taskId: "П-2026-004",
      stationId: "ST-8033", // Магнитогорск
      status: TaskStatus.InWork,
      comment: "Проверка завершается, акт подписывается начальником.",
      attachments: []
    },
    {
      taskId: "П-2026-004",
      stationId: "ST-8045", // Миасс-1
      status: TaskStatus.NotStarted,
      comment: "К проверке пожарного инвентаря пока не приступали.",
      attachments: []
    },
    {
      taskId: "П-2026-004",
      stationId: "ST-8105", // Курган
      status: TaskStatus.ReportReceived,
      reportDate: "2026-06-12",
      comment: "Обнаружен просроченный огнетушитель на посту №2, осуществлена замена на резервный. Отчет отправлен.",
      attachments: []
    },
    {
      taskId: "П-2026-004",
      stationId: "ST-8120", // Шадринск
      status: TaskStatus.NotStarted, // Будет просроченное по этой станции!
      comment: "Начальник станции на выезде, комиссия не сформирована.",
      attachments: []
    },
    {
      taskId: "П-2026-004",
      stationId: "ST-8201", // Карталы-1
      status: TaskStatus.Completed,
      reportDate: "2026-06-11",
      comment: "Замечаний нет, комплекты ПБ на четырех постах проверены полностью.",
      attachments: []
    }
  ],
  meetings: [
    {
      id: "meet-1",
      theme: "Селекторное совещание о подготовке к летней пассажирской кампании",
      date: "2026-06-15",
      time: "09:00",
      leader: "Романов Константин Борисович",
      description: "Заслушивание руководителей станций первого класса о готовности платформ, залов ожидания и систем кондиционирования. К выполнению поручений привлечь весь инженерный блок.",
      attachments: [
        { id: "m-att-1", fileName: "План_селектора_15_06.pdf", fileType: "pdf", size: "750 КБ" }
      ]
    },
    {
      id: "meet-2",
      theme: "Разбор случая нарушения техники безопасности при маневрах",
      date: "2026-06-12", // Сегодня!
      time: "15:30",
      leader: "Савельев Петр Иванович",
      description: "Обязательное участие начальников станций Челябинск-Главный и Златоуст. Доклад ревизора ДЗД по материалам расследования.",
      attachments: []
    },
    {
      id: "meet-3",
      theme: "Производственное совещание по итогам работы за май",
      date: "2026-06-18",
      time: "11:00",
      leader: "Романов Константин Борисович",
      description: "Анализ выполнения объемов погрузки, выгрузки, оборота вагонов. Рассмотрение планов на июнь.",
      attachments: []
    }
  ],
  notes: [
    {
      id: "note-1",
      title: "Памятка: Сверка ТРА до конца месяца",
      text: "Напомнить ведущему технологу Дмитриеву о необходимости направить запросы по уширению колеи на съезде №5 станции Златоуст.",
      reminderDate: "2026-06-15",
      reminderTime: "10:00",
      attachments: []
    },
    {
      id: "note-2",
      title: "Проверить отчетность по огнетушителям",
      text: "Станция Шадринск частенько задерживает сдачу пожарных допусков. Проконтролировать лично звонком начальнику Федорову.",
      reminderDate: "2026-06-12", // Сегодня!
      reminderTime: "14:00",
      attachments: []
    },
    {
      id: "note-3",
      title: "Подготовить списки участников селектора",
      text: "Подготовить списки участников для Савельева П.И. на тему весеннего осмотра. Собрать подписи со всех инструкторов.",
      attachments: []
    }
  ]
};
