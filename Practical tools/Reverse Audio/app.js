/**
 * EchoBack Audio Reverser SPA
 * Main application logic utilizing Web Audio API for recording,
 * visualising, reversing, and real-time playback control.
 */

// State variables
let audioCtx = null;
let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let audioBuffer = null;
let reversedAudioBuffer = null;

// Playback state
let audioSource = null;
let gainNode = null;
let isPlaying = false;
let playStartTime = 0;
let playDuration = 0;
let playbackRate = 1.0;
let playbackVolume = 1.0;
let currentBufferPlayed = null; // Will point to either audioBuffer or reversedAudioBuffer
let isReversed = false;

// Visualizer & Timer animation handles
let liveAnalyser = null;
let liveDataArray = null;
let liveAnimationId = null;
let playbackAnimationId = null;
let recordingStartTime = 0;
let recordingTimerId = null;
let totalRecordedDuration = 0; // in seconds

// DOM Elements
const statePermission = document.getElementById('state-permission');
const stateRecording = document.getElementById('state-recording');
const statePlayback = document.getElementById('state-playback');
const stateIdle = document.getElementById('state-idle');

const btnRequestMic = document.getElementById('btn-request-mic');
const btnStartRecording = document.getElementById('btn-start-recording');
const btnStopRecording = document.getElementById('btn-stop-recording');

const btnPlayNormal = document.getElementById('btn-play-normal');
const btnPlayReverse = document.getElementById('btn-play-reverse');
const btnStopPlayback = document.getElementById('btn-stop-playback');
const btnRecordAgain = document.getElementById('btn-record-again');

const btnDownloadNormal = document.getElementById('btn-download-normal');
const btnDownloadReverse = document.getElementById('btn-download-reverse');

const sliderSpeed = document.getElementById('slider-speed');
const sliderVolume = document.getElementById('slider-volume');
const speedValue = document.getElementById('speed-value');
const volumeValue = document.getElementById('volume-value');

const recordingTimer = document.getElementById('recording-timer');
const currentPlaybackTime = document.getElementById('current-playback-time');
const totalDurationTime = document.getElementById('total-duration-time');

const liveVisualizer = document.getElementById('live-visualizer');
const waveformCanvas = document.getElementById('waveform-canvas');
const toastContainer = document.getElementById('toast-container');

// Event Listeners
btnRequestMic.addEventListener('click', initMicrophone);
btnStartRecording.addEventListener('click', startRecording);
btnStopRecording.addEventListener('click', stopRecording);
btnPlayNormal.addEventListener('click', () => playAudio(false));
btnPlayReverse.addEventListener('click', () => playAudio(true));
btnStopPlayback.addEventListener('click', stopPlayback);
btnRecordAgain.addEventListener('click', resetToIdle);

sliderSpeed.addEventListener('input', (e) => {
  playbackRate = parseFloat(e.target.value);
  speedValue.textContent = `${playbackRate.toFixed(1)}x`;
  if (audioSource && isPlaying) {
    audioSource.playbackRate.setValueAtTime(playbackRate, audioCtx.currentTime);
  }
});

sliderVolume.addEventListener('input', (e) => {
  playbackVolume = parseFloat(e.target.value);
  volumeValue.textContent = `${Math.round(playbackVolume * 100)}%`;
  if (gainNode && isPlaying) {
    gainNode.gain.setValueAtTime(playbackVolume, audioCtx.currentTime);
  }
});

btnDownloadNormal.addEventListener('click', () => downloadBuffer(audioBuffer, 'recording-normal.wav'));
btnDownloadReverse.addEventListener('click', () => downloadBuffer(reversedAudioBuffer, 'recording-reversed.wav'));

// Set canvas dimensions dynamically
function resizeCanvases() {
  const dpr = window.devicePixelRatio || 1;
  
  // Live Visualizer
  const liveRect = liveVisualizer.getBoundingClientRect();
  liveVisualizer.width = liveRect.width * dpr;
  liveVisualizer.height = liveRect.height * dpr;
  
  // Static Waveform
  const waveRect = waveformCanvas.getBoundingClientRect();
  waveformCanvas.width = waveRect.width * dpr;
  waveformCanvas.height = waveRect.height * dpr;
}

window.addEventListener('resize', () => {
  resizeCanvases();
  if (audioBuffer) {
    drawStaticWaveform();
  }
});

// Toast system
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = document.createElement('div');
  if (type === 'error') {
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;
  } else {
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  }
  
  const text = document.createElement('span');
  text.textContent = message;
  
  toast.appendChild(icon);
  toast.appendChild(text);
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

// 1. Microphone Initialization
async function initMicrophone() {
  try {
    // Request permission and stream
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Initialize AudioContext
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    showToast('Mikrofon erfolgreich freigegeben.');
    switchState(stateIdle);
    resizeCanvases();
  } catch (err) {
    console.error('Error accessing microphone:', err);
    showToast('Mikrofonzugriff verweigert oder nicht verfügbar.', 'error');
  }
}

// Helper to switch states smoothly
function switchState(targetState) {
  const states = [statePermission, stateRecording, statePlayback, stateIdle];
  states.forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  
  targetState.style.display = targetState.id === 'state-playback' ? 'flex' : 'block';
  setTimeout(() => {
    targetState.classList.add('active');
  }, 50);
}

// Format duration to mm:ss.d
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

// 2. Recording functions
function startRecording() {
  if (!stream || !audioCtx) return;
  
  // Stop any active playbacks
  stopPlayback();
  
  // Transition context to running state if suspended
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  recordedChunks = [];
  
  // Set up live Analyser Node for Visualizer
  liveAnalyser = audioCtx.createAnalyser();
  liveAnalyser.fftSize = 256;
  const bufferLength = liveAnalyser.frequencyBinCount;
  liveDataArray = new Uint8Array(bufferLength);
  
  const source = audioCtx.createMediaStreamSource(stream);
  source.connect(liveAnalyser);
  
  // Start MediaRecorder (use supported type)
  let options = { mimeType: 'audio/webm' };
  if (!MediaRecorder.isTypeSupported('audio/webm')) {
    options = { mimeType: 'audio/ogg' };
    if (!MediaRecorder.isTypeSupported('audio/ogg')) {
      options = {}; // fallback to default
    }
  }
  
  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e) {
    console.error('Failed to create MediaRecorder:', e);
    showToast('Aufnahmegerät konnte nicht initialisiert werden.', 'error');
    return;
  }
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = processRecordedAudio;
  
  // Start visual timers
  recordingStartTime = Date.now();
  recordingTimer.textContent = '00:00.0';
  recordingTimerId = setInterval(() => {
    const elapsed = (Date.now() - recordingStartTime) / 1000;
    recordingTimer.textContent = formatTime(elapsed);
  }, 100);
  
  // Start drawing live Visualizer
  mediaRecorder.start();
  switchState(stateRecording);
  resizeCanvases();
  drawLiveVisualizer();
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  
  mediaRecorder.stop();
  clearInterval(recordingTimerId);
  cancelAnimationFrame(liveAnimationId);
}

// Live Visualizer (oscilloscope waveform)
function drawLiveVisualizer() {
  const ctx = liveVisualizer.getContext('2d');
  const width = liveVisualizer.width;
  const height = liveVisualizer.height;
  
  liveAnimationId = requestAnimationFrame(drawLiveVisualizer);
  
  liveAnalyser.getByteTimeDomainData(liveDataArray);
  
  ctx.fillStyle = '#08090e';
  ctx.fillRect(0, 0, width, height);
  
  // Draw subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  
  // Create beautiful gradient for glowing wave
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#9d4edd');
  gradient.addColorStop(0.5, '#00f5d4');
  gradient.addColorStop(1, '#ff007f');
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 12;
  ctx.shadowColor = 'rgba(0, 245, 212, 0.5)';
  ctx.beginPath();
  
  const sliceWidth = width / liveDataArray.length;
  let x = 0;
  
  for (let i = 0; i < liveDataArray.length; i++) {
    const v = liveDataArray[i] / 128.0;
    const y = (v * height) / 2;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // smooth curve using quadratic curves or simple lines
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  }
  
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  
  // Reset shadow effects
  ctx.shadowBlur = 0;
}

// 3. Audio Decoding & Reversing
async function processRecordedAudio() {
  showToast('Audio wird verarbeitet...');
  const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
  
  try {
    const arrayBuffer = await blob.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    totalRecordedDuration = audioBuffer.duration;
    totalDurationTime.textContent = formatTime(totalRecordedDuration);
    currentPlaybackTime.textContent = '00:00.0';
    
    // Create reversed audio buffer
    reversedAudioBuffer = reverseAudioBuffer(audioCtx, audioBuffer);
    
    showToast('Aufnahme erfolgreich verarbeitet.');
    switchState(statePlayback);
    resizeCanvases();
    drawStaticWaveform();
  } catch (err) {
    console.error('Error decoding audio:', err);
    showToast('Fehler bei der Audioverarbeitung.', 'error');
    resetToIdle();
  }
}

// Core Reversal Algorithm
function reverseAudioBuffer(context, buffer) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  
  // Create a new AudioBuffer to hold the reversed data
  const reversed = context.createBuffer(channels, length, sampleRate);
  
  for (let c = 0; c < channels; c++) {
    const srcData = buffer.getChannelData(c);
    const destData = reversed.getChannelData(c);
    
    // Sample-by-sample mirror reversal
    for (let i = 0; i < length; i++) {
      destData[i] = srcData[length - 1 - i];
    }
  }
  
  return reversed;
}

// 4. Drawing Static Waveform
function drawStaticWaveform() {
  if (!audioBuffer) return;
  
  const ctx = waveformCanvas.getContext('2d');
  const width = waveformCanvas.width;
  const height = waveformCanvas.height;
  const dpr = window.devicePixelRatio || 1;
  
  ctx.clearRect(0, 0, width, height);
  
  // Draw deep dark background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, width, height);
  
  // Extract sample peaks
  const data = audioBuffer.getChannelData(0); // Use channel 0 (mono/left)
  const step = Math.ceil(data.length / width);
  const amp = height / 2;
  
  // Draw base center line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, amp);
  ctx.lineTo(width, amp);
  ctx.stroke();
  
  // Draw waveform bars
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#9d4edd');
  gradient.addColorStop(0.5, '#00bbf9');
  gradient.addColorStop(1, '#ff007f');
  
  ctx.fillStyle = gradient;
  
  // Number of bars
  const barWidth = 2 * dpr;
  const barGap = 1 * dpr;
  const totalBarWidth = barWidth + barGap;
  const numBars = Math.floor(width / totalBarWidth);
  
  const samplesPerBar = Math.floor(data.length / numBars);
  
  for (let i = 0; i < numBars; i++) {
    const startSample = i * samplesPerBar;
    let min = 1.0;
    let max = -1.0;
    
    for (let j = 0; j < samplesPerBar; j++) {
      const val = data[startSample + j];
      if (val < min) min = val;
      if (val > max) max = val;
    }
    
    // Waveform line heights
    const top = (1 + max) * amp;
    const bottom = (1 + min) * amp;
    const barHeight = Math.max(2, top - bottom);
    
    ctx.fillRect(i * totalBarWidth, bottom, barWidth, barHeight);
  }
}

// 5. Playback engine
function playAudio(reverse = false) {
  if (!audioCtx || !audioBuffer) return;
  
  // If playing, stop the previous source
  if (isPlaying) {
    stopPlayback();
  }
  
  // Create source and gain node
  audioSource = audioCtx.createBufferSource();
  audioSource.buffer = reverse ? reversedAudioBuffer : audioBuffer;
  
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(playbackVolume, audioCtx.currentTime);
  
  // Connect graph
  audioSource.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Set speed
  audioSource.playbackRate.setValueAtTime(playbackRate, audioCtx.currentTime);
  
  // Keep track of which buffer is playing and orientation
  currentBufferPlayed = reverse ? reversedAudioBuffer : audioBuffer;
  isReversed = reverse;
  isPlaying = true;
  playStartTime = audioCtx.currentTime;
  playDuration = currentBufferPlayed.duration;
  
  // Handle ended
  audioSource.onended = () => {
    // Check if it ended naturally (and wasn't stopped by user)
    if (isPlaying) {
      stopPlayback();
    }
  };
  
  audioSource.start(0);
  
  // Update buttons state
  btnPlayNormal.classList.add('hidden');
  btnPlayReverse.classList.add('hidden');
  btnStopPlayback.classList.remove('hidden');
  
  // Animate playback head
  animatePlaybackHead();
}

function stopPlayback() {
  if (!isPlaying) return;
  
  isPlaying = false;
  if (audioSource) {
    try {
      audioSource.stop();
    } catch (e) {
      // Node might not have started yet
    }
    audioSource.disconnect();
    audioSource = null;
  }
  
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  
  cancelAnimationFrame(playbackAnimationId);
  
  // Reset buttons
  btnPlayNormal.classList.remove('hidden');
  btnPlayReverse.classList.remove('hidden');
  btnStopPlayback.classList.add('hidden');
  
  // Reset visual playhead timer
  currentPlaybackTime.textContent = formatTime(0);
  
  // Redraw static waveform to clear playhead line
  drawStaticWaveform();
}

// Playhead animation
function animatePlaybackHead() {
  if (!isPlaying || !currentBufferPlayed) return;
  
  const ctx = waveformCanvas.getContext('2d');
  const width = waveformCanvas.width;
  const height = waveformCanvas.height;
  
  // Calculate elapsed time (adjusted by playback rate)
  const elapsedRealTime = audioCtx.currentTime - playStartTime;
  const elapsedBufferTime = elapsedRealTime * playbackRate;
  
  if (elapsedBufferTime >= playDuration) {
    stopPlayback();
    return;
  }
  
  // Update time readout
  currentPlaybackTime.textContent = formatTime(elapsedBufferTime);
  
  // Redraw base static waveform
  drawStaticWaveform();
  
  // Calculate position:
  // If reversed, the audio starts from the END of the audioBuffer and goes backwards.
  // Hence the playhead should move from RIGHT to LEFT.
  let ratio = elapsedBufferTime / playDuration;
  let xPosition;
  
  if (isReversed) {
    xPosition = width * (1 - ratio);
  } else {
    xPosition = width * ratio;
  }
  
  // Draw playhead vertical line
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xPosition, 0);
  ctx.lineTo(xPosition, height);
  ctx.stroke();
  
  // Draw playhead pulse dot
  ctx.fillStyle = '#00f5d4';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00f5d4';
  ctx.beginPath();
  ctx.arc(xPosition, height / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // reset
  
  playbackAnimationId = requestAnimationFrame(animatePlaybackHead);
}

// 6. WAV Export Utility (16-bit PCM format)
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Helper functions for writing bytes
  const setUint16 = (data) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF Header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // File size - 8
  setUint32(0x45564157);                         // "WAVE"
  
  // FMT sub-chunk
  setUint32(0x20746d66);                         // "fmt "
  setUint32(16);                                 // Sub-chunk size (16 for PCM)
  setUint16(1);                                  // Audio format (1 = PCM)
  setUint16(numOfChan);                          // Number of channels
  setUint32(buffer.sampleRate);                  // Sample rate
  setUint32(buffer.sampleRate * numOfChan * 2);  // Byte rate (sampleRate * numOfChan * bytesPerSample)
  setUint16(numOfChan * 2);                      // Block align (numOfChan * bytesPerSample)
  setUint16(16);                                 // Bits per sample (16)
  
  // Data sub-chunk
  setUint32(0x61746164);                         // "data"
  setUint32(length - pos - 4);                   // Data size

  // Write channel data (interleaved)
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp sample
      // Scale to 16-bit signed integer
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true); // write little-endian
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}

function downloadBuffer(buffer, filename) {
  if (!buffer) {
    showToast('Keine Audiodaten für den Download vorhanden.', 'error');
    return;
  }
  
  showToast('Bereite Download vor...');
  
  try {
    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    showToast('Download gestartet.');
  } catch (err) {
    console.error('WAV export error:', err);
    showToast('Fehler beim Exportieren der WAV-Datei.', 'error');
  }
}

// 7. Reset and start over
function resetToIdle() {
  stopPlayback();
  
  recordedChunks = [];
  audioBuffer = null;
  reversedAudioBuffer = null;
  totalRecordedDuration = 0;
  
  switchState(stateIdle);
}
