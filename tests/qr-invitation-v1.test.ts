import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("QR Invitation V1 genere le QR localement sans service externe", () => {
  assert.ok(pkg.dependencies?.["qrcode.react"]);
  assert.match(settings, /QRCodeSVG/);
  assert.doesNotMatch(settings, /api\.qrserver|chart\.googleapis|quickchart\.io/i);
});

test("QR Invitation V1 encode exactement le lien canonique d invitation DABO", () => {
  assert.match(
    settings,
    /\?invite=\$\{encodeURIComponent\(household\.invite_code\)\}/
  );
  assert.match(settings, /<QRCodeSVG[^>]*value=\{inviteUrl\}/);
});

test("QR Invitation V1 reste dans le bloc d invitation existant", () => {
  assert.match(settings, /id="dabo-invite-member"/);
  assert.match(settings, /settings_invite_qr_title/);
  assert.match(settings, /settings_invite_qr_hint/);
  assert.match(settings, /settings_share_invite/);
});

test("QR Invitation V1 couvre les sept langues DABO", () => {
  for (const key of [
    "settings_invite_qr_title",
    "settings_invite_qr_hint",
  ]) {
    const count = [...i18n.matchAll(new RegExp(key + ":", "g"))].length;
    assert.equal(
      count,
      7,
      key + " doit exister exactement une fois dans chacune des 7 langues"
    );
  }
});
