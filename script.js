const EX={k:'',metric:'euclid',p:3,norm:'none',feats:['x1','x2'],rows:['A','B','C'].map(n=>({n:n,v:['',''],c:''})),q:['','']};
let S;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f=n=>+(+n).toFixed(2);
const PAL=['#d6453d','#1d6fd1','#2a9d5c','#c98a0b','#8450c9','#0f7b8a','#c2457f','#6b7280'];

function reset(){S=JSON.parse(JSON.stringify(EX));$('k').value=S.k;$('metric').value=S.metric;$('norm').value=S.norm;$('p').value=S.p;$('pbox').hidden=true;draw();$('out').hidden=true;$('err').textContent=''}

function draw(){
 const nf=S.feats.length;
 let h='<tr><th>Point</th>'+S.feats.map((n,i)=>`<th><input data-f="${i}" value="${esc(n)}" aria-label="Feature name"> <button class="x" data-df="${i}" ${nf<2?'disabled':''} title="Delete column" aria-label="Delete column ${esc(n)}">×</button></th>`).join('')+'<th>Class</th><th></th></tr>';
 S.rows.forEach((r,ri)=>{
  h+=`<tr><td><input class="nm" data-n="${ri}" value="${esc(r.n)}" aria-label="Point name"></td>`+r.v.map((v,i)=>`<td><input type="number" step="any" data-r="${ri}" data-c="${i}" value="${esc(v)}"></td>`).join('')+`<td><input class="nm" data-cls="${ri}" value="${esc(r.c)}" aria-label="Class"></td><td><button class="x" data-dr="${ri}" title="Delete row" aria-label="Delete row ${esc(r.n)}">×</button></td></tr>`;
 });
 h+='<tr class="q"><td><b>Q (query)</b></td>'+S.q.map((v,i)=>`<td><input type="number" step="any" data-q="${i}" value="${esc(v)}"></td>`).join('')+'<td>???</td><td></td></tr>';
 $('tbl').innerHTML=h;
}

$('tbl').addEventListener('input',e=>{
 const d=e.target.dataset;
 if(d.f!==undefined)S.feats[d.f]=e.target.value;
 else if(d.n!==undefined)S.rows[d.n].n=e.target.value;
 else if(d.cls!==undefined)S.rows[d.cls].c=e.target.value;
 else if(d.r!==undefined)S.rows[d.r].v[d.c]=e.target.value;
 else if(d.q!==undefined)S.q[d.q]=e.target.value;
});
$('tbl').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.dr!==undefined)S.rows.splice(b.dataset.dr,1);
 else if(b.dataset.df!==undefined){const i=+b.dataset.df;S.feats.splice(i,1);S.rows.forEach(r=>r.v.splice(i,1));S.q.splice(i,1)}
 else return;
 draw();
});
$('addRow').onclick=()=>{S.rows.push({n:String.fromCharCode(65+S.rows.length%26)+(S.rows.length>25?Math.floor(S.rows.length/26):''),v:S.feats.map(()=>''),c:''});draw()};
$('addCol').onclick=()=>{S.feats.push('x'+(S.feats.length+1));S.rows.forEach(r=>r.v.push(''));S.q.push('');draw()};
$('reset').onclick=reset;
$('metric').onchange=()=>{$('pbox').hidden=$('metric').value!=='mink'};
$('calc').onclick=calc;

function calc(){
 const err=m=>{$('err').textContent=m;$('out').hidden=true};
 $('err').textContent='';
 let k=parseInt($('k').value,10);
 const metric=$('metric').value,p=parseFloat($('p').value),norm=$('norm').value;
 if(!S.rows.length)return err('Add at least one training row.');
 if(!(k>=1))return err('Enter k as a whole number of 1 or more.');
 if(metric==='mink'&&!(p>=1))return err('p must be 1 or more.');
 const nf=S.feats.length;
 const rows=S.rows.map(r=>({n:r.n||'?',c:String(r.c).trim(),v:r.v.map(parseFloat)}));
 const q=S.q.map(parseFloat);
 if(q.some(isNaN)||rows.some(r=>r.v.some(isNaN)))return err('Fill every feature cell with a number, including the query row.');
 if(rows.some(r=>!r.c))return err('Every row needs a class label.');
 let kNote='';
 if(k>rows.length){k=rows.length;kNote=`k is larger than the number of rows, so k = ${k} is used.`}

 // scaling (statistics from training rows only)
 const cols=[...Array(nf).keys()].map(i=>rows.map(r=>r.v[i]));
 const st=cols.map(c=>{const m=c.reduce((a,b)=>a+b,0)/c.length;const sd=Math.sqrt(c.reduce((a,b)=>a+(b-m)**2,0)/c.length)||1;const mn=Math.min(...c),mx=Math.max(...c);return{m,sd,mn,rg:(mx-mn)||1}});
 const tf=(x,i)=>norm==='z'?(x-st[i].m)/st[i].sd:norm==='mm'?(x-st[i].mn)/st[i].rg:x;
 const tq=q.map(tf);

 const items=rows.map((r,idx)=>{
  const t=r.v.map(tf);
  const diffs=t.map((x,i)=>Math.abs(tq[i]-x));
  let d,fm;
  if(metric==='euclid'){const s=diffs.reduce((a,b)=>a+b*b,0);d=Math.sqrt(s);fm=`√(${t.map((x,i)=>`(${f(tq[i])}−${f(x)})²`).join('+')}) = √${f(s)}`}
  else if(metric==='manh'){d=diffs.reduce((a,b)=>a+b,0);fm=t.map((x,i)=>`|${f(tq[i])}−${f(x)}|`).join('+')}
  else{const s=diffs.reduce((a,b)=>a+b**p,0);d=s**(1/p);fm=`(${t.map((x,i)=>`|${f(tq[i])}−${f(x)}|^${p}`).join('+')})^(1/${p})`}
  return{...r,idx,d:+d.toFixed(9),fm,sum:r.v.reduce((a,b)=>a+b,0)};
 });
 // nearest first; equal distance -> smaller values first; then row order
 items.sort((a,b)=>a.d-b.d||a.sum-b.sum||a.idx-b.idx);
 const kd=items[k-1].d;
 const tied=items.filter(i=>i.d===kd).length>1&&items.slice(k).some(i=>i.d===kd);

 // vote
 const V={};
 items.slice(0,k).forEach((it,i)=>{const o=V[it.c]=V[it.c]||{c:it.c,n:0,td:0,first:i};o.n++;o.td+=it.d});
 const vs=Object.values(V).sort((a,b)=>b.n-a.n||a.td-b.td||a.first-b.first);
 const win=vs[0];
 const voteTie=vs.length>1&&vs[1].n===win.n;
 const order=[];rows.forEach(r=>{if(!order.includes(r.c))order.push(r.c)});
 const col=c=>PAL[order.indexOf(c)%PAL.length];

 let h=`<div class="win" style="background:${col(win.c)}"><div>Q is classified as</div><b>${esc(win.c)}</b><div>${win.n} of ${k} neighbors voted for it (confidence ${Math.round(100*win.n/k)}%)</div></div>`;
 const notes=[];
 if(kNote)notes.push(kNote);
 if(voteTie)notes.push(`Vote tie between ${vs.filter(v=>v.n===win.n).map(v=>esc(v.c)).join(' and ')}: the class with the smaller total distance (${f(win.td)}) wins.`);
 if(tied)notes.push(`Several points share the k-th distance (${f(kd)}). The ones with smaller feature values were taken first.`);
 if(norm!=='none')notes.push('Distances are computed on scaled values, so the numbers below are scaled.');
 if(notes.length)h+=`<p class="note">${notes.join('<br>')}</p>`;
 h+='<div style="margin:8px 0 14px">'+vs.map(v=>`<div class="vote"><span style="min-width:90px"><span class="chip" style="background:${col(v.c)}"></span>${esc(v.c)}</span><span class="t" style="width:${Math.max(6,v.n/k*260)}px;background:${col(v.c)}"></span><span>${v.n} vote${v.n>1?'s':''}, total distance ${f(v.td)}</span></div>`).join('')+'</div>';
 h+='<div class="scroll"><table><tr><th>Rank</th><th>Point</th>'+S.feats.map(n=>`<th>${esc(n)}</th>`).join('')+'<th>Class</th><th>Calculation</th><th>Distance</th><th></th></tr>';
 items.forEach((it,i)=>{
  const pick=i<k;
  h+=`<tr class="${pick?'pick':'cut'}"><td>${i+1}</td><td>${esc(it.n)}</td>${it.v.map(v=>`<td>${f(v)}</td>`).join('')}<td><span class="chip" style="background:${col(it.c)}"></span>${esc(it.c)}</td><td><code>${esc(it.fm)}</code></td><td><b>${f(it.d)}</b></td><td>${pick?'<span style="color:var(--accent);font-weight:600">neighbor</span>':(it.d===kd?'<span class="tag">tied, not taken</span>':'')}</td></tr>`;
 });
 h+='</table></div>';
 $('res').innerHTML=h;$('out').hidden=false;$('out').scrollIntoView({behavior:'smooth',block:'nearest'});
}
reset();
