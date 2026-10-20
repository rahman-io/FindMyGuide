// Camera & face-liveness detection for guide identity verification
// Uses @mediapipe/tasks-vision loaded from CDN on demand (~4 MB)

import { icon } from '../../components/icons.js';

const VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const POSES = [
  { key: 'front', label: 'Lihat ke depan', check: (yaw) => Math.abs(yaw) < 12 },
  { key: 'left',  label: 'Toleh ke kiri',  check: (yaw) => yaw > 25 },
  { key: 'right', label: 'Toleh ke kanan', check: (yaw) => yaw < -25 },
];
const POSE_LABELS = ['Depan', 'Kiri', 'Kanan'];
const HOLD_MS = 1500;

let faceLandmarker = null;
let activeStream = null;
let rafId = null;

/* ── helpers ────────────────────────────────────── */

async function ensureFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;
  const v = await import(VISION_CDN + '/vision_bundle.mjs');
  const resolver = await v.FilesetResolver.forVisionTasks(VISION_CDN + '/wasm');
  faceLandmarker = await v.FaceLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
  return faceLandmarker;
}

async function openCam(videoEl, facing) {
  closeCam();
  activeStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing || 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  videoEl.srcObject = activeStream;
  await videoEl.play();
}

function closeCam() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (activeStream) { activeStream.getTracks().forEach(function (t) { t.stop(); }); activeStream = null; }
}

function snap(videoEl) {
  var c = document.createElement('canvas');
  c.width = videoEl.videoWidth;
  c.height = videoEl.videoHeight;
  c.getContext('2d').drawImage(videoEl, 0, 0);
  return c.toDataURL('image/jpeg', 0.85);
}

function estimateYaw(lm) {
  var nose = lm[1], le = lm[33], re = lm[263];
  var dL = Math.abs(nose.x - le.x);
  var dR = Math.abs(nose.x - re.x);
  return ((dL - dR) / (dL + dR)) * 90;
}

function faceCentered(lm) {
  var n = lm[1];
  return n.x > 0.25 && n.x < 0.75 && n.y > 0.2 && n.y < 0.8;
}

function removeOverlay(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

/* ── KTP camera overlay ─────────────────────────── */

export function openKtpCamera(onCapture) {
  var ov = document.createElement('div');
  ov.className = 'camera-overlay';
  ov.innerHTML =
    '<div class="camera-overlay-header"><button type="button" class="camera-close-btn">' + icon('close', 22) + '</button><strong>Foto KTP</strong><span></span></div>' +
    '<div class="camera-viewport"><video autoplay playsinline muted></video><div class="camera-ktp-guide"><div class="camera-ktp-frame"></div><small>Posisikan KTP dalam bingkai</small></div></div>' +
    '<div class="camera-controls"><button type="button" class="camera-shutter"><span></span></button></div>' +
    '<div class="camera-preview-wrap" hidden><img class="camera-preview-img" /><div class="camera-preview-actions"><button type="button" class="camera-retake-btn">Ulangi</button><button type="button" class="camera-use-btn primary-button">Gunakan foto</button></div></div>';
  document.body.appendChild(ov);

  var video = ov.querySelector('video');
  var captured = null;

  openCam(video, 'environment').catch(function () {
    ov.querySelector('.camera-ktp-guide small').textContent = 'Izin kamera ditolak. Silakan izinkan akses kamera.';
  });

  ov.addEventListener('click', function (e) {
    if (e.target.closest('.camera-close-btn')) { closeCam(); removeOverlay(ov); return; }
    if (e.target.closest('.camera-shutter')) {
      captured = snap(video);
      ov.querySelector('.camera-preview-img').src = captured;
      ov.querySelector('.camera-preview-wrap').hidden = false;
      ov.querySelector('.camera-viewport').hidden = true;
      ov.querySelector('.camera-controls').hidden = true;
      return;
    }
    if (e.target.closest('.camera-retake-btn')) {
      ov.querySelector('.camera-preview-wrap').hidden = true;
      ov.querySelector('.camera-viewport').hidden = false;
      ov.querySelector('.camera-controls').hidden = false;
      captured = null;
      return;
    }
    if (e.target.closest('.camera-use-btn') && captured) {
      closeCam(); removeOverlay(ov); onCapture(captured);
    }
  });
}

/* ── Liveness selfie overlay ────────────────────── */

export function openLivenessFlow(onComplete) {
  var poseIdx = 0, holdStart = 0, captures = [], done = false;

  var ov = document.createElement('div');
  ov.className = 'camera-overlay liveness-overlay';
  ov.innerHTML =
    '<div class="camera-overlay-header"><button type="button" class="camera-close-btn">' + icon('close', 22) + '</button><strong>Verifikasi Selfie</strong><span class="liveness-step-count">Langkah 1 / 3</span></div>' +
    '<div class="camera-viewport"><video autoplay playsinline muted></video>' +
    '<div class="liveness-guide"><svg class="liveness-oval" viewBox="0 0 200 260"><ellipse cx="100" cy="130" rx="80" ry="105" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="3"/><ellipse class="liveness-oval-progress" cx="100" cy="130" rx="80" ry="105" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="580" stroke-dashoffset="580"/></svg></div>' +
    '<div class="liveness-instruction">' + POSES[0].label + '</div>' +
    '<div class="liveness-feedback">Memuat deteksi wajah…</div></div>' +
    '<div class="liveness-captures-strip"></div>';
  document.body.appendChild(ov);

  var video = ov.querySelector('video');
  var instrEl = ov.querySelector('.liveness-instruction');
  var feedEl = ov.querySelector('.liveness-feedback');
  var stepEl = ov.querySelector('.liveness-step-count');
  var ovalProg = ov.querySelector('.liveness-oval-progress');
  var strip = ov.querySelector('.liveness-captures-strip');

  function startLoop() {
    (function detect() {
      if (!activeStream || done) return;
      var res = faceLandmarker.detectForVideo(video, performance.now());
      if (res.faceLandmarks && res.faceLandmarks.length) {
        var lm = res.faceLandmarks[0];
        var yaw = estimateYaw(lm);
        var centered = faceCentered(lm);
        var pose = POSES[poseIdx];
        if (centered && pose.check(yaw)) {
          if (!holdStart) holdStart = Date.now();
          var pct = Math.min(1, (Date.now() - holdStart) / HOLD_MS);
          ovalProg.setAttribute('stroke-dashoffset', String(580 * (1 - pct)));
          feedEl.textContent = 'Tahan… ' + Math.round(pct * 100) + '%';
          if (pct >= 1) {
            captures.push(snap(video));
            strip.innerHTML += '<div class="liveness-capture-thumb"><img src="' + captures[captures.length - 1] + '"/><small>' + POSE_LABELS[poseIdx] + '</small></div>';
            poseIdx++;
            holdStart = 0;
            ovalProg.setAttribute('stroke-dashoffset', '580');
            if (poseIdx >= POSES.length) { done = true; closeCam(); showResult(); return; }
            stepEl.textContent = 'Langkah ' + (poseIdx + 1) + ' / 3';
            instrEl.textContent = POSES[poseIdx].label;
            feedEl.textContent = POSES[poseIdx].label;
          }
        } else {
          holdStart = 0;
          ovalProg.setAttribute('stroke-dashoffset', '580');
          feedEl.textContent = !centered ? 'Posisikan wajah di dalam oval' : POSES[poseIdx].label;
        }
      } else {
        holdStart = 0;
        ovalProg.setAttribute('stroke-dashoffset', '580');
        feedEl.textContent = 'Wajah tidak terdeteksi — lihat ke kamera';
      }
      rafId = requestAnimationFrame(detect);
    })();
  }

  function showResult() {
    ov.querySelector('.camera-viewport').hidden = true;
    strip.classList.add('is-result');
    instrEl.textContent = 'Verifikasi selesai!';
    feedEl.textContent = '';
    var acts = document.createElement('div');
    acts.className = 'liveness-result-actions';
    acts.innerHTML = '<button type="button" class="liveness-retake-btn outline-button">Ulangi semua</button><button type="button" class="liveness-confirm-btn primary-button">Gunakan foto</button>';
    ov.appendChild(acts);
  }

  openCam(video, 'user')
    .then(function () { feedEl.textContent = 'Memuat deteksi wajah…'; return ensureFaceLandmarker(); })
    .then(function () { feedEl.textContent = 'Posisikan wajah di dalam oval'; startLoop(); })
    .catch(function (err) { feedEl.textContent = err.name === 'NotAllowedError' ? 'Izin kamera ditolak' : 'Error: ' + err.message; });

  ov.addEventListener('click', function (e) {
    if (e.target.closest('.camera-close-btn')) { closeCam(); removeOverlay(ov); return; }
    if (e.target.closest('.liveness-retake-btn')) {
      poseIdx = 0; holdStart = 0; captures = []; done = false;
      strip.innerHTML = ''; strip.classList.remove('is-result');
      ov.querySelector('.camera-viewport').hidden = false;
      var old = ov.querySelector('.liveness-result-actions');
      if (old) removeOverlay(old);
      stepEl.textContent = 'Langkah 1 / 3';
      instrEl.textContent = POSES[0].label;
      feedEl.textContent = 'Posisikan wajah di dalam oval';
      ovalProg.setAttribute('stroke-dashoffset', '580');
      openCam(video, 'user').then(function () { startLoop(); });
      return;
    }
    if (e.target.closest('.liveness-confirm-btn')) { removeOverlay(ov); onComplete(captures); }
  });
}

/* ── Profile photo AI validation ───────────────── */

var SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
var HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

var selfieSegmenter = null;
var handLandmarkerInst = null;

async function ensureSegmenter() {
  if (selfieSegmenter) return selfieSegmenter;
  var v = await import(VISION_CDN + '/vision_bundle.mjs');
  var resolver = await v.FilesetResolver.forVisionTasks(VISION_CDN + '/wasm');
  selfieSegmenter = await v.ImageSegmenter.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: SEG_MODEL, delegate: 'GPU' },
    runningMode: 'IMAGE',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
  return selfieSegmenter;
}

async function ensureHandLandmarker() {
  if (handLandmarkerInst) return handLandmarkerInst;
  var v = await import(VISION_CDN + '/vision_bundle.mjs');
  var resolver = await v.FilesetResolver.forVisionTasks(VISION_CDN + '/wasm');
  handLandmarkerInst = await v.HandLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
    runningMode: 'IMAGE',
    numHands: 2,
  });
  return handLandmarkerInst;
}

async function replaceBackground(img) {
  var seg = await ensureSegmenter();
  var result = seg.segment(img);
  var mask = result.categoryMask;
  var maskData = mask.getAsUint8Array();
  var w = mask.width, h = mask.height;
  var alpha = new Float32Array(w * h);
  for (var i = 0; i < maskData.length; i++) {
    alpha[i] = maskData[i] === 0 ? 1.0 : 0.0;
  }
  for (var pass = 0; pass < 2; pass++) {
    var tmp = new Float32Array(alpha.length);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var sum = 0, cnt = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            var nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              sum += alpha[ny * w + nx]; cnt++;
            }
          }
        }
        tmp[y * w + x] = sum / cnt;
      }
    }
    alpha = tmp;
  }
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  var imageData = ctx.getImageData(0, 0, w, h);
  var px = imageData.data;
  for (var i = 0; i < alpha.length; i++) {
    var a = alpha[i];
    px[i * 4]     = Math.round(a * px[i * 4]     + (1 - a) * 255);
    px[i * 4 + 1] = Math.round(a * px[i * 4 + 1] + (1 - a) * 255);
    px[i * 4 + 2] = Math.round(a * px[i * 4 + 2] + (1 - a) * 255);
  }
  ctx.putImageData(imageData, 0, 0);
  mask.close();
  return { ok: true, msg: 'Latar belakang diganti putih', dataUrl: c.toDataURL('image/jpeg', 0.85) };
}

async function checkHands(img) {
  var hl = await ensureHandLandmarker();
  var result = hl.detect(img);
  return result.landmarks && result.landmarks.length > 0
    ? { ok: false, msg: 'Turunkan tangan \u2014 pose natural saja' }
    : { ok: true, msg: 'Tidak ada gestur tangan' };
}

async function checkFaceProfile(img) {
  var fl = await ensureFaceLandmarker();
  await fl.setOptions({ runningMode: 'IMAGE' });
  var result;
  try { result = fl.detect(img); } finally {
    fl.setOptions({ runningMode: 'VIDEO' }).catch(function() {});
  }
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return { ok: false, msg: 'Wajah tidak terdeteksi \u2014 hadap ke kamera' };
  }
  if (result.faceLandmarks.length > 1) {
    return { ok: false, msg: 'Hanya satu wajah yang diperbolehkan' };
  }
  var lm = result.faceLandmarks[0];
  if (!faceCentered(lm)) return { ok: false, msg: 'Posisikan wajah di tengah foto' };
  if (Math.abs(estimateYaw(lm)) > 15) return { ok: false, msg: 'Hadap lurus ke depan' };
  var fh = lm[152].y - lm[10].y;
  if (fh < 0.2) return { ok: false, msg: 'Wajah terlalu kecil \u2014 dekatkan ke kamera' };
  return { ok: true, msg: 'Posisi wajah benar' };
}

function showProfileValidation(dataUrl, onResult) {
  var ov = document.createElement('div');
  ov.className = 'camera-overlay profile-photo-overlay';
  ov.innerHTML =
    '<div class="camera-overlay-header"><button type="button" class="camera-close-btn">' + icon('close', 22) + '</button><strong>Validasi Foto Profil</strong><span></span></div>' +
    '<div class="profile-validation-wrap"><div class="profile-validation-photo"><img /></div>' +
    '<div class="profile-validation-checks">' +
    '<div class="profile-check loading" data-check="bg"><span class="profile-check-icon">\u23f3</span> Mengganti latar belakang\u2026</div>' +
    '<div class="profile-check loading" data-check="hand"><span class="profile-check-icon">\u23f3</span> Memeriksa gestur tangan\u2026</div>' +
    '<div class="profile-check loading" data-check="face"><span class="profile-check-icon">\u23f3</span> Memeriksa posisi wajah\u2026</div></div>' +
    '<div class="profile-validation-actions"><button type="button" class="profile-retake-btn outline-button">Foto ulang</button><button type="button" class="profile-use-btn primary-button" disabled>Gunakan foto</button></div></div>';
  document.body.appendChild(ov);

  var imgEl = ov.querySelector('.profile-validation-photo img');
  imgEl.src = dataUrl;
  var processedDataUrl = dataUrl;
  var checks = { bg: null, hand: null, face: null };

  function updateCheck(key, r) {
    checks[key] = r;
    var el = ov.querySelector('[data-check="' + key + '"]');
    if (el) {
      el.className = 'profile-check ' + (r.ok ? 'pass' : 'fail');
      el.innerHTML = '<span class="profile-check-icon">' + (r.ok ? '\u2713' : '\u2717') + '</span> ' + r.msg;
    }
    if (checks.bg && checks.hand && checks.face) {
      if (checks.bg.ok && checks.hand.ok && checks.face.ok) {
        ov.querySelector('.profile-use-btn').disabled = false;
      }
    }
  }

  var loaded = false;
  imgEl.onload = function () {
    if (loaded) return;
    loaded = true;
    var checkImg = new Image();
    checkImg.onload = function () {
      replaceBackground(checkImg).then(function (r) { updateCheck('bg', r); if (r.dataUrl) { processedDataUrl = r.dataUrl; imgEl.src = r.dataUrl; } }).catch(function () { updateCheck('bg', { ok: false, msg: 'Gagal mengganti latar belakang' }); });
      checkHands(checkImg).then(function (r) { updateCheck('hand', r); }).catch(function () { updateCheck('hand', { ok: false, msg: 'Gagal memeriksa gestur tangan' }); });
      checkFaceProfile(checkImg).then(function (r) { updateCheck('face', r); }).catch(function () { updateCheck('face', { ok: false, msg: 'Gagal memeriksa posisi wajah' }); });
    };
    checkImg.src = dataUrl;
  };

  ov.addEventListener('click', function (e) {
    if (e.target.closest('.camera-close-btn')) { removeOverlay(ov); return; }
    if (e.target.closest('.profile-retake-btn')) { removeOverlay(ov); onResult(null); return; }
    if (e.target.closest('.profile-use-btn') && !e.target.closest('.profile-use-btn').disabled) {
      removeOverlay(ov); onResult({ dataUrl: processedDataUrl, valid: true });
    }
  });
}

export function openProfilePhotoCamera(onResult) {
  var ov = document.createElement('div');
  ov.className = 'camera-overlay profile-camera-overlay';
  ov.innerHTML =
    '<div class="camera-overlay-header"><button type="button" class="camera-close-btn">' + icon('close', 22) + '</button><strong>Foto Profil</strong><span></span></div>' +
    '<div class="camera-viewport"><video autoplay playsinline muted></video>' +
    '<div class="profile-face-guide"><svg viewBox="0 0 200 260"><ellipse cx="100" cy="130" rx="80" ry="105" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="3"/></svg></div></div>' +
    '<div class="camera-controls"><button type="button" class="camera-shutter"><span></span></button></div>';
  document.body.appendChild(ov);

  var video = ov.querySelector('video');
  openCam(video, 'user').catch(function () {
    var guide = ov.querySelector('.profile-face-guide');
    if (guide) guide.innerHTML = '<p style="color:#fff;text-align:center;padding:20px">Izin kamera ditolak</p>';
  });

  ov.addEventListener('click', function (e) {
    if (e.target.closest('.camera-close-btn')) { closeCam(); removeOverlay(ov); return; }
    if (e.target.closest('.camera-shutter')) {
      var captured = snap(video);
      closeCam(); removeOverlay(ov);
      showProfileValidation(captured, function (result) {
        if (!result) { openProfilePhotoCamera(onResult); return; }
        onResult(result);
      });
    }
  });
}

export function validateProfilePhoto(dataUrl, onResult) {
  showProfileValidation(dataUrl, function (result) {
    if (!result) { onResult(null); return; }
    onResult(result);
  });
}
