// ====== Canvas Setup ======
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Drawing state
let drawing = false;
let color = 'lime';
let lineWidth = 2;

// Mouse / touch drawing
canvas.addEventListener('pointerdown', e => {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
});

canvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
});

canvas.addEventListener('pointerup', () => drawing = false);
canvas.addEventListener('pointerleave', () => drawing = false);

// ====== Room Creation ======
const newRoomBtn = document.getElementById('newRoomBtn');
const workerURL = 'https://ow.diplapkadel.workers.dev/create-room';

newRoomBtn.addEventListener('click', async () => {
  try {
    const response = await fetch(workerURL);
    const data = await response.json();

    alert(`Room Created!\nRoom ID: ${data.roomId}\nKey: ${data.key}`);
    // Update URL to include room info
    const params = new URLSearchParams();
    params.set('room', data.roomId);
    params.set('key', data.key);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  } catch (err) {
    console.error('Failed to create room:', err);
    alert('Error creating room. Check your Worker.');
  }
});

// ====== Optional: Load room from URL ======
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const roomKey = urlParams.get('key');

if (roomId && roomKey) {
  console.log(`Joined room: ${roomId} with key: ${roomKey}`);
  // Future: connect WebSocket here for real-time drawing
}

// ====== Optional: Drawing utilities ======
// Example: change color with keys
window.addEventListener('keydown', e => {
  if (e.key === 'r') color = 'red';
  if (e.key === 'g') color = 'lime';
  if (e.key === 'b') color = 'blue';
});
