"use client";

import { memberColor } from "@/lib/utils";

type AvatarMember = {
  id: string;
  first_name: string;
  avatar_color?: string | null;
  created_at?: string;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function naturalInitials(name: string) {
  const clean = normalizeName(name);
  if (!clean) return "?";
  const parts = clean.split(/[\s\-’']+/).filter(Boolean);
  if (parts.length > 1) return parts.map((part) => part[0]).join("").slice(0, 3).toUpperCase();
  return clean[0].toUpperCase();
}

function singleNameInitials(member: AvatarMember, members: AvatarMember[]) {
  const name = normalizeName(member.first_name);
  if (!name) return "?";
  if (/[\s\-’']/.test(name)) return naturalInitials(name);

  const sameInitial = members
    .filter((candidate) => {
      const candidateName = normalizeName(candidate.first_name);
      return candidateName && !/[\s\-’']/.test(candidateName) && candidateName[0].toLocaleUpperCase() === name[0].toLocaleUpperCase();
    })
    .sort((a, b) => {
      const byDate = (a.created_at || "").localeCompare(b.created_at || "");
      return byDate || a.id.localeCompare(b.id);
    });

  const index = sameInitial.findIndex((candidate) => candidate.id === member.id);
  if (index <= 0) return name[0].toUpperCase();

  for (let length = 2; length <= name.length; length += 1) {
    const candidate = name.slice(0, length).toLocaleUpperCase();
    const clashes = sameInitial.slice(0, index).some((earlier) =>
      normalizeName(earlier.first_name).slice(0, length).toLocaleUpperCase() === candidate
    );
    if (!clashes) return candidate;
  }
  return name.toUpperCase();
}

export function Avatar({
  member,
  members,
  size = 22,
}: {
  member: AvatarMember | null;
  members: AvatarMember[];
  size?: number;
}) {
  if (!member) return null;
  const initials = singleNameInitials(member, members);
  const color = memberColor(members, member.id);
  return (
    <div
      className="rounded-full flex items-center justify-center text-paper font-medium shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * (initials.length > 2 ? 0.3 : 0.4) }}
      title={member.first_name}
      aria-label={member.first_name}
    >
      {initials}
    </div>
  );
}
