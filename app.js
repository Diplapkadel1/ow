/**
 * DiplapSite Whiteboard - Core Logic
 */

const canvas = document.getElementById('whiteboardCanvas');
const ctx = canvas.getContext('2d');
const btnCreate = document.getElementById('btn-create');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const codeModal = document.getElementById('code-modal');
const codeInput = document.getElementById('code-input');
const codeConfirm = document.getElementById('code-confirm');
const codeCancel = document.getElementById('code-cancel');

// State
let elements = [];
let undoStack = [];
let currentTool = 'pen';
let isDrawing = false;
let startX, startY;
let currentElement = null;

// Initialize
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Check URL for existing room
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) {
        document.getElementById('room-indicator').style.display = 'block';
        document.getElementById('display-room-id').innerText = params.get('room');
    }

    // Tool selection
    document.querySelectorAll('.tool').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
        });
    });

    setupEventListeners();
    render();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - document.querySelector('.toolbar-header').offsetHeight;
    render();
}

// --- Drawing Logic ---

function setupEventListeners() {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); stopDrawing(); });

    btnCreate.addEventListener('click', createRoom);
    btnUndo.addEventListener('click', undo);
    btnClear.addEventListener('click', () => { if(confirm("Clear everything?")) { elements = []; render(); } });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') undo();
    });
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if (currentTool === 'text') {
        const text = prompt("Enter text:");
        if (text) {
            elements.push({
                type: 'text',
                x: startX,
                y: startY,
                text: text,
                color: '#00ff00'
            });
        }
        isDrawing = false;
    } else if (currentTool === 'code') {
        codeModal.style.display = 'flex';
        isDrawing = false;
    } else {
        currentElement = {
            type: currentTool,
            points: [{x: startX, y: startY}],
            x: startX,
            y: startY,
            width: 0,
            height: 0,
            color: '#00ff00'
        };
    }
    render();
}

function draw(e) {
    if (!isDrawing || !currentElement) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'pen') {
        currentElement.points.push({x, y});
    } else {
        currentElement.width = x - startX;
        currentElement.height = y - startY;
    }
    render();
    drawElement(currentElement); // Preview
}

function stopDrawing() {
    if (isDrawing && currentElement) {
        elements.push(currentElement);
        if (elements.length > 500) elements.shift(); // Performance limit
        undoStack = []; // Reset redo on new action
    }
    isDrawing = false;
    currentElement = null;
    render();
}

// --- Rendering Engine ---

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWatermark();
    elements.forEach(drawElement);
}

function drawWatermark() {
    ctx.save();
    ctx.font = 'bold 80px Inter';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.textAlign = 'center';
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText('DiplapSite', 0, 0);
    ctx.restore();
}

function drawElement(el) {
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (el.type) {
        case 'pen':
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            el.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            break;
        case 'rect':
            ctx.strokeRect(el.x, el.y, el.width, el.height);
            break;
        case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(el.x + el.width/2, el.y + el.height/2, Math.abs(el.width/2), Math.abs(el.height/2), 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'line':
            ctx.beginPath();
            ctx.moveTo(el.x, el.y);
            ctx.lineTo(el.x + el.width, el.y + el.height);
            ctx.stroke();
            break;
        case 'text':
            ctx.font = '20px Inter';
            ctx.fillText(el.text, el.x, el.y);
            break;
        case 'code':
            ctx.font = '14px "JetBrains Mono", monospace';
            const lines = el.text.split('\n');
            ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
            ctx.fillRect(el.x - 5, el.y - 15, 400, lines.length * 20 + 10);
            ctx.fillStyle = el.color;
            lines.forEach((line, i) => {
                ctx.fillText(line, el.x, el.y + (i * 20));
            });
            break;
    }
}

// --- Features ---

function undo() {
    if (elements.length > 0) {
        undoStack.push(elements.pop());
        render();
    }
}

async function createRoom() {
    try {
        btnCreate.innerText = "Creating...";
        const response = await fetch('https://ow.diplapkadel.workers.dev/create-room');
        if (!response.ok) throw new Error("Failed to create room");
        
        const data = await response.json();
        const { roomId, key } = data;

        // Update URL
        const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}&key=${key}`;
        window.history.pushState({ path: newUrl }, '', newUrl);

        // UI Feedback
        document.getElementById('room-indicator').style.display = 'block';
        document.getElementById('display-room-id').innerText = roomId;
        btnCreate.innerHTML = '<i data-lucide="check"></i> Created';
        setTimeout(() => {
            btnCreate.innerHTML = '<i data-lucide="plus-circle"></i> Create Room';
            lucide.createIcons();
        }, 3000);

    } catch (err) {
        console.error(err);
        alert("Worker Error: Could not connect to the room server.");
        btnCreate.innerText = "Create Room";
    }
}

// --- Code Modal Logic ---
codeConfirm.addEventListener('click', () => {
    const code = codeInput.value;
    if (code) {
        elements.push({
            type: 'code',
            x: startX,
            y: startY,
            text: code,
            color: '#00ff00'
        });
        render();
    }
    codeModal.style.display = 'none';
    codeInput.value = '';
});

codeCancel.addEventListener('click', () => {
    codeModal.style.display = 'none';
});

init();
