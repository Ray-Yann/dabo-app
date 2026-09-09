import type { ReactNode } from "react";

function inline(text:string):ReactNode[]{
 const parts=text.split(/(\*\*[^*]+\*\*)/g);
 return parts.map((part,i)=>part.startsWith("**")&&part.endsWith("**")?<strong key={i} className="font-semibold">{part.slice(2,-2)}</strong>:part);
}

export function LobaMarkdown({text}:{text:string}){
 const lines=text.replace(/\r/g,"").split("\n");
 const out:ReactNode[]=[];
 for(let i=0;i<lines.length;){
  const line=lines[i].trim();
  if(!line){i++;continue}
  const next=(lines[i+1]||"").trim();
  if(line.includes("|")&&/^\|?\s*:?-{3,}/.test(next)){
   const rows:string[][]=[];const header=line.split("|").map(x=>x.trim()).filter(Boolean);i+=2;
   while(i<lines.length&&lines[i].includes("|")){rows.push(lines[i].split("|").map(x=>x.trim()).filter(Boolean));i++}
   out.push(<div key={`t${i}`} className="my-3 overflow-x-auto rounded-lg border border-white/15"><table className="min-w-full text-xs"><thead className="bg-white/10"><tr>{header.map((c,j)=><th key={j} className="px-3 py-2 text-left align-top font-semibold">{inline(c)}</th>)}</tr></thead><tbody>{rows.map((r,ri)=><tr key={ri} className="border-t border-white/10">{header.map((_,j)=><td key={j} className="px-3 py-2 align-top">{inline(r[j]||"")}</td>)}</tr>)}</tbody></table></div>);continue
  }
  const h=line.match(/^(#{1,4})\s+(.+)$/);if(h){const cls=h[1].length===1?"text-base":"text-sm";out.push(<div key={i} className={`${cls} font-semibold mt-3 mb-1`}>{inline(h[2])}</div>);i++;continue}
  if(/^[-*]\s+/.test(line)){const items:string[]=[];while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){items.push(lines[i].trim().replace(/^[-*]\s+/,""));i++}out.push(<ul key={`u${i}`} className="my-2 list-disc pl-5 space-y-1">{items.map((x,j)=><li key={j}>{inline(x)}</li>)}</ul>);continue}
  if(/^\d+[.)]\s+/.test(line)){const items:string[]=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i])){items.push(lines[i].trim().replace(/^\d+[.)]\s+/,""));i++}out.push(<ol key={`o${i}`} className="my-2 list-decimal pl-5 space-y-1">{items.map((x,j)=><li key={j}>{inline(x)}</li>)}</ol>);continue}
  out.push(<p key={i} className="my-1.5">{inline(line)}</p>);i++;
 }
 return <div className="loba-markdown">{out}</div>;
}
