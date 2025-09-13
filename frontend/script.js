const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const browseBtn = document.getElementById('browseBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const jobDescEl = document.getElementById('jobDesc');
const scoreCircle = document.getElementById('scoreCircle');
const resultTitle = document.getElementById('resultTitle');
const pointersEl = document.getElementById('pointers');
const previewEl = document.getElementById('preview');

let selectedFile = null;

browseBtn.addEventListener('click', (e)=>{ e.preventDefault(); fileInput.click(); });
fileInput.addEventListener('change', (e)=>{ handleFiles(e.target.files); });

uploadArea.addEventListener('dragover', (e)=>{ e.preventDefault(); uploadArea.classList.add('drag'); });
uploadArea.addEventListener('dragleave', (e)=>{ uploadArea.classList.remove('drag'); });
uploadArea.addEventListener('drop', (e)=>{ e.preventDefault(); uploadArea.classList.remove('drag'); handleFiles(e.dataTransfer.files); });

function handleFiles(files){
  if(!files || files.length === 0) return;
  const f = files[0];
  const allowed = ['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword'];
  const ext = f.name.split('.').pop().toLowerCase();
  if(!allowed.includes(f.type) && !['pdf','txt','docx','doc'].includes(ext)){
    alert('Only .txt, .docx, .pdf files allowed');
    return;
  }
  selectedFile = f;
  uploadArea.querySelector('.upload-instructions').innerHTML = `<div class="icon">📎</div><div class="muted">Selected: <strong>${f.name}</strong></div>`;
}

clearBtn.addEventListener('click', ()=>{
  selectedFile = null;
  fileInput.value = '';
  uploadArea.querySelector('.upload-instructions').innerHTML = `<div class="icon">📄</div><div>Drag & Drop or <button id="browseBtn" class="link">Browse</button> to upload</div><div class="muted">Allowed: .txt, .docx, .pdf — Max 10MB</div>`;
  document.getElementById('browseBtn').addEventListener('click', (e)=>{ e.preventDefault(); fileInput.click(); });
  document.getElementById('jobDesc').value = '';
  resetResult();
});

function resetResult(){
  scoreCircle.textContent = '—';
  resultTitle.textContent = 'Awaiting upload';
  pointersEl.innerHTML = '<div class="muted">Upload a resume to see pointers here</div>';
  previewEl.textContent = '';
}

analyzeBtn.addEventListener('click', async ()=>{
  if(!selectedFile){
    alert('Please upload a resume file (.txt, .docx, .pdf) first.');
    return;
  }
  const jobDescription = jobDescEl.value || '';
  const form = new FormData();
  form.append('file', selectedFile);
  form.append('jobDescription', jobDescription);

  resultTitle.textContent = 'Analyzing...';
  try{
  const res = await fetch('/upload', { method: 'POST', body: form });
    if(!res.ok){
      const err = await res.json();
      alert(err.error || 'Upload failed');
      resultTitle.textContent = 'Upload failed';
      return;
    }
    const data = await res.json();
    renderResult(data);
  }catch(err){
    console.error(err);
    alert('Server error');
    resultTitle.textContent = 'Server error';
  }
});

function renderResult(data){
  const total = Math.round(data.totalScore);
  scoreCircle.textContent = total + '%';
  resultTitle.textContent = 'Analysis results';
  previewEl.textContent = data.preview || '';

  const categories = data.categoryScores || {};
  const pointers = [];

  const kw = Math.round(categories['Keyword Match'] || 0);
  pointers.push({title: 'Keyword Match', value: kw, tip: kw > 70 ? 'Good — keywords match the JD.' : 'Consider including more job keywords and phrases.'});

  const fmt = Math.round(categories['Formatting'] || 0);
  pointers.push({title: 'Formatting', value: fmt, tip: fmt > 70 ? 'Formatting looks consistent.' : 'Avoid ALL CAPS and add clear section headers.'});

  const exp = Math.round(categories['Experience'] || 0);
  pointers.push({title: 'Experience', value: exp, tip: exp > 70 ? 'Experience level matches expectations.' : 'Mention years (e.g., "3 years") under experience entries.'});

  const edu = Math.round(categories['Education'] || 0);
  pointers.push({title: 'Education', value: edu, tip: edu > 70 ? 'Education details present.' : 'Add degree details like Bachelor/Master/PhD.'});

  const sk = Math.round(categories['Skills'] || 0);
  pointers.push({title: 'Skills', value: sk, tip: sk > 70 ? 'Skills section detected.' : 'Include a dedicated Skills section with technical keywords.'});

  pointersEl.innerHTML = '';
  pointers.forEach(p => {
    const el = document.createElement('div');
    el.className = 'pointer';
    el.innerHTML = `<div class="dot"></div><div><strong>${p.title} — ${p.value}%</strong><div class="muted">${p.tip}</div></div>`;
    pointersEl.appendChild(el);
  });
}

// Slider pause on hover & focus for accessibility
(function setupSlider() {
  const track = document.getElementById('slideTrack');
  const viewport = document.getElementById('sliderViewport');
  const pauseBtn = document.getElementById('pauseBtn');
  if(!track || !viewport) return;

  // Pause on hover/focus
  viewport.addEventListener('mouseenter', () => track.classList.add('paused'));
  viewport.addEventListener('mouseleave', () => track.classList.remove('paused'));
  viewport.addEventListener('focusin', () => track.classList.add('paused'));
  viewport.addEventListener('focusout', () => track.classList.remove('paused'));

  // Pause button (already present in HTML)
  if(pauseBtn){
    pauseBtn.addEventListener('click', () => {
      const isPaused = track.classList.toggle('paused');
      pauseBtn.textContent = isPaused ? 'Play' : 'Pause';
      pauseBtn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
    });
  }
})();
// SLIDER: robust pause/play + hover/focus handling
document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('slideTrack');
  const pauseBtn = document.getElementById('pauseBtn');
  const viewport = document.getElementById('sliderViewport') || (track && track.parentElement);

  if (!track || !pauseBtn || !viewport) {
    // Elements not present — nothing to do
    return;
  }

  // Helper to set paused state
  function setPaused(paused) {
    if (paused) {
      track.classList.add('paused');
      // also set inline style so this works even if CSS specificity prevents class rule
      track.style.animationPlayState = 'paused';
      pauseBtn.textContent = 'Play';
      pauseBtn.setAttribute('aria-pressed', 'true');
    } else {
      track.classList.remove('paused');
      track.style.animationPlayState = 'running';
      pauseBtn.textContent = 'Pause';
      pauseBtn.setAttribute('aria-pressed', 'false');
    }
  }

  // Initialize (ensure animation running)
  setPaused(false);

  // Pause/play on click
  pauseBtn.addEventListener('click', () => {
    const isPaused = track.classList.toggle('paused');
    setPaused(isPaused);
  });

  // Pause on hover and focus for accessibility
  viewport.addEventListener('mouseenter', () => setPaused(true));
  viewport.addEventListener('mouseleave', () => setPaused(false));
  viewport.addEventListener('focusin', () => setPaused(true));
  viewport.addEventListener('focusout', () => setPaused(false));
});

resetResult();
