import { NextResponse } from "next/server";
import {
  generateShoppingSuggestions,
  normalizeShoppingProductName,
  type ShoppingSuggestionPreference,
} from "@/lib/dabo-shopping-engine";
import type { ShoppingItem } from "@/lib/types";

function item(id: string, name: string, boughtOn: string, status: "bought" | "to_buy" = "bought"): ShoppingItem {
  return {
    id,
    household_id: "home-1",
    name,
    quantity: null,
    assigned_to: null,
    status,
    urgent: false,
    due_date: null,
    bought_at: status === "bought" ? `${boughtOn}T12:00:00.000Z` : null,
    created_at: `${boughtOn}T12:00:00.000Z`,
  };
}

const none: ShoppingSuggestionPreference[] = [];

export async function GET() {
  const tests = [
    {
      name: "less_than_3_purchases_stays_silent",
      pass: generateShoppingSuggestions({
        today: "2026-09-11",
        preferences: none,
        items: [item("1", "Lait", "2026-08-20"), item("2", "Lait", "2026-09-01")],
      }).length === 0,
    },
    {
      name: "milk_10_and_12_day_pattern_is_detected",
      pass: (() => {
        const result = generateShoppingSuggestions({
          today: "2026-09-11",
          preferences: none,
          items: [
            item("1", "Lait", "2026-08-10"),
            item("2", "lait", "2026-08-20"),
            item("3", "Lait", "2026-09-01"),
          ],
        })[0];
        return !!result && result.rhythmDays === 11 && result.expectedOn === "2026-09-12";
      })(),
    },
    {
      name: "suggestion_starts_slightly_before_expected_date",
      pass: generateShoppingSuggestions({
        today: "2026-09-10",
        preferences: none,
        items: [item("1", "Lait", "2026-08-10"), item("2", "Lait", "2026-08-20"), item("3", "Lait", "2026-09-01")],
      }).length === 0,
    },
    {
      name: "irregular_pack_water_pattern_is_rejected",
      pass: generateShoppingSuggestions({
        today: "2026-08-22",
        preferences: none,
        items: [item("1", "Pack d'eau", "2026-08-16"), item("2", "Pack d'eau", "2026-08-20"), item("3", "Pack d'eau", "2026-08-21")],
      }).length === 0,
    },
    {
      name: "already_in_active_list_is_not_suggested",
      pass: generateShoppingSuggestions({
        today: "2026-09-11",
        preferences: none,
        items: [
          item("1", "Lait", "2026-08-10"), item("2", "Lait", "2026-08-20"), item("3", "Lait", "2026-09-01"),
          item("4", "LAIT", "2026-09-11", "to_buy"),
        ],
      }).length === 0,
    },
    {
      name: "disabled_product_is_not_suggested",
      pass: generateShoppingSuggestions({
        today: "2026-09-11",
        items: [item("1", "Lait", "2026-08-10"), item("2", "Lait", "2026-08-20"), item("3", "Lait", "2026-09-01")],
        preferences: [{
          household_id: "home-1", product_key: "lait", last_label: "Lait", dismiss_count: 0,
          snoozed_until: null, disabled: true, accepted_count: 0, removed_without_purchase_count: 0,
          last_suggested_at: null, last_accepted_at: null, last_dismissed_at: null,
        }],
      }).length === 0,
    },
    {
      name: "snoozed_product_is_not_suggested",
      pass: generateShoppingSuggestions({
        today: "2026-09-11",
        items: [item("1", "Lait", "2026-08-10"), item("2", "Lait", "2026-08-20"), item("3", "Lait", "2026-09-01")],
        preferences: [{
          household_id: "home-1", product_key: "lait", last_label: "Lait", dismiss_count: 1,
          snoozed_until: "2026-09-12T00:00:00.000Z", disabled: false, accepted_count: 0, removed_without_purchase_count: 0,
          last_suggested_at: null, last_accepted_at: null, last_dismissed_at: null,
        }],
      }).length === 0,
    },
    {
      name: "simple_plural_normalization_is_conservative",
      pass: normalizeShoppingProductName("  Tomates  ") === "tomate" && normalizeShoppingProductName("Lait d'amande") === "lait d'amande",
    },
    {
      name: "latest_household_label_is_reused",
      pass: generateShoppingSuggestions({
        today: "2026-09-11",
        preferences: none,
        items: [item("1", "tomate", "2026-08-10"), item("2", "Tomates", "2026-08-20"), item("3", "TOMATES", "2026-09-01")],
      })[0]?.label === "TOMATES",
    },
    {
      name: "stale_habit_eventually_expires",
      pass: generateShoppingSuggestions({
        today: "2026-10-15",
        preferences: none,
        items: [item("1", "Lait", "2026-08-10"), item("2", "Lait", "2026-08-20"), item("3", "Lait", "2026-09-01")],
      }).length === 0,
    },
  ];

  const passed = tests.filter((test) => test.pass).length;
  return NextResponse.json({
    allPassed: passed === tests.length,
    score: `${passed}/${tests.length}`,
    tests,
  });
}
