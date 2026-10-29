// builds the WhereAreThey mark: an orb whose ring of fragments opens toward a star beyond it,
// with a small constellation (pieces of evidence joined up) at its core
const C=32,deg=a=>a*Math.PI/180,P=(r,a)=>[+(C+r*Math.cos(deg(a))).toFixed(2),+(C+r*Math.sin(deg(a))).toFixed(2)];
const arc=(r,a0,a1)=>{const p=P(r,a0),q=P(r,a1);return `M${p} A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${q}`};
const GAP=315;
export default function mark({simple=false}={}){
  const R=21.5, sw=simple?4.2:3.2;
  const frags=(simple?[[-15,62],[74,152],[164,240],[252,285]]:[[-14,58],[70,140],[152,206],[218,284]])
    .map(([a,b])=>`<path d="${arc(R,a,b)}"/>`).join("");
  const s=P(30,GAP), k=simple?4.6:3.6, w=simple?1.5:1.05;
  const star=`<path d="M${s[0]} ${s[1]-k}Q${s[0]+w*0.35} ${s[1]-w*0.35} ${s[0]+k} ${s[1]}Q${s[0]+w*0.35} ${s[1]+w*0.35} ${s[0]} ${s[1]+k}Q${s[0]-w*0.35} ${s[1]+w*0.35} ${s[0]-k} ${s[1]}Q${s[0]-w*0.35} ${s[1]-w*0.35} ${s[0]} ${s[1]-k}Z"/>`;
  const nodes=[[12.5,64],[12.5,146],[12.5,212]].map(([r,a])=>P(r,a));
  const web=simple?"":`<path d="${nodes.map(n=>`M${C} ${C}L${n}`).join("")}" stroke-width="1.15" opacity=".5"/>
  <path d="M${P(8,GAP)}L${P(24.5,GAP)}" stroke-width="1.3" stroke-dasharray="0.1 3.2" opacity=".9"/>`;
  return `<g fill="none" stroke="currentColor" stroke-linecap="round">
  <g stroke-width="${sw}">${frags}</g>
  ${web}
</g>
<g fill="currentColor">
  ${simple?"":nodes.map(n=>`<circle cx="${n[0]}" cy="${n[1]}" r="1.9"/>`).join("")}
  <circle cx="${C}" cy="${C}" r="${simple?7:5.2}"/>
  ${star}
</g>`;
};
