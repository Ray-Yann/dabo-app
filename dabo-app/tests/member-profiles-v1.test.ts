import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("Profils membres V1 rend le bucket avatar privé sans perdre les photos historiques", () => {
  const sql = read("supabase-migrations/2026-09-11-member-profiles-v1-private-avatars.sql");
  assert.match(sql, /add column if not exists avatar_path text/i);
  assert.match(sql, /split_part\(avatar_url, '\/storage\/v1\/object\/public\/member-avatars\//i);
  assert.match(sql, /set public = false/i);
});

test("Profils membres V1 réserve la lecture d'une photo aux membres actifs du même foyer", () => {
  const route = read("app/api/member-avatar/[memberId]/route.ts");
  assert.match(route, /eq\("household_id", target\.household_id\)/);
  assert.match(route, /eq\("user_id", user\.id\)/);
  assert.match(route, /is\("left_at", null\)/);
  assert.match(route, /createSignedUrl\(target\.avatar_path, 60\)/);
});

test("Profils membres V1 conserve un avatar distinct pour chaque profil de foyer", () => {
  const settings = read("app/app/reglages/page.tsx");
  assert.match(settings, /`\$\{userId\}\/\$\{me\.id\}\/\$\{Date\.now\(\)\}\.\$\{extension\}`/);
  assert.match(settings, /avatar_path: path, avatar_url: null, avatar_emoji: null/);
});

test("Profils membres V1 valide réellement les formats et nettoie les anciennes photos", () => {
  const settings = read("app/app/reglages/page.tsx");
  assert.match(settings, /AVATAR_MIME_EXTENSIONS\[file\.type\]/);
  assert.match(settings, /file\.size > MAX_AVATAR_SIZE/);
  assert.match(settings, /removePreviousAvatar\(previousPath\)/);
});

test("Profils membres V1 supprime la photo privée lorsqu'un profil quitte un foyer", () => {
  const admin = read("lib/supabase-admin.ts");
  assert.match(admin, /member\.avatar_path/);
  assert.match(admin, /storage\.from\("member-avatars"\)\.remove\(\[member\.avatar_path\]\)/);
  assert.match(admin, /avatar_path: null/);
  assert.match(admin, /avatar_url: null/);
});
