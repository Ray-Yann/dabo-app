import type { CalendarEvent } from "./types";

export type CalendarRecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly";

type RecurrenceLike = Pick<CalendarEvent, "event_date" | "recurring"> & Partial<Pick<CalendarEvent, "recurrence_frequency" | "recurrence_interval" | "recurrence_end_date">>;

function civil(value: string): Date { return new Date(`${value}T00:00:00`); }
function startOfDay(value = new Date()): Date { const d = new Date(value); d.setHours(0,0,0,0); return d; }
function daysBetween(a: Date, b: Date): number { return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()) - Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())) / 86400000); }
function monthsBetween(a: Date, b: Date): number { return (b.getFullYear()-a.getFullYear())*12 + b.getMonth()-a.getMonth(); }
function addMonthsClamped(anchor: Date, months: number): Date { const y=anchor.getFullYear(); const m=anchor.getMonth()+months; const last=new Date(y,m+1,0).getDate(); return new Date(y,m,Math.min(anchor.getDate(),last)); }
function normalized(e: RecurrenceLike) { return { frequency: (e.recurrence_frequency || (e.recurring ? "yearly" : "none")) as CalendarRecurrenceFrequency, interval: Math.max(1, e.recurrence_interval || 1), end: e.recurrence_end_date ? civil(e.recurrence_end_date) : null }; }
export function isRecurringCalendarEvent(e: RecurrenceLike): boolean { return normalized(e).frequency !== "none"; }
export function occurrenceOnOrAfter(e: RecurrenceLike, from = new Date()): Date | null {
  const anchor=civil(e.event_date); const target=startOfDay(from); const {frequency,interval,end}=normalized(e);
  let out: Date;
  if (frequency === "none") out=anchor;
  else if (frequency === "daily") { const diff=Math.max(0,daysBetween(anchor,target)); out=new Date(anchor); out.setDate(anchor.getDate()+Math.ceil(diff/interval)*interval); }
  else if (frequency === "weekly") { const step=7*interval; const diff=Math.max(0,daysBetween(anchor,target)); out=new Date(anchor); out.setDate(anchor.getDate()+Math.ceil(diff/step)*step); }
  else if (frequency === "monthly") { const diff=Math.max(0,monthsBetween(anchor,target)); out=addMonthsClamped(anchor,Math.ceil(diff/interval)*interval); if(out<target) out=addMonthsClamped(anchor,(Math.ceil(diff/interval)+1)*interval); }
  else { const years=Math.max(0,target.getFullYear()-anchor.getFullYear()); const n=Math.ceil(years/interval); out=addMonthsClamped(anchor,n*interval*12); if(out<target) out=addMonthsClamped(anchor,(n+1)*interval*12); }
  if (out < anchor || (end && out > end)) return null; return out;
}
export function occurrencesInRange(e: RecurrenceLike, start: Date, end: Date, max=400): Date[] {
  const result: Date[]=[]; let cursor=startOfDay(start); for(let i=0;i<max;i++){ const next=occurrenceOnOrAfter(e,cursor); if(!next || next>end) break; result.push(next); cursor=new Date(next); cursor.setDate(cursor.getDate()+1); } return result;
}
export function recurrenceSummary(e: RecurrenceLike, unit:(f:CalendarRecurrenceFrequency,n:number)=>string): string { const {frequency,interval}=normalized(e); return unit(frequency,interval); }
