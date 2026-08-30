/**
 * Toolio Live Mockup — Interactive Tool Demos
 * app.js handles sidebar navigation.
 * This file handles interactive demos inside each tool pane.
 */

document.addEventListener('DOMContentLoaded', () => {
  initFlowVideoDemo();
  initGeminiTTSDemo();
  initSequenceCheckerDemo();
  initSequenceShifterDemo();
  initPromptCleanerDemo();
});

// ─── Flow Video ──────────────────────────────────────────
function initFlowVideoDemo() {
  const dialog = document.getElementById('fv-prompts-dialog');

  // Open dialog buttons
  document.getElementById('fv-write-prompts')?.addEventListener('click', () => {
    if (dialog?.showModal) dialog.showModal();
    else if (dialog) { dialog.style.display = 'flex'; }
  });

  // Add prompts
  document.getElementById('fv-add-prompts')?.addEventListener('click', () => {
    if (dialog?.close) dialog.close();
    else if (dialog) dialog.style.display = 'none';

    const rows = document.getElementById('fv-rows');
    const createBtn = document.getElementById('fv-create');

    if (rows) {
      rows.innerHTML = `
        <tr>
          <td><input type="checkbox" checked></td>
          <td>01</td>
          <td><strong>Cinematic drone shot sweeping over glowing neon cyber city with rain reflections, 4K 60fps.</strong></td>
          <td><span style="font-size:0.75rem; color:#22d3ee;">Veo 3.1 Quality</span></td>
          <td><span style="color:#10b981; font-weight:700;">Ready</span></td>
        </tr>
      `;
    }
    if (createBtn) createBtn.disabled = false;
    showToast('Demo preview: prompt added to the sample batch.');
  });

  // Create button
  document.getElementById('fv-create')?.addEventListener('click', function () {
    this.disabled = true;
    showToast('Demo preview: showing the generation state; no remote job was started.');
    setTimeout(() => {
      this.disabled = false;
      const rows = document.getElementById('fv-rows');
      if (rows) {
        const statusCell = rows.querySelector('tr:last-child td:last-child');
        if (statusCell) statusCell.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ Done</span>`;
      }
      showToast('Demo preview complete — no video was generated.');
    }, 2000);
  });
}

// ─── Gemini TTS Voice Preview ─────────────────────────────
function initGeminiTTSDemo() {
  let audioCtx = null;

  document.getElementById('gt-voice-preview')?.addEventListener('click', () => {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      // Play a short 4-note rising sweep
      [220, 275, 330, 440].forEach((freq, i) => {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const t    = audioCtx.currentTime + i * 0.14;

        osc.type   = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.09, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });

      showToast('Demo preview: sample voice playback.');
    } catch (e) {
      showToast('Voice preview requires browser interaction.');
    }
  });
}

// ─── Sequence Checker ─────────────────────────────────────
function initSequenceCheckerDemo() {
  const run = () => {
    const pathInput   = document.getElementById('sc-folder-path');
    const badge       = document.getElementById('sc-status-badge');
    const totalAll    = document.getElementById('sc-total-all');
    const totalValid  = document.getElementById('sc-total-valid');
    const missingArea = document.getElementById('sc-missing');
    const dupeArea    = document.getElementById('sc-duplicates');

    if (pathInput)  pathInput.value = 'D:\\Projects\\Rendered_Scenes_Batch_04';
    if (badge)      { badge.textContent = 'Scan Complete'; badge.className = 'sequence-status active'; }
    if (totalAll)   totalAll.textContent   = '48';
    if (totalValid) totalValid.textContent = '46';

    if (missingArea) missingArea.innerHTML = `
      <div style="padding:8px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:8px; font-size:0.8rem;">
        <strong style="color:#ef4444;">Missing numbers:</strong>
        <span style="font-family:monospace; margin-left:6px;">#014, #027</span>
      </div>`;

    if (dupeArea) dupeArea.innerHTML = `
      <div style="padding:8px 10px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:8px; font-size:0.8rem;">
        <strong style="color:#f59e0b;">Duplicate group:</strong>
        <span style="font-family:monospace; margin-left:6px;">Position #008: scene_008_v1.mp4, scene_008_v2.mp4</span>
      </div>`;

    showToast('Demo preview: sample scan results loaded.');
  };

  document.getElementById('btn-sc-select-folder')?.addEventListener('click', run);
}

// ─── Sequence Shifter ─────────────────────────────────────
function initSequenceShifterDemo() {
  document.getElementById('btn-ss-select-folder')?.addEventListener('click', () => {
    const pathInput = document.getElementById('ss-folder-path');
    if (pathInput) pathInput.value = 'D:\\Projects\\Final_Cuts_Episode_1';
    showToast('Demo preview: sample folder selected.');
  });

  document.getElementById('btn-ss-shift-preview')?.addEventListener('click', () => {
    const badge   = document.getElementById('ss-status-badge');
    const preview = document.getElementById('ss-shift-preview');

    if (badge) { badge.textContent = 'Preview Ready'; badge.className = 'sequence-status active'; }

    if (preview) {
      preview.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; font-family:monospace;">
          <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.45);">
            <th style="padding:5px; text-align:left;">Original</th>
            <th style="padding:5px;"></th>
            <th style="padding:5px; text-align:left;">Renamed (Offset −2)</th>
          </tr></thead>
          <tbody>
            <tr><td style="padding:5px;">scene_080.mp4</td><td style="color:#10b981; padding:5px;">→</td><td style="padding:5px; color:#fff;">scene_078.mp4</td></tr>
            <tr><td style="padding:5px;">scene_081.mp4</td><td style="color:#10b981; padding:5px;">→</td><td style="padding:5px; color:#fff;">scene_079.mp4</td></tr>
            <tr><td style="padding:5px;">scene_082.mp4</td><td style="color:#10b981; padding:5px;">→</td><td style="padding:5px; color:#fff;">scene_080.mp4</td></tr>
          </tbody>
        </table>`;
    }

    const applyBtn = document.getElementById('btn-ss-shift-apply');
    if (applyBtn) applyBtn.disabled = false;
    showToast('Demo preview: sample shift results shown.');
  });

  document.getElementById('btn-ss-shift-apply')?.addEventListener('click', () => {
    showToast('Demo preview only — no files were renamed.');
  });
}

// ─── Prompt Cleaner ──────────────────────────────────────
function initPromptCleanerDemo() {
  document.getElementById('btn-cleaner-clean')?.addEventListener('click', () => {
    const input   = document.getElementById('cleaner-input');
    const output  = document.getElementById('cleaner-output');
    const counter = document.getElementById('cleaner-success-count');

    if (!input) return;

    if (!input.value.trim()) {
      input.value = [
        '001 - Cinematic neon cyber city with volumetric rain reflections',
        '002 - Cinematic futuristic cockpit with holographic telemetry',
        '003 - Cinematic mountain peaks under dramatic golden hour sky'
      ].join('\n');
    }

    const lines   = input.value.split('\n').filter(l => l.trim());
    const cleaned = lines.map(l => l.replace(/^\d+\s*[-:.]\s*/i, '').trim());

    if (output) output.value  = cleaned.join('\n');
    if (counter) counter.textContent = `${lines.length}  Cleaned`;

    showToast(`Demo preview: cleaned ${lines.length} sample prompts.`);
  });
}
