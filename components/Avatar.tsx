"use client";

import { memberColor } from "@/lib/utils";

export function Avatar({
  member,
  members,
  size = 22,
}: {
  member: { id: string; first_name: string; avatar_color?: string | null } | null;
  members: { id: string; avatar_color?: string | null }[];
  size?: number;
}) {
  if (!member) return null;
  const initials = member.first_name.slice(0, 2).toUpperCase();
  const color = memberColor(members, member.id);
  return (
    <div
      className="rounded-full flex items-center justify-center text-paper font-medium shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      title={member.first_name}
    >
      {initials}
    </div>
  );
}
