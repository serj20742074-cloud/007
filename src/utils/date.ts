export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Converts YYYY-MM-DD or YYYY-MM-DD HH:MM to DD.MM.YYYY [HH:MM]
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  
  // Try YYYY-MM-DD HH:MM or similar with time
  if (trimmed.includes(" ")) {
    const [dPart, tPart] = trimmed.split(/\s+/);
    const reg = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dPart.match(reg);
    if (match) {
      return `${match[3]}.${match[2]}.${match[1]} ${tPart}`;
    }
  }

  // Expect YYYY-MM-DD format
  const reg = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = trimmed.match(reg);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }
  
  return dateStr;
}

// Calculates remaining days
export function getDaysRemaining(dateStr: string | undefined | null): number {
  if (!dateStr) return 999;
  const cleanDate = dateStr.split(" ")[0]; // split off time if any
  const todayVal = new Date(getTodayStr() + "T00:00:00");
  const targetVal = new Date(cleanDate + "T00:00:00");
  const diffTime = targetVal.getTime() - todayVal.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Determines background & border classes for task tiles/cards
// "подкрашивай зеленоватого цвета если до срока 7 дней, желтоватого цвета от 6 дней до наступления срока исполнения, и красноватого цвета если просрочено"
export function getTaskBgClass(executeDeadline: string, status: string): string {
  if (status === "Исполнено") {
    // If completed/satisfied, do we still color it or keep it neutrally successful (soft-green)? Let's make it a very quiet greenish white
    return "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100";
  }
  
  const days = getDaysRemaining(executeDeadline);
  
  if (days < 0 || status === "Просрочено") {
    // Overdue -> reddish
    return "bg-red-50 text-red-950 border-red-305 hover:bg-red-100";
  }
  
  if (days <= 6) {
    // 0 to 6 days -> yellowish
    return "bg-amber-50 text-amber-950 border-amber-305 hover:bg-amber-100";
  }
  
  // 7 days or more -> greenish
  return "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100/80";
}
