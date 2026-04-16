/**
 * EventPulse — HUD Overlay Module
 * Builds all HUD DOM elements programmatically.
 */

let altitudeVal;
let modeVal;
let modeSub;
let phaseLabel;
let progressFill;
let controlsHint;
let crosshair;
let phaseButtons = [];
let demoBadge;
let phaseLabelTimeout;

export function initHUD() {
  // Container
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.style.display = 'block';

  // Scanlines
  const scanlines = document.createElement('div');
  scanlines.id = 'scanlines';
  hud.appendChild(scanlines);

  // Top bar
  const topbar = document.createElement('div');
  topbar.id = 'topbar';

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = 'Event';
  const logoSpan = document.createElement('span');
  logoSpan.textContent = 'Pulse';
  logo.appendChild(logoSpan);

  const venueTitle = document.createElement('div');
  venueTitle.className = 'venue-title';
  venueTitle.textContent = 'The Concession \u00b7 Senior PGA Tour';

  const liveIndicator = document.createElement('div');
  liveIndicator.className = 'live-indicator';
  const dot = document.createElement('span');
  dot.className = 'status-dot';
  const liveLabel = document.createElement('span');
  liveLabel.className = 'live-label';
  liveLabel.textContent = 'Venue AI Active';
  liveIndicator.appendChild(dot);
  liveIndicator.appendChild(liveLabel);

  topbar.appendChild(logo);
  topbar.appendChild(venueTitle);
  topbar.appendChild(liveIndicator);
  hud.appendChild(topbar);

  // Panel top-left (Altitude)
  const panelTL = document.createElement('div');
  panelTL.className = 'corner-panel';
  panelTL.id = 'panel-tl';
  const altLabel = document.createElement('div');
  altLabel.className = 'panel-label';
  altLabel.textContent = 'Altitude';
  altitudeVal = document.createElement('div');
  altitudeVal.className = 'panel-value';
  altitudeVal.id = 'altitude-val';
  altitudeVal.textContent = '0 FT';
  const altSub = document.createElement('div');
  altSub.className = 'panel-sub';
  altSub.textContent = 'Camera elevation';
  panelTL.appendChild(altLabel);
  panelTL.appendChild(altitudeVal);
  panelTL.appendChild(altSub);
  hud.appendChild(panelTL);

  // Panel top-right (Mode)
  const panelTR = document.createElement('div');
  panelTR.className = 'corner-panel';
  panelTR.id = 'panel-tr';
  const modeLabel = document.createElement('div');
  modeLabel.className = 'panel-label';
  modeLabel.textContent = 'Scene Mode';
  modeVal = document.createElement('div');
  modeVal.className = 'panel-value';
  modeVal.id = 'mode-val';
  modeVal.textContent = 'INIT';
  modeSub = document.createElement('div');
  modeSub.className = 'panel-sub';
  modeSub.id = 'mode-sub';
  modeSub.textContent = 'Initializing...';
  panelTR.appendChild(modeLabel);
  panelTR.appendChild(modeVal);
  panelTR.appendChild(modeSub);
  hud.appendChild(panelTR);

  // Phase label
  phaseLabel = document.createElement('div');
  phaseLabel.id = 'phase-label';
  phaseLabel.textContent = 'INITIALIZING';
  hud.appendChild(phaseLabel);

  // Progress bar
  const progressBar = document.createElement('div');
  progressBar.id = 'progress-bar';
  progressFill = document.createElement('div');
  progressFill.id = 'progress-fill';
  progressBar.appendChild(progressFill);
  hud.appendChild(progressBar);

  // Controls hint
  controlsHint = document.createElement('div');
  controlsHint.id = 'controls-hint';
  controlsHint.textContent = 'W/A/S/D \u00b7 MOUSE TO LOOK \u00b7 CLICK TO LOCK';
  hud.appendChild(controlsHint);

  // Crosshair
  crosshair = document.createElement('div');
  crosshair.id = 'crosshair';
  hud.appendChild(crosshair);

  // Phase nav
  const phaseNav = document.createElement('div');
  phaseNav.id = 'phase-nav';
  const labels = ['Drop In', 'Flyover', 'Walkthrough'];
  labels.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.className = 'phase-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (window.goToPhase) window.goToPhase(i);
    });
    phaseButtons.push(btn);
    phaseNav.appendChild(btn);
  });
  hud.appendChild(phaseNav);

  // Demo badge
  demoBadge = document.createElement('div');
  demoBadge.className = 'demo-badge';
  demoBadge.textContent = 'DEMO MODE \u2014 SAMPLE SCENE';
  document.body.appendChild(demoBadge);
}

export function updateAltitude(feet) {
  if (altitudeVal) altitudeVal.textContent = feet + ' FT';
}

export function updateMode(label, sub) {
  if (modeVal) modeVal.textContent = label;
  if (modeSub) modeSub.textContent = sub;
}

export function showPhaseLabel(text) {
  if (!phaseLabel) return;
  phaseLabel.textContent = text;
  phaseLabel.classList.add('visible');
  if (phaseLabelTimeout) clearTimeout(phaseLabelTimeout);
  phaseLabelTimeout = setTimeout(() => phaseLabel.classList.remove('visible'), 2200);
}

export function setProgress(pct) {
  if (progressFill) progressFill.style.width = pct + '%';
}

export function setPhaseActive(n) {
  phaseButtons.forEach((btn, i) => btn.classList.toggle('active', i === n));
}

export function showCrosshair(visible) {
  if (crosshair) crosshair.classList.toggle('visible', visible);
  if (controlsHint) controlsHint.classList.toggle('visible', visible);
}

export function showDemoBadge(show) {
  if (demoBadge) demoBadge.classList.toggle('visible', show);
}
