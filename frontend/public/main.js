// Removed import './style.css'

// ============================================
// Nova & Julian — Interactive Logic
// 11x.ai-Inspired Premium Landing Page
// ============================================

// 1. Header scroll effect — adds dark bg when scrolled
const header = document.getElementById('main-header');
const announcementBar = document.getElementById('announcement-bar');

function handleHeaderScroll() {
  if (!header) return;
  const scrollY = window.scrollY;
  
  // Hide announcement bar on scroll
  if (announcementBar) {
    if (scrollY > 50) {
      announcementBar.style.transform = 'translateY(-100%)';
      announcementBar.style.position = 'fixed';
      announcementBar.style.top = '0';
      announcementBar.style.left = '0';
      announcementBar.style.right = '0';
      announcementBar.style.transition = 'transform 0.3s ease';
    } else {
      announcementBar.style.transform = 'translateY(0)';
      announcementBar.style.position = 'relative';
    }
  }

  if (scrollY > 100) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', handleHeaderScroll, { passive: true });
handleHeaderScroll();


// 2. Intersection Observer — fade-in on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Add fade-in class to major sections
document.querySelectorAll(
  '.workers-heading, .workers-subtext, .worker-card, ' +
  '.platform-heading, .platform-dashboard, .platform-features, ' +
  '.transform-heading, .feature-card, ' +
  '.amplify-heading, .amplify-subtext, ' +
  '.listen-card, ' +
  '.impact-heading, .test-card, ' +
  '.hire-card'
).forEach(el => {
  el.classList.add('fade-in');
  fadeObserver.observe(el);
});


// 3. Ticker Simulation for Nova and Julian Cards
const novaTicker = document.getElementById('nova-ticker-text');
const julianTicker = document.getElementById('julian-ticker-text');

const novaLogs = [
  "Analyzing account data for Acme Corp — Found 3 new contacts.",
  "Enriching decision-maker profiles for TechFlow...",
  "Prioritizing high-intent leads from DeltaInc (Intent score: 96/100).",
  "Extracting technology stack details for Vanguard Retail.",
  "Flagging active buying signals for CloudSynergy."
];

const julianLogs = [
  "Connecting with prospect TechFlow — Live call...",
  "Handling objection: 'Send an email first' — Overcoming...",
  "Julian: 'We integrate directly with Salesforce' — Pitching...",
  "Meeting booked successfully with VP of Sales at TechFlow!",
  "Dialing lead John Doe from Zenith Enterprise..."
];

let novaLogIndex = 0;
let julianLogIndex = 0;

setInterval(() => {
  if (novaTicker) {
    novaLogIndex = (novaLogIndex + 1) % novaLogs.length;
    novaTicker.style.opacity = '0';
    setTimeout(() => {
      novaTicker.textContent = novaLogs[novaLogIndex];
      novaTicker.style.opacity = '1';
    }, 300);
  }
}, 5000);

setInterval(() => {
  if (julianTicker) {
    julianLogIndex = (julianLogIndex + 1) % julianLogs.length;
    julianTicker.style.opacity = '0';
    setTimeout(() => {
      julianTicker.textContent = julianLogs[julianLogIndex];
      julianTicker.style.opacity = '1';
    }, 300);
  }
}, 6200);

if (novaTicker) novaTicker.style.transition = 'opacity 0.3s ease';
if (julianTicker) julianTicker.style.transition = 'opacity 0.3s ease';


// 4. Audio Waveform Player
const waveformPlayer = document.getElementById('waveform-player');
const playBtn = document.getElementById('waveform-play-btn');
const playIcon = document.getElementById('play-svg-icon');
const pauseIcon = document.getElementById('pause-svg-icon');
const callTimer = document.getElementById('call-timer');
const playerStatus = document.getElementById('player-status-text');

let isPlaying = false;
let timerInterval = null;
let secondsElapsed = 0;
let animationFrameId = null;

// Web Audio API (lazy loaded)
let audioCtx = null;
let oscillator1 = null;
let oscillator2 = null;
let gainNode = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gainNode.connect(audioCtx.destination);
}

function playSynthesizedVoice() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  oscillator1 = audioCtx.createOscillator();
  oscillator2 = audioCtx.createOscillator();
  
  oscillator1.type = 'sawtooth';
  oscillator2.type = 'triangle';
  oscillator1.frequency.setValueAtTime(180, audioCtx.currentTime);
  oscillator2.frequency.setValueAtTime(220, audioCtx.currentTime);
  
  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  oscillator1.start();
  oscillator2.start();

  function modulate() {
    if (!isPlaying) return;
    const now = audioCtx.currentTime;
    const freqMod1 = 180 + Math.sin(now * 8) * 40 + (Math.random() * 20 - 10);
    const freqMod2 = 220 + Math.cos(now * 10) * 35;
    oscillator1.frequency.setValueAtTime(freqMod1, now);
    oscillator2.frequency.setValueAtTime(freqMod2, now);
    const randomSilence = Math.random() > 0.85;
    gainNode.gain.setTargetAtTime(randomSilence ? 0.005 : 0.04, now, 0.05);
    setTimeout(modulate, 150 + Math.random() * 200);
  }
  modulate();
}

function stopSynthesizedVoice() {
  if (oscillator1) {
    try { oscillator1.stop(); } catch (e) {}
    oscillator1.disconnect();
  }
  if (oscillator2) {
    try { oscillator2.stop(); } catch (e) {}
    oscillator2.disconnect();
  }
}

const bars = document.querySelectorAll('.waveform-wrapper .bar');

function animateWaveform() {
  if (!isPlaying) return;
  bars.forEach(bar => {
    const randomHeight = 15 + Math.random() * 80;
    bar.style.height = `${randomHeight}%`;
  });
  setTimeout(() => {
    animationFrameId = requestAnimationFrame(animateWaveform);
  }, 100);
}

function toggleAudio() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    if (waveformPlayer) waveformPlayer.classList.add('playing');
    if (playIcon) playIcon.classList.add('hidden');
    if (pauseIcon) pauseIcon.classList.remove('hidden');
    if (playerStatus) playerStatus.textContent = "Playing: Outbound Sales Call Demo...";

    playSynthesizedVoice();

    timerInterval = setInterval(() => {
      secondsElapsed++;
      const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
      const secs = (secondsElapsed % 60).toString().padStart(2, '0');
      if (callTimer) callTimer.textContent = `${mins}:${secs}`;
    }, 1000);

    animateWaveform();
  } else {
    if (waveformPlayer) waveformPlayer.classList.remove('playing');
    if (playIcon) playIcon.classList.remove('hidden');
    if (pauseIcon) pauseIcon.classList.add('hidden');
    if (playerStatus) playerStatus.textContent = "Paused";

    stopSynthesizedVoice();
    clearInterval(timerInterval);
    cancelAnimationFrame(animationFrameId);
  }
}

if (playBtn) {
  playBtn.addEventListener('click', toggleAudio);
}


// 5. Carousel dot navigation
const carouselTrack = document.getElementById('carousel-track');
const dots = document.querySelectorAll('#carousel-dots .dot');

if (carouselTrack && dots.length > 0) {
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      const cards = carouselTrack.querySelectorAll('.feature-card');
      if (cards[index]) {
        cards[index].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });

  // Update dots on scroll
  carouselTrack.addEventListener('scroll', () => {
    const scrollLeft = carouselTrack.scrollLeft;
    const cardWidth = 280 + 24; // card width + gap
    const activeIndex = Math.round(scrollLeft / cardWidth);
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === activeIndex);
    });
  }, { passive: true });
}


// 6. Ask Julian widget click
const askJulianWidget = document.getElementById('ask-julian-widget');
if (askJulianWidget) {
  askJulianWidget.addEventListener('click', () => {
    const julianSection = document.getElementById('listen-julian');
    if (julianSection) {
      julianSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}


// 7. Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#' || targetId === '#hire-cta') return;
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      e.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ============================================
// 8. AGENT DETAIL MODAL DATA & CONTROLLER
// ============================================
const agentModalOverlay = document.getElementById('agent-modal-overlay');
const agentModalContainer = document.getElementById('agent-modal-container');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalFooterCloseBtn = document.getElementById('modal-footer-close-btn');

const modalAgentTitle = document.getElementById('modal-agent-title');
const modalAgentTagline = document.getElementById('modal-agent-tagline');
const modalAgentImg = document.getElementById('modal-agent-img');
const modalBadgeRole = document.getElementById('modal-badge-role');

const modalInputTitle = document.getElementById('modal-input-title');
const modalInputBody = document.getElementById('modal-input-body');
const modalTaskTitle = document.getElementById('modal-task-title');
const modalTaskBody = document.getElementById('modal-task-body');
const modalOutputTitle = document.getElementById('modal-output-title');
const modalOutputBody = document.getElementById('modal-output-body');

const modalMetricsRow = document.getElementById('modal-metrics-row');

const agentData = {
  nova: {
    title: "Hi, I'm Nova.",
    tagline: "Research & Strategy Agent. Every claim traceable to real source data — no hallucinated personalization, ever.",
    roleBadge: "Autopilot activated • Research & Strategy",
    image: "/nova-portrait.png",
    inputTitle: "Raw Account Data",
    inputBody: `
      <ul>
        <li>CRM records & account history</li>
        <li>Past call transcripts & notes</li>
        <li>Historical email threads</li>
        <li>Company website text & tech stack</li>
      </ul>
    `,
    taskTitle: "Research & Self-Check Step",
    taskBody: `
      <ul>
        <li>Identifies key stakeholders & buying signals (budget, urgency, competitors).</li>
        <li>Produces personalized outreach strategy + email draft with exact source citations.</li>
      </ul>
      <div class="workflow-highlight-box">
        <strong>🔒 Grounding Guarantee:</strong> Runs a mandatory self-check step to verify every single claim appears in raw source data, automatically rejecting and rewriting anything unbacked by evidence.
      </div>
    `,
    outputTitle: "Grounded Call Brief",
    outputBody: `
      <ul>
        <li>Structured Account Plan (stakeholders, pain points, whitespace).</li>
        <li>Cited outreach email draft.</li>
        <li>Verified <strong>"Call Brief"</strong> for Julian containing only confirmed facts.</li>
      </ul>
    `,
    metrics: [
      { num: "100%", label: "Fact-Checked & Cited", sub: "Zero unbacked claims" },
      { num: "0", label: "Hallucinated Personalizations", sub: "Grounded in raw source lines" },
      { num: "10x", label: "Faster Account Research", sub: "Instant CRM & transcript analysis" }
    ]
  },
  julian: {
    title: "Hi, I'm Julian.",
    tagline: "Voice Outreach Agent. Autonomous, natural adaptive phone conversations backed strictly by verified facts.",
    roleBadge: "Active • Voice Outreach Agent",
    image: "/julian-portrait.png",
    inputTitle: "Verified Call Brief",
    inputBody: `
      <ul>
        <li>Verified call brief directly from Nova.</li>
        <li>Confirmed prospect pain points & budget context.</li>
        <li>Zero unconfirmed assumptions or hearsay.</li>
      </ul>
    `,
    taskTitle: "Adaptive Voice Call Execution",
    taskBody: `
      <ul>
        <li>Calls prospect and holds a natural adaptive phone conversation.</li>
        <li>Responds to objections mid-call using only verified brief facts.</li>
      </ul>
      <div class="workflow-highlight-box">
        <strong>📞 Fail-Safe Protocol:</strong> If asked something not in the brief, Julian never guesses or improvises — he commits to follow up and flags the question back to Nova.
      </div>
    `,
    outputTitle: "Booked Meeting & Flagged Follow-ups",
    outputBody: `
      <ul>
        <li>Completed adaptive outbound call.</li>
        <li>Direct booked meeting scheduled into calendar.</li>
        <li>Unresolved prospect questions flagged back to Nova for research.</li>
      </ul>
    `,
    metrics: [
      { num: "24/7", label: "Autonomous Voice Outreach", sub: "Human-like natural speaking" },
      { num: "0%", label: "Improvised Assumptions", sub: "Strict compliance to verified brief" },
      { num: "+35%", label: "Pipeline Conversion", sub: "Instant adaptive objection handling" }
    ]
  }
};

function openAgentModal(agentKey) {
  const data = agentData[agentKey];
  if (!data || !agentModalOverlay) return;

  modalAgentTitle.textContent = data.title;
  modalAgentTagline.textContent = data.tagline;
  modalBadgeRole.textContent = data.roleBadge;
  modalAgentImg.src = data.image;

  modalInputTitle.textContent = data.inputTitle;
  modalInputBody.innerHTML = data.inputBody;

  modalTaskTitle.textContent = data.taskTitle;
  modalTaskBody.innerHTML = data.taskBody;

  modalOutputTitle.textContent = data.outputTitle;
  modalOutputBody.innerHTML = data.outputBody;

  modalMetricsRow.innerHTML = data.metrics.map(m => `
    <div class="modal-metric-card">
      <span class="modal-metric-number">${m.num}</span>
      <span class="modal-metric-label">${m.label}</span>
      <span class="modal-metric-sub">${m.sub}</span>
    </div>
  `).join('');

  agentModalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  agentModalOverlay.scrollTop = 0;
}

function closeAgentModal() {
  if (!agentModalOverlay) return;
  agentModalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// Attach event listeners for Nova
const hireNovaBtn = document.getElementById('link-hire-nova');
const novaCard = document.getElementById('nova-card');

if (hireNovaBtn) {
  hireNovaBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAgentModal('nova');
  });
}
if (novaCard) {
  novaCard.style.cursor = 'pointer';
  novaCard.addEventListener('click', (e) => {
    // Only trigger if not clicking child links directly
    if (!e.target.closest('a')) {
      openAgentModal('nova');
    }
  });
}

// Attach event listeners for Julian
const hireJulianBtn = document.getElementById('link-hire-julian');
const julianCard = document.getElementById('julian-card');

if (hireJulianBtn) {
  hireJulianBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAgentModal('julian');
  });
}
if (julianCard) {
  julianCard.style.cursor = 'pointer';
  julianCard.addEventListener('click', (e) => {
    if (!e.target.closest('a')) {
      openAgentModal('julian');
    }
  });
}

// Close events
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAgentModal);
if (modalFooterCloseBtn) modalFooterCloseBtn.addEventListener('click', closeAgentModal);

if (agentModalOverlay) {
  agentModalOverlay.addEventListener('click', (e) => {
    if (e.target === agentModalOverlay) {
      closeAgentModal();
    }
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && agentModalOverlay && !agentModalOverlay.classList.contains('hidden')) {
    closeAgentModal();
  }
});

const modalFooterLaunch = document.getElementById('modal-footer-launch-workspace');
if (modalFooterLaunch) {
  modalFooterLaunch.addEventListener('click', () => {
    window.location.href = '/workspace';
  });
}


