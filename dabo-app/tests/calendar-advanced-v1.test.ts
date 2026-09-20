import test from "node:test";
import assert from "node:assert/strict";
import { occurrenceOnOrAfter, occurrencesInRange } from "../lib/calendar-recurrence";

const base = { event_date:"2026-09-23", recurring:true, recurrence_frequency:"daily" as const, recurrence_interval:2, recurrence_end_date:null };
test("gÃ¨re un rappel tous les deux jours",()=>{ assert.equal(occurrenceOnOrAfter(base,new Date("2026-09-24T12:00:00"))?.getDate(),25); });
test("ancre les occurrences sur la date de dÃ©part",()=>{ assert.deepEqual(occurrencesInRange(base,new Date("2026-09-23"),new Date("2026-09-30")).map(d=>d.getDate()),[23,25,27,29]); });
test("respecte la fin de rÃ©currence",()=>{ assert.equal(occurrenceOnOrAfter({...base,recurrence_end_date:"2026-09-26"},new Date("2026-09-26"))?.getDate(),undefined); });
test("prÃ©serve les anciens Ã©vÃ©nements rÃ©currents comme annuels",()=>{ const legacy={event_date:"2020-09-23",recurring:true}; const occurrence=occurrenceOnOrAfter(legacy,new Date("2026-09-17")); assert.equal(occurrence ? [occurrence.getFullYear(),String(occurrence.getMonth()+1).padStart(2,"0"),String(occurrence.getDate()).padStart(2,"0")].join("-") : undefined,"2026-09-23"); });

