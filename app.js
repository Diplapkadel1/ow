const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const zoomEl = document.getElementById('zoom-level');
const codeModal = document.getElementById('code-modal');

let elements = [];
let tool = 'pen';
let isDrawing = false;
let startX, startY;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let currentEl = null;
let selectedEl = null;

// Initialize
function init() {
    window.addEventListener('resize', resize);
    resize();
    setupInputs();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}

function setupInputs() {
    // Tool Switching
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tool = btn.dataset.tool;
        };
    });

    // Zooming
    document.getElementById('zoom-in').onclick = () => { scale += 0.1; updateZoom(); };
    document.getElementById('zoom-out').onclick = () => { scale = Math.max(0.1, scale - 0.1); updateZoom(); };

    // Worker Connect
    document.getElementById('btn-create').onclick = async () => {
        try {
            const res = await fetch('https://ow.diplapkadel.workers.dev/create-room');
            const data = await res.json();
            const url = new URL(window.location);
            url.searchParams.set('room', data.roomId);
            url.searchParams.set('key', data.key);
            window.history.pushState({}, '', url);
            
            document.getElementById('room-display').style.display = 'block';
            document.getElementById('room-id-text').innerText = data.roomId;
            alert("Room Created!");
        } catch (e) { alert("Error connecting to worker."); }
    };

    // Canvas Events
    canvas.onmousedown = start;
    canvas.onmousemove = move;
    window.onmouseup = end;
    
    // Undo/Clear
    document.getElementById('undo').onclick = () => { elements.pop(); draw(); };
    document.getElementById('clear').onclick = () => { if(confirm("Clear?")) { elements = []; draw(); }};
}

function updateZoom() {
    zoomEl.innerText = `${Math.round(scale * 100)}%`;
    draw();
}

// Coordinate Translation (Handles Zoom/Pan)
function getCoords(e) {
    return {
        x: (e.clientX - offsetX) / scale,
        y: (e.clientY - offsetY) / scale
    };
}

function start(e) {
    const coords = getCoords(e);
    startX = coords.x;
    startY = coords.y;
    isDrawing = true;

    if (tool === 'select') {
        // Hit detection for dragging
        selectedEl = [...elements].reverse().find(el => 
            startX >= el.x && startX <= el.x + (el.w || 10) &&
            startY >= el.y && startY <= el.y + (el.h || 10)
        );
        return;
    }

    if (tool === 'text') {
        const val = prompt("Enter text:");
        if(val) elements.push({type:'text', x:startX, y:startY, text:val});
        isDrawing = false;
        draw();
        return;
    }

    if (tool === 'code') {
        codeModal.style.display = 'flex';
        isDrawing = false;
        return;
    }

    currentEl = { type: tool, x: startX, y: startY, w: 0, h: 0, points: [{x:startX, y:startY}] };
}

function move(e) {
    if (!isDrawing) return;
    const coords = getCoords(e);

    if (tool === 'select' && selectedEl) {
        selectedEl.x += (coords.x - startX);
        selectedEl.y += (coords.y - startY);
        startX = coords.x;
        startY = coords.y;
    } else if (currentEl) {
        if (tool === 'pen') {
            currentEl.points.push({x: coords.x, y: coords.y});
        } else {
            currentEl.w = coords.x - startX;
            currentEl.h = coords.y - startY;
        }
    }
    draw();
}

function end() {
    if (isDrawing && currentEl) elements.push(currentEl);
    isDrawing = false;
    currentEl = null;
    selectedEl = null;
    draw();
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Watermark
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.font = "bold 80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DiplapSite", canvas.width/2, canvas.height/2);

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    [...elements, currentEl].forEach(el => {
        if (!el) return;
        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = '#00ff00';
        ctx.lineWidth = 2 / scale;

        ctx.beginPath();
        if (el.type === 'pen') {
            ctx.moveTo(el.points[0].x, el.points[0].y);
            el.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        } else if (el.type === 'rect') {
            ctx.strokeRect(el.x, el.y, el.w, el.h);
        } else if (el.type === 'ellipse') {
            ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w/2), Math.abs(el.h/2), 0, 0, Math.PI*2);
            ctx.stroke();
        } else if (el.type === 'line' || el.type === 'arrow') {
            ctx.moveTo(el.x, el.y);
            ctx.lineTo(el.x + el.w, el.y + el.h);
            ctx.stroke();
            if(el.type === 'arrow') drawArrowhead(el.x, el.y, el.x + el.w, el.y + el.h);
        } else if (el.type === 'text') {
            ctx.font = `${20/scale}px sans-serif`;
            ctx.fillText(el.text, el.x, el.y);
        } else if (el.type === 'code') {
            ctx.font = `${14/scale}px monospace`;
            ctx.fillText("> " + el.text.split('\n')[0], el.x, el.y);
        }
    });
}

function drawArrowhead(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(angle - Math.PI / 6), y2 - 10 * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(angle + Math.PI / 6), y2 - 10 * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

// Modal Buttons
document.getElementById('code-save').onclick = () => {
    const txt = document.getElementById('code-text').value;
    if(txt) elements.push({type:'code', x:startX, y:startY, text:txt});
    codeModal.style.display = 'none';
    draw();
};
document.getElementById('code-cancel').onclick = () => codeModal.style.display = 'none';

init();
