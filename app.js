const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const container = document.getElementById('board-container');

let tool = 'pen';
let drawing = false;
let startX=0, startY=0;
let elements = [];
let history = [];

function resizeCanvas() {
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  redraw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ====== Tool Buttons ======
document.querySelectorAll('button[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => tool = btn.dataset.tool);
});
document.getElementById('undoBtn').addEventListener('click', undo);

// ====== Room Creation ======
document.getElementById('newRoomBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('https://ow.diplapkadel.workers.dev/create-room');
    const data = await res.json();
    alert(`Room: ${data.roomId}\nKey: ${data.key}`);
    window.history.replaceState({}, '', `?room=${data.roomId}&key=${data.key}`);
  } catch(e) { console.error(e); alert('Failed to create room'); }
});

// ====== Undo/Redo ======
function snapshot() { history.push(JSON.stringify(elements)); if(history.length>50) history.shift(); }
function undo() { if(history.length>1){ elements=JSON.parse(history.pop()); redraw(); }}

// ====== Drawing Events ======
canvas.addEventListener('pointerdown', e=>{
  startX = e.offsetX; startY = e.offsetY;
  if(tool==='pen') { drawing=true; ctx.beginPath(); ctx.moveTo(startX,startY); }
});
canvas.addEventListener('pointermove', e=>{
  if(tool==='pen' && drawing){
    ctx.lineTo(e.offsetX,e.offsetY); ctx.strokeStyle='lime'; ctx.lineWidth=2; ctx.stroke();
  }
});
canvas.addEventListener('pointerup', e=>{
  if(tool==='pen' && drawing){ drawing=false; snapshot(); }
  else if(tool==='rect'){ elements.push({type:'rect',x:startX,y:startY,w:e.offsetX-startX,h:e.offsetY-startY,color:'lime'}); snapshot(); redraw();}
  else if(tool==='ellipse'){ elements.push({type:'ellipse',x:startX,y:startY,w:e.offsetX-startX,h:e.offsetY-startY,color:'lime'}); snapshot(); redraw();}
  else if(tool==='line'){ elements.push({type:'line',x1:startX,y1:startY,x2:e.offsetX,y2:e.offsetY,color:'lime'}); snapshot(); redraw();}
  else if(tool==='text'){ const txt=prompt("Enter text:"); if(txt){ elements.push({type:'text',x:startX,y:startY,text:txt,color:'lime',font:16}); snapshot(); redraw();}}
  else if(tool==='code'){ const code=prompt("Enter code snippet:"); if(code){ elements.push({type:'code',x:startX,y:startY,text:code,font:14}); snapshot(); redraw();}}
});

// ====== Redraw ======
function redraw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Watermark
  ctx.save(); ctx.globalAlpha=0.05; ctx.font='100px Arial'; ctx.fillStyle='white';
  ctx.textAlign='center'; ctx.fillText('DiplapSite',canvas.width/2,canvas.height/2); ctx.restore();
  // Draw elements
  elements.forEach(el=>{
    ctx.strokeStyle=el.color||'lime';
    ctx.fillStyle=el.color||'lime';
    if(el.type==='rect'){ ctx.strokeRect(el.x,el.y,el.w,el.h);}
    else if(el.type==='ellipse'){ ctx.beginPath(); ctx.ellipse(el.x+el.w/2,el.y+el.h/2,Math.abs(el.w/2),Math.abs(el.h/2),0,0,2*Math.PI); ctx.stroke();}
    else if(el.type==='line'){ ctx.beginPath(); ctx.moveTo(el.x1,el.y1); ctx.lineTo(el.x2,el.y2); ctx.stroke();}
    else if(el.type==='text'){ ctx.font=`${el.font||16}px Arial`; ctx.fillText(el.text,el.x,el.y);}
    else if(el.type==='code'){ ctx.font=`${el.font||14}px monospace`; ctx.fillStyle='#0f0'; const lines=el.text.split('\n'); lines.forEach((l,i)=>ctx.fillText(l,el.x,el.y+i*16));}
  });
}
