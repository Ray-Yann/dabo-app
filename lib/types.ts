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
};

export type Task = {
  id: string;
  household_id: string;
  routine_id: string | null;
  name: string;
  weight_points: number;
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

// Barème de points par durée estimée, plus simple à comprendre qu'un nombre libre
export const DURATION_PRESETS = [
  { label: "Rapide (moins de 5 min)", points: 5 },
  { label: "Courte (5 à 15 min)", points: 15 },
  { label: "Moyenne (15 à 30 min)", points: 25 },
  { label: "Longue (30 à 60 min)", points: 40 },
  { label: "Très longue (plus d'1h)", points: 60 },
];
