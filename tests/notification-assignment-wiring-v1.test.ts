import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const shopping = fs.readFileSync("app/app/courses/page.tsx", "utf8");

test("Assignment Wiring V1 importe le ciblage dans Taches", () => {
  assert.match(
    tasks,
    /import \{ notifyHousehold, notifyMembers \} from "@\/lib\/notifications"/
  );
  assert.match(
    tasks,
    /import \{ newlyAssignedMemberIds \} from "@\/lib\/notification-assignment-targeting"/
  );
});

test("Assignment Wiring V1 notifie les nouvelles attributions de Taches", () => {
  assert.match(tasks, /newlyAssignedMemberIds\(/);
  assert.match(
    tasks,
    /notifyMembers\([\s\S]*?"notif_task_assigned"/
  );
});

test("Assignment Wiring V1 tient compte des sous-taches pour les Taches", () => {
  assert.match(
    tasks,
    /validSubtasks\.map\(\(item\) => item\.assignedTo/
  );
  assert.match(
    tasks,
    /subtasks\s*\.filter\(\(item\) => item\.task_id === id\)/
  );
});

test("Assignment Wiring V1 importe le ciblage dans Courses", () => {
  assert.match(
    shopping,
    /import \{ notifyHousehold, notifyMembers \} from "@\/lib\/notifications"/
  );
  assert.match(
    shopping,
    /import \{ newlyAssignedMemberIds \} from "@\/lib\/notification-assignment-targeting"/
  );
});

test("Assignment Wiring V1 notifie les nouvelles attributions de Courses", () => {
  assert.match(shopping, /newlyAssignedMemberIds\(/);
  assert.match(
    shopping,
    /notifyMembers\([\s\S]*?"notif_item_assigned"/
  );
});

test("Assignment Wiring V1 compare l ancienne attribution de Course", () => {
  assert.match(
    shopping,
    /items\.find\(\(i\) => i\.id === id\)/
  );
  assert.match(
    shopping,
    /assigned_to/
  );
});
