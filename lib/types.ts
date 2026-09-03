export type Household = {
  id: string;
  name: string;
  invite_code: string;
  household_type: "couple" | "coloc" | "famille";
  equity_score_enabled: boolean;
  created_at: string;
};

export type Member = {
  id: string;
  household_id: string;
  user_id: string;
  first_name: string;
  role: "creator" | "member";
  rotation_order: number;
  avatar_color: string | null;
  language: "fr" | "nl" | "en";
  dark_mode: boolean;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  assigned_to: string | null;
  status: "to_buy" | "bought";
  urgent: boolean;
  due_date: string | null;
  bought_at: string | null;
  created_at: string;
  dabo_suggestion_product_key?: string | null;
};

export type Task = {
  id: string;
  household_id: string;
  routine_id: string | null;
  name: string;
  weight_points: number;
  duration_key: string | null;
  effort_level: string | null;
  assigned_to: string | null;
  status: "pending" | "done";
  urgent: boolean;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  household_id: string;
  author_id: string;
  text: string;
  task_id: string | null;
  shopping_item_id: string | null;
  created_at: string;
};

export type Promo = {
  id: string;
  household_id: string;
  author_id: string;
  product_name: string;
  store_name: string;
  note: string | null;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  household_id: string;
  created_by: string | null;
  title: string;
  event_date: string;
  recurring: boolean;
  reminder_days_before: number;
  created_at: string;
};

// Barème de points par durée estimée, plus simple à comprendre qu'un nombre libre
export const DURATION_PRESETS = [
  { label: "Rapide (moins de 5 min)", points: 5 },
  { label: "Courte (5 à 15 min)", points: 15 },
  { label: "Moyenne (15 à 30 min)", points: 25 },
  { label: "Longue (30 à 60 min)", points: 40 },
  { label: "Très longue (plus d'1h)", points: 60 },
];

// Nouveau modèle de calcul (Phase 1) : durée + effort, séparés et additionnés,
// pour que la personne comprenne exactement pourquoi une tâche vaut X points —
// jamais une formule opaque. L'ancien DURATION_PRESETS reste utilisé tel quel
// pour l'édition des tâches créées avant ce changement, sans rien recalculer.
export const DURATION_OPTIONS = [
  { key: "5min", label: "5 min", points: 5 },
  { key: "10min", label: "10 min", points: 8 },
  { key: "15min", label: "15 min", points: 12 },
  { key: "30min", label: "30 min", points: 20 },
  { key: "45min", label: "45 min", points: 28 },
  { key: "1h", label: "1 h", points: 35 },
  { key: "1h+", label: "Plus d'1 h", points: 50 },
];

export const EFFORT_OPTIONS = [
  { key: "faible", label: "Faible", bonus: 0 },
  { key: "moyen", label: "Moyen", bonus: 5 },
  { key: "important", label: "Important", bonus: 10 },
];

export function computeTaskPoints(durationKey: string, effortKey: string): number {
  const duration = DURATION_OPTIONS.find((d) => d.key === durationKey)?.points ?? 12;
  const effort = EFFORT_OPTIONS.find((e) => e.key === effortKey)?.bonus ?? 0;
  return duration + effort;
}

export type RoutineFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom";

export type Routine = {
  id: string;
  household_id: string;
  name: string;
  weight_points: number;
  duration_key: string | null;
  effort_level: string | null;
  frequency: RoutineFrequency;
  custom_days: number[] | null;
  anchor_date: string | null;
  active: boolean;
  ended_at: string | null;
  last_assigned_member: string | null;
  created_at: string;
};
