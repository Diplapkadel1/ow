const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const API = "https://ow.diplapkadel.workers.dev";

let elements = [];
let tool = 'pen';
let isDrawing = false;
let currentEl = null;
let userName = "";
let roomId = new URLSearchParams(window.location.search).get('room');
let key = new URLSearchParams(window.location.search).get('key');

function init() {
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        render();
    });
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.getElementById('btn-start').onclick = () => {
        userName = document.getElementById('user-name').value.trim();
        if(!userName) return;
        document.getElementById('name-overlay').style.display = 'none';
        document.getElementById('user-display').innerText = `Logged in as: ${userName}`;
        if(roomId) startSync();
    };

    document.getElementById('btn-create').onclick = async () => {
        const res = await fetch(`${API}/create-room`);
        const data = await res.json();
        roomId = data.roomId;
        key = data.key;
        const url = new URL(window.location);
        url.searchParams.set('room', roomId);
        url.searchParams.set('key', key);
        window.history.pushState({}, '', url);
        location.reload(); // Refresh to start sync
    };

    document.getElementById('btn-share').onclick = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied! Share it with a friend.");
    };

    if(roomId) document.getElementById('btn-share').style.display = 'flex';

    setupCanvas();
    render();
}

// --- SYNC LOGIC ---
async function saveBoard() {
    if(!roomId || !key) return;
    updateStatus(true, "Saving...");
    await fetch(`${API}/save-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, key, elements, user: userName })
    });
    updateStatus(true, "Synced");
}

async function loadBoard() {
    if(!roomId || !key || isDrawing) return;
    try {
        const res = await fetch(`${API}/get-room?roomId=${roomId}&key=${key}`);
        if(res.ok) {
            const data = await res.json();
            // Simple check: only update if remote has more data or is newer
            if(data.elements.length !== elements.length) {
                elements = data.elements;
                render();
            }
            updateStatus(true, "Live");
        }
    } catch(e) {}
}

function startSync() {
    loadBoard(); // Initial load
    setInterval(loadBoard, 3000); // Polling every 3 seconds
}

function updateStatus(online, text) {
    const dot = document.getElementById('sync-dot');
    dot.className = online ? "status-dot status-online" : "status-dot";
    document.getElementById('sync-text').innerText = text;
}

// --- DRAWING LOGIC ---
function setupCanvas() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tool = btn.dataset.tool;
        };
    });

    canvas.onmousedown = (e) => {
        isDrawing = true;
        const x = e.clientX, y = e.clientY;
        if(tool === 'text') {
            const t = prompt("Text:");
            if(t) { elements.push({type:'text', x, y, text:t}); saveBoard(); }
            isDrawing = false;
        } else {
            currentEl = { type: tool, x, y, w: 0, h: 0, points: [{x,y}] };
        }
    };

    canvas.onmousemove = (e) => {
        if(!isDrawing || !currentEl) return;
        currentEl.w = e.clientX - currentEl.x;
        currentEl.h = e.clientY - currentEl.y;
        if(tool === 'pen') currentEl.points.push({x: e.clientX, y: e.clientY});
        render();
    };

    window.onmouseup = () => {
        if(isDrawing && currentEl) {
            elements.push(currentEl);
            saveBoard();
        }
        isDrawing = false;
        currentEl = null;
        render();
    };
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#00ff00";
    ctx.fillStyle = "#00ff00";
    ctx.lineWidth = 2;

    [...elements, currentEl].forEach(el => {
        if(!el) return;
        ctx.beginPath();
        if(el.type === 'pen') {
            ctx.moveTo(el.points[0].x, el.points[0].y);
            el.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        } else if(el.type === 'rect') {
            ctx.strokeRect(el.x, el.y, el.w, el.h);
        } else if(el.type === 'ellipse') {
            ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w/2), Math.abs(el.h/2), 0, 0, Math.PI*2);
            ctx.stroke();
        } else if(el.type === 'text') {
            ctx.font = "20px sans-serif";
            ctx.fillText(el.text, el.x, el.y);
        }
    });
}

init();
