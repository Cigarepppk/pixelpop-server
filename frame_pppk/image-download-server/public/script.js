// PixelPop Studio - Main JavaScript File (No async/await) — FULLY CORRECTED
class PixelPopStudio {
  constructor() {
    this.currentPage = 'home';
    this.currentLayout = 'single';
    this.currentBorder = 'none';
    this.currentFilter = 'none';
    this.capturedPhotos = [];
    this.stream = null;
    this.isCapturing = false;
    this.timerValue = 3;
    this.MAX_GALLERY = 50;
    this._galleryCount = 0;        // tracked after each refresh
    this._selectMode = false;      // gallery selection mode

    // canvas render state: used to prevent saving before layout is fully drawn
    this.isLayoutReady = false;

    // API base for uploads + auth (point to your backend)
    this.API_BASE = 'https://pixelpop-backend-fm6t.onrender.com';

    this.init();
  }

  init() {
    this.setupNavigation();        // ungated navigation
    this.setupLayoutSelection();
    this.setupBorderSelection();
    this.setupFilterSelection();
    this.setupCameraControls();
    this.setupTimerControls();
    this.setupPhotoControls();
    this.setupMobileMenu();
    this.setupGalleryUi();
    this.setupLiveBackgrounds();           // create pools, timers, visibility handling
    this.startBackgroundRotatorFor(this.currentPage); // apply an image right away

}



  /* ────────────────────────────────────────────────────────────
     Smart fetch with 404 fallback (helps if /api prefix differs)
     ──────────────────────────────────────────────────────────── */
  // Calls `${BASE}${path}`. If it 404s and the path starts with "/api/",
  // it retries once without "/api/". You can also pass alternates.
  fetchWith404Fallback(BASE, path, options, extraAlternates) {
    const tryFetch = (url) =>
      fetch(url, options).then(async (res) => {
        let parsed = {};
        try { parsed = await res.clone().json(); } catch {}
        res._json = parsed;
        return res;
      });

    const primary = `${BASE}${path}`;
    const alternates = [];

    if (path.startsWith('/api/')) {
      alternates.push(`${BASE}${path.replace('/api/', '/')}`);
    }
    if (Array.isArray(extraAlternates)) {
      extraAlternates.forEach(a => alternates.push(`${BASE}${a}`));
    }

    return tryFetch(primary).then((res) => {
      if (res.status !== 404) return res;
      if (!alternates.length) return res;
      return tryFetch(alternates[0]).then((res2) =>
        res2.status === 404 && alternates[1] ? tryFetch(alternates[1]) : res2
      );
    });
  }

  // ============== Auth helpers ==============
  verifyToken() {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve(false);

    return this.fetchWith404Fallback(this.API_BASE, '/api/auth/verify', {
      headers: { Authorization: 'Bearer ' + token }
    }, ['/auth/verify'])
      .then(res => {
        if (!res.ok) console.warn('[verifyToken]', res.status, res._json);
        return res.ok === true;
      })
      .catch(err => {
        console.error('verifyToken failed', err);
        return false;
      });
  }

  updatePrivilegedButtonsState() {
    const hasToken = !!localStorage.getItem('token');

    // Photobooth result buttons
    const dl = document.getElementById('download-btn');
    const pr = document.getElementById('print-btn');
    const sv = document.getElementById('save-gallery-btn'); // Save to My Gallery
    [dl, pr, sv].forEach(btn => {
      if (!btn) return;
      if (!hasToken) btn.setAttribute('title', 'Log in to use this');
      else btn.removeAttribute('title');
    });

    // Frame page buttons
    const fdl = document.getElementById('downloadBtn');
    const fpr = document.getElementById('printFrameBtn');
    const fsv = document.getElementById('saveFrameToGalleryBtn'); // Save to My Gallery (frame)
    [fdl, fpr, fsv].forEach(btn => {
      if (!btn) return;
      if (!hasToken) btn.setAttribute('title', 'Log in to use this');
      else btn.removeAttribute('title');
    });

    // Logout button in nav
    const menu = document.querySelector('.nav-menu');
    if (menu) {
      let li = document.getElementById('logout-li');
      if (hasToken) {
        if (!li) {
          li = document.createElement('li');
          li.id = 'logout-li';
          li.innerHTML = `<button id="logout-btn" class="logout-btn">Logout</button>`;
          menu.appendChild(li);
          document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
          });
        }
      } else {
        if (li) li.remove();
      }
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.updatePrivilegedButtonsState();
    if (typeof window.PixelPopAppNavigate === 'function') {
      window.PixelPopAppNavigate('home');  // stop camera by leaving layout page
    } else {
      window.location.replace('/');
    }
  }

setupLiveBackgrounds() {
  
   this.bgPools = {
    home:   ["p1.JPG","p2.JPG","p3.JPG","p4.JPG"],
    about:  ["p2.JPG","p3.JPG","p4.JPG","p1.JPG"],
    layout: ["p3.JPG","p4.JPG","p1.JPG","p2.JPG"],
    gallery:["p4.JPG","p1.JPG","p2.JPG","p3.JPG"],
    login:  ["p5.JPG","p2.JPG","p3.JPG","p4.JPG"]   // ⬅️ add this
  };
this.currentBorder='none';
  this.bgIntervalMs = 7000;  // change speed here
  this._bgIntervalId = null;
  this._bgFlip = false;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) this.stopBackgroundRotator();
    else this.startBackgroundRotatorFor(this.currentPage);
  });
}

startBackgroundRotatorFor(pageKey) {
  const pageEl = document.getElementById(pageKey + "-page");
  if (!pageEl) return;
  this._ensureBgLayers(pageEl);

  // Apply immediately so you never see plain background
  this._applyRandomBackground(pageKey, pageEl);

  // Start interval
  this._bgIntervalId = setInterval(() => {
    this._applyRandomBackground(pageKey, pageEl);
  }, this.bgIntervalMs);
}

stopBackgroundRotator() {
  if (this._bgIntervalId) {
    clearInterval(this._bgIntervalId);
    this._bgIntervalId = null;
  }
}

_ensureBgLayers(pageEl) {
  if (pageEl.querySelector(".bg-layer")) return;
  const a = document.createElement("div");
  const b = document.createElement("div");
  a.className = "bg-layer show"; // visible first
  b.className = "bg-layer";      // hidden
  pageEl.prepend(b);
  pageEl.prepend(a);
}

_applyRandomBackground(pageKey, pageEl) {
  const pool = this.bgPools[pageKey] || this.bgPools.home || [];
  if (!pool.length) return;
  const nextSrc = pool[Math.floor(Math.random() * pool.length)];

  const layers = pageEl.querySelectorAll(".bg-layer");
  if (layers.length < 2) return;

  this._bgFlip = !this._bgFlip;
  const showLayer = layers[this._bgFlip ? 1 : 0];
  const hideLayer = layers[this._bgFlip ? 0 : 1];

  showLayer.style.backgroundImage = `url(${nextSrc})`;
  showLayer.classList.add("show");
  hideLayer.classList.remove("show");
}




  // ============== Navigation (UNGATED) ==============
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const ctaButton = document.querySelector('.cta-button');

    for (let i = 0; i < navLinks.length; i++) {
      const link = navLinks[i];
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        this.navigateToPage(page);
      });
    }

    if (ctaButton) {
      ctaButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('layout');
      });
    }
  }

navigateToPage(page) {
  // Stop live background on previous page
  this.stopBackgroundRotator();

  // Hide all pages
  const pages = document.querySelectorAll('.page');
  for (let i = 0; i < pages.length; i++) pages[i].classList.remove('active');

  // Show target page
  const targetPage = document.getElementById(page + '-page');
  if (targetPage) {
    targetPage.classList.add('active', 'fade-in');

    // Ensure cross-fade layers exist for this page
    this._ensureBgLayers(targetPage);
  }

  this.currentPage = page;

  // Start live background on the new active page (applies one image immediately)
  this.startBackgroundRotatorFor(page);

  // load private gallery when user opens it
  if (page === 'gallery') this.refreshGallery();

  // Update nav state
  const links = document.querySelectorAll('.nav-link');
  for (let j = 0; j < links.length; j++) {
    const l = links[j];
    l.classList.toggle('active', l.dataset.page === page);
  }

  // Camera lifecycle
  if (page === 'layout') this.initializeCamera();
  else if (this.stream) this.stopCamera();

  // Close mobile menu if open
  const navMenu = document.querySelector('.nav-menu');
  const hamburger = document.querySelector('.hamburger');
  if (navMenu && navMenu.classList.contains('active')) {
    navMenu.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');
  }
}


  setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', function () {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
      });
    }
  }

  // ============== UI selections ==============
  setupLayoutSelection() {
    const layoutOptions = document.querySelectorAll('.layout-option');
    layoutOptions.forEach(option => {
      option.addEventListener('click', () => {
        layoutOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        this.currentLayout = option.dataset.layout;
        this.resetSession();
      });
    });
  }

  setupBorderSelection() {
    const borderOptions = document.querySelectorAll('.border-option');
    borderOptions.forEach(option => {
      option.addEventListener('click', () => {
        borderOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        this.currentBorder = option.dataset.border;
      });
    });
  }

  setupFilterSelection() {
    const filterOptions = document.querySelectorAll('.filter-option');
    filterOptions.forEach(option => {
      option.addEventListener('click', () => {
        filterOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        this.currentFilter = option.dataset.filter;
        this.applyLiveFilter();
      });
    });
  }

  // ============== Camera & capture ==============
  setupCameraControls() {
    const captureBtn = document.getElementById('capture-btn');
    theStart: { /* avoid accidental label collisions */ }
    const startSessionBtn = document.getElementById('start-session');
    const resetSessionBtn = document.getElementById('reset-session');

    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        if (!this.isCapturing) this.capturePhoto();
      });
    }

    if (startSessionBtn) {
      startSessionBtn.addEventListener('click', () => this.startPhotoSession());
    }

    if (resetSessionBtn) {
      resetSessionBtn.addEventListener('click', () => this.resetSession());
    }
  }

  setupTimerControls() {
    const timerSelect = document.getElementById('timer-select');
    if (timerSelect) {
      timerSelect.addEventListener('change', (e) => {
        this.timerValue = parseInt(e.target.value, 10);
      });
    }
  }

  // ============== Photobooth result controls (LOGIN-GATED) ==============
  setupPhotoControls() {
    const downloadBtn   = document.getElementById('download-btn');
    const printBtn      = document.getElementById('print-btn');
    const newSessionBtn = document.getElementById('new-session');
    const saveBtn       = document.getElementById('save-gallery-btn'); // Save to My Gallery

    const requireLogin = () =>
      this.verifyToken().then(ok => {
        if (!ok) {
          console.warn('[PixelPop] verifyToken=false → showing alert');
          alert('Please log in to continue.');
          return false;
        }
        return true;
      });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        requireLogin().then(ok => { if (ok) this.downloadPhotos(); });
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        requireLogin().then(ok => { if (ok) this.printPhotos(); });
      });
    }

    if (newSessionBtn) {
      newSessionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startNewSession();
      });
    }

    // Manual save to gallery (non-mirrored, HD) + jump to Gallery
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        requireLogin().then(ok => { if (ok) this.saveFinalToGallery(); });
      });
    }
  }

  initializeCamera() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const cameraFeed = document.getElementById('camera-feed');

    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    })
    .then(stream => {
      this.stream = stream;
      if (cameraFeed) {
        cameraFeed.srcObject = this.stream;
        cameraFeed.play();
      }
      if (loadingOverlay) loadingOverlay.style.display = 'none';
    })
    .catch(error => {
      console.error('Camera access error:', error);
      showError('Camera access denied. Please allow camera permission and try again.');
      if (loadingOverlay) loadingOverlay.style.display = 'none';
    });
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  applyLiveFilter() {
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;
    cameraFeed.className = ''; // remove existing filters
    if (this.currentFilter !== 'none') {
      cameraFeed.classList.add(`filter-${this.currentFilter}`);
    }
  }
 updateLiveBorder() {
    if (!liveBorderEl) return;
    liveBorderEl.classList.remove('border-none','border-classic','border-modern','border-vintage');
    const map = { none:'border-none', classic:'border-classic', modern:'border-modern', vintage:'border-vintage' };
    liveBorderEl.classList.add(map[currentBorder] || 'border-none');
  }
  capturePhoto() {
    if (this.isCapturing) return;
    this.isCapturing = true;

    const afterTimer = () => {
      const photo = this.takeSnapshot();
      if (photo) {
        this.capturedPhotos.push(photo);
        this.checkSessionComplete();
      }
      this.isCapturing = false;
    };

    if (this.timerValue > 0) {
      this.startTimer().then(afterTimer);
    } else {
      afterTimer();
    }
  }

  startTimer() {
    return new Promise((resolve) => {
      const timerDisplay = document.getElementById('timer-display');
      let countdown = this.timerValue;

      if (timerDisplay) {
        timerDisplay.style.display = 'flex';
        timerDisplay.textContent = countdown;
        timerDisplay.classList.add('pulse');
      }

      const interval = setInterval(() => {
        countdown--;
        if (timerDisplay) {
          timerDisplay.textContent = countdown;
        }

        if (countdown <= 0) {
          clearInterval(interval);
          if (timerDisplay) {
            timerDisplay.style.display = 'none';
            timerDisplay.classList.remove('pulse');
          }
          resolve();
        }
      }, 1000);
    });
  }

  takeSnapshot() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('photo-canvas');
    if (!video || !canvas) return null;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // filter + border
    this.applyCanvasFilter(ctx, canvas);
    this.applyBorder(ctx, canvas);

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  applyCanvasFilter(ctx, canvas) {
    if (this.currentFilter === 'none') return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    switch (this.currentFilter) {
      case 'sepia':
      case 'vintage':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i]     = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
        break;
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        break;
      case 'bright':
        for (let i = 0; i < data.length; i += 4) {
          data[i]     = Math.min(255, data[i] * 1.3);
          data[i + 1] = Math.min(255, data[i + 1] * 1.3);
          data[i + 2] = Math.min(255, data[i + 2] * 1.3);
        }
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  applyBorder(ctx, canvas) {
    if (this.currentBorder === 'none') return;

    const borderWidth = 20;
    ctx.strokeStyle = this.getBorderColor();
    ctx.lineWidth = borderWidth;

    switch (this.currentBorder) {
      case 'classic':
        ctx.strokeRect(borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth);
        break;
      case 'modern':
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 15;
        ctx.strokeRect(7.5, 7.5, canvas.width - 15, canvas.height - 15);
        break;
      case 'vintage':
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 25;
        ctx.strokeRect(12.5, 12.5, canvas.width - 25, canvas.height - 25);
        ctx.lineWidth = 5;
        ctx.strokeRect(22.5, 22.5, canvas.width - 45, canvas.height - 45);
        break;
    }
  }

  getBorderColor() {
    switch (this.currentBorder) {
      case 'classic': return '#343a40';
      case 'modern':  return '#ff69b4';
      case 'vintage': return '#8b4513';
      default:        return '#000000';
    }
  }

  checkSessionComplete() {
    const requiredPhotos = this.getRequiredPhotoCount();
    if (this.capturedPhotos.length >= requiredPhotos) {
      this.completeSession();
    }
  }

  getRequiredPhotoCount() {
    switch (this.currentLayout) {
      case 'single':     return 1;
      case 'twostrip':   return 2;
      case 'threestrip': return 3;
      case 'fourstrip':  return 4;
      default:           return 1;
    }
  }

  completeSession() {
    this.createFinalLayout();
    this.showResults();
    this.maybeAutosaveToGallery();
  }

  // mark layout ready when final canvas fully drawn
  markLayoutReady() {
    this.isLayoutReady = true;
    const saveBtn = document.getElementById('save-gallery-btn');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save to My Gallery';
    }
    document.dispatchEvent(new CustomEvent('pixelpop:layout-ready'));
  }

  createFinalLayout() {
    const finalCanvas = document.getElementById('final-canvas');
    if (!finalCanvas) return;
    const ctx = finalCanvas.getContext('2d');

    // reset ready flag before re-render
    this.isLayoutReady = false;

    switch (this.currentLayout) {
      case 'single':     this.createSingleLayout(ctx, finalCanvas); break;
      case 'twostrip':   this.createTwoStripLayout(ctx, finalCanvas); break;
      case 'threestrip': this.createThreeStripLayout(ctx, finalCanvas); break;
      case 'fourstrip':  this.createFourStripLayout(ctx, finalCanvas); break;
    }
  }

  createSingleLayout(ctx, canvas) {
    canvas.width = 300;
    canvas.height = 200;
    const margin = 20;
    const photoHeight = 160;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const total = this.capturedPhotos.length; let drawn = 0;
    this.capturedPhotos.forEach((photo, index) => {
      const img = new Image();
      img.onload = () => {
        const y = margin + (index * (photoHeight + margin));
        ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);
        if (index === this.capturedPhotos.length - 1) {
          this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
        }
        if (++drawn === total) this.markLayoutReady();
      };
      img.src = photo;
    });
  }

  createTwoStripLayout(ctx, canvas) {
    canvas.width = 300;
    canvas.height = 380;
    const margin = 20;
    const photoHeight = 160;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const total = Math.min(2, this.capturedPhotos.length); let drawn = 0;
    this.capturedPhotos.slice(0, 2).forEach((photo, index) => {
      const img = new Image();
      img.onload = () => {
        const y = margin + (index * (photoHeight + margin));
        ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);
        if (index === 1) this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
        if (++drawn === total) this.markLayoutReady();
      };
      img.src = photo;
    });
  }

  createThreeStripLayout(ctx, canvas) {
    canvas.width = 300;
    canvas.height = 560;
    const margin = 20;
    const photoHeight = 160;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const total = this.capturedPhotos.length; let drawn = 0;
    this.capturedPhotos.forEach((photo, index) => {
      const img = new Image();
      img.onload = () => {
        const y = margin + (index * (photoHeight + margin));
        ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);
        if (index === this.capturedPhotos.length - 1) {
          this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
        }
        if (++drawn === total) this.markLayoutReady();
      };
      img.src = photo;
    });
  }

  createFourStripLayout(ctx, canvas) {
    canvas.width = 300;
    canvas.height = 740;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const photoHeight = 160;
    const margin = 20;

    const total = this.capturedPhotos.length; let drawn = 0;
    this.capturedPhotos.forEach((photo, index) => {
      const img = new Image();
      img.onload = () => {
        const y = margin + (index * (photoHeight + margin));
        ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);
        if (index === this.capturedPhotos.length - 1) {
          this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
        }
        if (++drawn === total) this.markLayoutReady();
      };
      img.src = photo;
    });
  }

  // used by layout creators above
  addLayoutTitle(ctx, canvas, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(248, 249, 245, 1)';
    ctx.font = '12px';
    ctx.textAlign = 'center';
    ctx.scale(-1,1);
    ctx.fillText(text, canvas.width / 2, canvas.height - 8);
    ctx.restore();
  }

  showResults() {
    const resultsSection = document.getElementById('photo-results');
    if (resultsSection) {
      resultsSection.style.display = 'block';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // while canvas renders, block Save and show hint
    const saveBtn = document.getElementById('save-gallery-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rendering…';
    }
  }

  startPhotoSession() {
    if (!this.stream) {
      showError('Please allow camera access first.');
      return;
    }
    this.resetSession();
    this.capturePhoto();
  }

  resetSession() {
    this.capturedPhotos = [];
    this.isLayoutReady = false;
    const resultsSection = document.getElementById('photo-results');
    if (resultsSection) resultsSection.style.display = 'none';
  }

  startNewSession() {
    this.resetSession();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ───────────── Uploads + QR (photobooth results) ───────────── */

  // Prefer HEAD; your backend implements HEAD /i/:id
  verifyPublicUrl(url) {
    return fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then(r => r.ok)
      .catch(() => false);
  }

  uploadImageToService(imageData, mode = 'view') {
    return this.fetchWith404Fallback(this.API_BASE, '/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, fileName: `pixelpop-photo-${Date.Now?.() || Date.now()}.jpg` })
    }, ['/upload'])
    .then(response => {
      const data = response._json || {};
      if (!response.ok) return null;
      let qrUrl = data.url;
      if (mode === 'view' && data.viewerUrl) qrUrl = data.viewerUrl;
      if (mode === 'download' && data.downloadUrl) qrUrl = data.downloadUrl;
      return qrUrl;
    })
    .catch(() => null);
  }

  showQRCodeResult(uploadUrl) {
    const qrSection = document.getElementById('qr-section');
    const qrCanvas  = document.getElementById('qr-code');
    const qrLink    = document.getElementById('qr-link');
    if (!(qrSection && qrCanvas && qrLink && uploadUrl)) return;

    qrSection.style.display = 'block';
    qrCanvas.width = 150; qrCanvas.height = 150;
    qrCanvas.style.background = 'white';

    if (typeof QRious === 'function') {
      new QRious({
        element: qrCanvas,
        value: uploadUrl,
        size: 150,
        level: 'H',
        background: 'white',
        foreground: 'black',
        padding: 0
      });
    }

    qrLink.href = uploadUrl;
    qrLink.target = '_blank';
    qrLink.rel = 'noopener noreferrer';
    qrLink.textContent = 'Open image';

    this.wireQrActionsResult(uploadUrl);
  }

  wireQrActionsResult(uploadUrl) {
    const actions  = document.getElementById('qr-actions');
    const copyBtn  = document.getElementById('copy-link');
    const dlBtn    = document.getElementById('download-qr');
    const qrCanvas = document.getElementById('qr-code');
    if (!(actions && copyBtn && dlBtn && qrCanvas)) return;

    actions.style.display = 'inline-flex';

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(uploadUrl)
        .then(() => { copyBtn.textContent = 'Copied!'; })
        .catch(() => { copyBtn.textContent = 'Copy failed'; });
      setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1200);
    };

    dlBtn.onclick = () => {
      const dataUrl = qrCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl; a.download = `pixelpop-qr-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    };
  }

  downloadPhotos() {
    const finalCanvas = document.getElementById('final-canvas');
    if (!finalCanvas) return;

    const scale = 2;
    const w = finalCanvas.width * scale;
    const h = finalCanvas.height * scale;

    const mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = w;
    mirrorCanvas.height = h;
    const ctx = mirrorCanvas.getContext('2d');

    ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.restore();

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(finalCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(finalCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
    ctx.restore();

    mirrorCanvas.toBlob((blob) => {
      const dataURL = mirrorCanvas.toDataURL('image/jpeg', 1.0);
      this.uploadImageToService(dataURL, 'view').then(qrUrl => {
        const link = document.createElement('a');
        link.download = `pixelpop-photos-${Date.now()}.jpg`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 250);

        if (qrUrl) {
          this.verifyPublicUrl(qrUrl).then(() => this.showQRCodeResult(qrUrl))
            .catch(() => this.showQRCodeResult(qrUrl));
        }
      });
    }, 'image/jpeg', 1.0);
  }

  printPhotos() {
    const finalCanvas = document.getElementById('final-canvas');
    if (!finalCanvas) return;

    const scale = 2;
    const w = finalCanvas.width * scale;
    const h = finalCanvas.height * scale;

    const mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = w;
    mirrorCanvas.height = h;
    const ctx = mirrorCanvas.getContext('2d');

    ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.restore();

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(finalCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(finalCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
    ctx.restore();

    const dataURL = mirrorCanvas.toDataURL('image/jpeg', 1.0);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>PixelPop Studio Photos</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              @media print { html, body { height: 100%; } img { page-break-inside: avoid; } }
              body { margin: 0; display: flex; justify-content: center; align-items: center;
                     min-height: 100vh; background: #fff; }
              img { max-width: 100%; max-height: 100vh; height: auto; }
            </style>
          </head>
          <body>
            <img src="${dataURL}" alt="PixelPop Mirrored Photo"/>
            <script>
              const img = document.querySelector('img');
              if (img && !img.complete) { img.addEventListener('load', () => window.print()); }
              else { window.print(); }
              window.addEventListener('afterprint', () => window.close());
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert('Please allow pop-ups to print.');
    }

    this.uploadImageToService(dataURL, 'view').then(qrUrl => {
      if (qrUrl) {
        this.verifyPublicUrl(qrUrl).then(() => this.showQRCodeResult(qrUrl))
          .catch(() => this.showQRCodeResult(qrUrl));
      }
    });
  }

  /* ───────────── Gallery (login-gated) ───────────── */

// List current user's photos
/*listMyPhotos() {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve({ ok: false, items: [], error: 'no-token' });

  return this.fetchWith404Fallback(this.API_BASE, '/api/gallery/mine', {
    headers: { Authorization: 'Bearer ' + token }
  }, ['/gallery/mine'])
  .then(res => {
    const d = res._json || {};
    return { ok: res.ok, items: d.items || [], error: d.error || (!res.ok ? `HTTP ${res.status}` : '') };
  })
  .catch(e => ({ ok: false, items: [], error: String(e) }));
}

// Save one image (dataURL) into user's private gallery
savePhotoToGallery(dataURL) {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve({ ok: false, error: 'no-token' });

  return this.fetchWith404Fallback(this.API_BASE, '/api/gallery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      imageData: dataURL,
      visibility: 'private',
      fileName: `pixelpop-${Date.now()}.jpg`
    })
  }, ['/gallery'])
  .then(res => {
    const d = res._json || {};
    const errorMsg = d.error || d.message || (res.ok ? '' : `HTTP ${res.status}`);
    if (!res.ok) console.warn('[gallery POST] failed', { status: res.status, body: d });
    return { ok: res.ok, item: d.item, error: errorMsg };
  })
  .catch(e => ({ ok: false, error: String(e) }));
}

deletePhoto(photoId) {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve(false);

  return this.fetchWith404Fallback(this.API_BASE, `/api/gallery/${photoId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  }, [`/gallery/${photoId}`])
  .then(res => res.ok)
  .catch(() => false);
}

// Build a gallery card DOM node (reused)
buildGalleryCard(it) {
  if (!it || !it.url) return null;

  const card = document.createElement('div');
  card.className = 'gallery-card';
  if (it.id) card.dataset.id = it.id;

  const img = document.createElement('img');
  img.src = it.url;
  img.alt = 'Your photo';

  // Tap image to toggle selection when in select mode (iPhone-like)
  img.addEventListener('click', () => {
    if (this._selectMode) card.classList.toggle('selected');
  });

  const meta = document.createElement('div');
  meta.className = 'meta';

  const span = document.createElement('span');
  const time = new Date(it.createdAt || Date.now()).toLocaleString();
  span.textContent = time;

  const del = document.createElement('button');
  del.innerHTML = '<i class="fas fa-trash"></i>';
  del.addEventListener('click', () => {
    if (!confirm('Delete this photo?')) return;
    this.deletePhoto(it.id).then(ok => {
      if (ok) {
        card.remove();
        // keep local count in sync
        this._galleryCount = Math.max(0, (this._galleryCount || 0) - 1);
      }
    });
  });

  meta.appendChild(span);
  meta.appendChild(del);
  card.appendChild(img);
  card.appendChild(meta);
  return card;
}

// Navigate to Gallery and insert a just-saved item at the top
goToGalleryAndShow(item) {
  this.navigateToPage('gallery');

  const grid  = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');

  // If grid exists, insert immediately; else just refresh
  if (grid) {
    if (empty) empty.style.display = 'none';
    const card = this.buildGalleryCard(item);
    if (card) {
      if (grid.firstChild) grid.insertBefore(card, grid.firstChild);
      else grid.appendChild(card);
      // increment local count when we show a newly added item
      this._galleryCount = Math.min((this._galleryCount || 0) + 1, this.MAX_GALLERY);
    } else {
      this.refreshGallery();
    }
  } else {
    this.refreshGallery();
  }
}

// Render gallery page
refreshGallery() {
  const hint    = document.getElementById('gallery-login-hint');
  const grid    = document.getElementById('gallery-grid');
  const empty   = document.getElementById('gallery-empty');
  const actions = document.getElementById('gallery-actions');

  if (!(grid && empty && hint)) return;
  grid.innerHTML = '';

  // Ensure config/state exist even if constructor wasn't patched yet
  if (typeof this.MAX_GALLERY === 'undefined') this.MAX_GALLERY = 50;
  if (typeof this._galleryCount === 'undefined') this._galleryCount = 0;
  if (typeof this._selectMode === 'undefined') this._selectMode = false;

  this.verifyToken().then(isAuthed => {
    if (!isAuthed) {
      hint.style.display = 'block';
      if (actions) actions.style.display = 'none';
      empty.style.display = 'none';
      return;
    }

    hint.style.display = 'none';
    if (actions) actions.style.display = 'flex';

    this.listMyPhotos().then(({ ok, items }) => {
      if (!ok || !items || items.length === 0) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';

      // Track count + show newest first
      this._galleryCount = items.length;
      items
        .slice()
        .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
        .forEach(it => {
          const card = this.buildGalleryCard(it);
          if (card) grid.appendChild(card);
        });
    });

  });
}

// Wire up gallery page buttons
setupGalleryUi() {
  const refresh = document.getElementById('refresh-gallery');
  const logout  = document.getElementById('logout-from-gallery');
  const select  = document.getElementById('select-toggle');
  const delSel  = document.getElementById('delete-selected');

  if (refresh) refresh.addEventListener('click', () => this.refreshGallery());
  if (logout)  logout.addEventListener('click', (e) => {
    e.preventDefault();
    this.logout();
    this.refreshGallery();
  });

  // Ensure config/state exist
  if (typeof this.MAX_GALLERY === 'undefined') this.MAX_GALLERY = 50;
  if (typeof this._galleryCount === 'undefined') this._galleryCount = 0;
  if (typeof this._selectMode === 'undefined') this._selectMode = false;

  // Selection mode toggle
  if (select) select.addEventListener('click', () => {
    this._selectMode = !this._selectMode;
    document.body.classList.toggle('gallery-select-mode', this._selectMode);
    select.textContent = this._selectMode ? 'Cancel' : 'Select';

    // Clear any previous selections when leaving select mode
    if (!this._selectMode) {
      document.querySelectorAll('.gallery-card.selected')
        .forEach(el => el.classList.remove('selected'));
    }
    if (delSel) delSel.disabled = !this._selectMode;
  });

  // Delete selected
  if (delSel) delSel.addEventListener('click', async () => {
    if (!this._selectMode) return;
    const chosen = Array.from(document.querySelectorAll('.gallery-card.selected'));
    if (chosen.length === 0) return;
    if (!confirm(`Delete ${chosen.length} photo(s)?`)) return;

    for (const card of chosen) {
      const id = card.dataset.id;
      const ok = await this.deletePhoto(id);
      if (ok) {
        card.remove();
        this._galleryCount = Math.max(0, this._galleryCount - 1);
      }
    }
  });
}

// Silently save final canvas to the user's gallery (if logged in)
maybeAutosaveToGallery() {
  this.verifyToken()
    .then(isAuthed => {
      if (!isAuthed) return;

      // wait for layout to finish rendering
      if (this.isLayoutReady) return this._doAutosave();
      const once = () => this._doAutosave();
      document.addEventListener('pixelpop:layout-ready', once, { once: true });
    })
    .catch(e => console.warn('Autosave failed:', e));
}

// actual autosave logic split out so we can wait for readiness
_doAutosave() {
  const finalCanvas = document.getElementById('final-canvas');
  if (!finalCanvas) return;

  // Enforce 50-photo cap
  if ((this._galleryCount || 0) >= this.MAX_GALLERY) {
    alert('Gallery is full (50 photos). Please delete some photos first.');
    return;
  }

  const scale = 2;
  const tmp = document.createElement('canvas');
  tmp.width  = finalCanvas.width * scale;
  tmp.height = finalCanvas.height * scale;
  const ctx = tmp.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tmp.width, tmp.height);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.drawImage(finalCanvas, 0, 0);
  if (ctx.restore) ctx.restore();

  const dataURL = tmp.toDataURL('image/jpeg', 0.95);
  return this.savePhotoToGallery(dataURL);
}

// Manual save from Photobooth results — then jump to Gallery and show it
saveFinalToGallery() {
  const btn = document.getElementById('save-gallery-btn');

  const setBusy = (busy) => {
    if (!btn) return;
    if (busy) {
      btn.disabled = true;
      btn.dataset._old = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset._old || '<i class="fas fa-cloud-upload-alt"></i> Save to My Gallery';
    }
  };

  const finalCanvas = document.getElementById('final-canvas');
  if (!finalCanvas) {
    alert('No photo to save yet.');
    return;
  }
  if (!this.isLayoutReady) {
    alert('Hang on — still rendering your photo…');
    return;
  }

  // Enforce 50-photo cap BEFORE doing work
  if ((this._galleryCount || 0) >= this.MAX_GALLERY) {
    alert('Gallery is full (50 photos). Please delete some photos first.');
    return;
  }

  setBusy(true);

  const scale = 2;
  const tmp = document.createElement('canvas');
  tmp.width  = finalCanvas.width * scale;
  tmp.height = finalCanvas.height * scale;
  const ctx = tmp.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tmp.width, tmp.height);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.drawImage(finalCanvas, 0, 0);
  if (ctx.restore) ctx.restore();

  const dataURL = tmp.toDataURL('image/jpeg', 0.95);

  this.savePhotoToGallery(dataURL)
    .then(({ ok, item, error }) => {
      if (ok) {
        const added = item || { id: null, url: dataURL, createdAt: new Date().toISOString() };
        alert('Saved to your private gallery!');
        this.goToGalleryAndShow(added);
      } else {
        alert('Save failed: ' + (error || 'Unknown error'));
      }
    })
    .catch(err => {
      console.warn('Save to gallery failed:', err);
      alert('Save failed. Please try again.');
    })
    .finally(() => setBusy(false));
}
}
*/



/* ────────────────────────────────────────────────────────────
   ERROR HANDLING UI
   ──────────────────────────────────────────────────────────── */
/*function showError(message) {
  const errorModal = document.getElementById('error-modal');
  const errorMessage = document.getElementById('error-message');
  if (errorModal && errorMessage) {
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
  }
}
function closeErrorModal() {
  const errorModal = document.getElementById('error-modal');
  if (errorModal) errorModal.style.display = 'none';
}*/

/* ========= API ========= */
listMyPhotos() {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve({ ok: false, items: [], error: 'no-token' });

  return this.fetchWith404Fallback(this.API_BASE, '/api/gallery/mine', {
    headers: { Authorization: 'Bearer ' + token }
  }, ['/gallery/mine'])
  .then(res => {
    const d = res._json || {};
    return { ok: res.ok, items: d.items || [], error: d.error || (!res.ok ? `HTTP ${res.status}` : '') };
  })
  .catch(e => ({ ok: false, items: [], error: String(e) }));
}

savePhotoToGallery(dataURL) {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve({ ok: false, error: 'no-token' });

  return this.fetchWith404Fallback(this.API_BASE, '/api/gallery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      imageData: dataURL,
      visibility: 'private',
      fileName: `pixelpop-${Date.now()}.jpg`
    })
  }, ['/gallery'])
  .then(res => {
    const d = res._json || {};
    const errorMsg = d.error || d.message || (res.ok ? '' : `HTTP ${res.status}`);
    if (!res.ok) console.warn('[gallery POST] failed', { status: res.status, body: d });
    return { ok: res.ok, item: d.item, error: errorMsg };
  })
  .catch(e => ({ ok: false, error: String(e) }));
}

deletePhoto(photoId) {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve(false);

  return this.fetchWith404Fallback(this.API_BASE, `/api/gallery/${photoId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  }, [`/gallery/${photoId}`])
  .then(res => res.ok)
  .catch(() => false);
}

/* ========= Helpers ========= */
_buildAbsUrl(u) { return !u ? '' : (u.startsWith('http') ? u : (this.API_BASE + u)); }

/* ---- Mirror helpers (persist/recall which items are "photo result") ---- */
_loadMirroredCache() {
  if (this._mirroredCache) return this._mirroredCache;
  try {
    const raw = localStorage.getItem('pp_mirrored_ids') || '[]';
    this._mirroredCache = new Set(JSON.parse(raw));
  } catch { this._mirroredCache = new Set(); }
  return this._mirroredCache;
}
_saveMirroredCache() {
  try { localStorage.setItem('pp_mirrored_ids', JSON.stringify([...this._mirroredCache])); } catch {}
}
_rememberMirrored(it) {
  if (!it) return;
  this._loadMirroredCache();
  const key = it.id ? String(it.id) : (it.fileName ? String(it.fileName) : null);
  if (!key) return;
  this._mirroredCache.add(key);
  this._saveMirroredCache();
  it._mirrored = true;
}
_isMirrored(it) {
  if (!it) return false;
  if (it._mirrored || it.mirrored) return true;
  // Heuristic: default photo-result naming pattern
  const named = typeof it.fileName === 'string' && /^pixelpop-\d+\.jpg$/i.test(it.fileName);
  if (named) return true;
  this._loadMirroredCache();
  const key1 = it.id ? String(it.id) : null;
  const key2 = it.fileName ? String(it.fileName) : null;
  return (key1 && this._mirroredCache.has(key1)) || (key2 && this._mirroredCache.has(key2));
}

/* ---- Download helpers ---- */
_downloadWithAuth(url, saveBlob, it) {
  const token = localStorage.getItem('token');
  if (!url || !token) return alert('Unable to download. Please log in again.');
  fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    .then(r => r.ok ? r.blob() : Promise.reject())
    .then(blob => this._maybeMirrorBlobForDownload(it, blob))
    .then(saveBlob)
    .catch(() => alert('Download failed. Please try again.'));
}

/** Mirror blob iff item is a photo-result; otherwise return original. */
_maybeMirrorBlobForDownload(it, blob) {
  const needsMirror = this._isMirrored(it);
  if (!needsMirror) return Promise.resolve(blob);

  const toBitmap = ('createImageBitmap' in window)
    ? createImageBitmap(blob).then(bmp => ({ w: bmp.width, h: bmp.height, src: bmp, type: 'bitmap' }))
    : new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, src: img, type: 'img' });
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

  return toBitmap.then(({ w, h, src, type }) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    if (type === 'bitmap') ctx.drawImage(src, 0, 0, w, h);
    else {
      ctx.drawImage(src, 0, 0);
      try { if (src.src?.startsWith('blob:')) URL.revokeObjectURL(src.src); } catch {}
    }
    return new Promise(resolve => {
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
      if (canvas.toBlob) canvas.toBlob(b => resolve(b || blob), mime, 0.95);
      else {
        const dataURL = canvas.toDataURL(mime, 0.95);
        const byteStr = atob(dataURL.split(',')[1]);
        const u8 = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) u8[i] = byteStr.charCodeAt(i);
        resolve(new Blob([u8], { type: mime }));
      }
    });
  }).catch(() => blob); // fallback: return original if mirroring fails
}

_downloadPhoto(it) {
  // Prefer public URL, fallback to secure-with-auth; mirror only if photo-result
  const pub = this._buildAbsUrl(it.urlFull || it.originalUrl || it.urlPublic || it.url || '');
  const sec = this._buildAbsUrl(it.secureUrl || it.urlFull || it.url || '');
  const filename = it.fileName || `photo-${it.id || Date.now()}.jpg`;

  const saveBlob = (blob) => {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  if (pub) {
    fetch(pub, { mode: 'cors' })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => this._maybeMirrorBlobForDownload(it, blob))
      .then(saveBlob)
      .catch(() => this._downloadWithAuth(sec, saveBlob, it));
  } else {
    this._downloadWithAuth(sec, saveBlob, it);
  }
}

/* ========= Cards ========= */
buildGalleryCard(it, index) {
  if (!it || !it.url) return null;

  const card = document.createElement('div');
  card.className = 'gallery-card';
  if (it.id) card.dataset.id = it.id;

  const img = document.createElement('img');
  img.src = this._buildAbsUrl(it.url);
  img.alt = it.fileName || 'Your photo';
  img.loading = 'lazy';

  // Mirror in GRID if photo-result
  if (this._isMirrored(it)) img.classList.add('mirrored');

  img.addEventListener('click', () => {
    if (this._selectMode) {
      card.classList.toggle('selected');
    } else {
      this.openLightbox(index);
    }
  });

  const meta = document.createElement('div'); meta.className = 'meta';

  const span = document.createElement('span');
  span.textContent = new Date(it.createdAt || Date.now()).toLocaleString();

  const btnDl = document.createElement('button');
  btnDl.className = 'meta-btn';
  btnDl.innerHTML = '<i class="fas fa-download"></i>';
  btnDl.title = 'Download';
  btnDl.addEventListener('click', (e) => { e.stopPropagation(); this._downloadPhoto(it); });

  const del = document.createElement('button');
  del.className = 'meta-btn danger';
  del.innerHTML = '<i class="fas fa-trash"></i>';
  del.title = 'Delete';
  del.addEventListener('click', () => {
    if (!confirm('Delete this photo?')) return;
    this.deletePhoto(it.id).then(ok => {
      if (ok) {
        card.remove();
        this._galleryCount = Math.max(0, (this._galleryCount || 0) - 1);
      }
    });
  });

  meta.appendChild(span);
  meta.appendChild(btnDl);
  meta.appendChild(del);
  card.appendChild(img);
  card.appendChild(meta);
  return card;
}

/* ========= Navigate to gallery after save ========= */
goToGalleryAndShow(item) {
  this.navigateToPage('gallery');
  const grid  = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');

  if (grid) {
    if (empty) empty.style.display = 'none';
    const card = this.buildGalleryCard(item, 0);
    if (card) {
      grid.firstChild ? grid.insertBefore(card, grid.firstChild) : grid.appendChild(card);
      this._galleryCount = Math.min((this._galleryCount || 0) + 1, this.MAX_GALLERY);
      if (!Array.isArray(this._galleryItems)) this._galleryItems = [];
      this._galleryItems.unshift(item);
    } else {
      this.refreshGallery();
    }
  } else {
    this.refreshGallery();
  }
}

/* ========= Render gallery ========= */
refreshGallery() {
  const hint    = document.getElementById('gallery-login-hint');
  const grid    = document.getElementById('gallery-grid');
  const empty   = document.getElementById('gallery-empty');
  const actions = document.getElementById('gallery-actions');
  if (!(grid && empty && hint)) return;

  grid.innerHTML = '';
  if (typeof this.MAX_GALLERY === 'undefined') this.MAX_GALLERY = 50;
  if (typeof this._galleryCount === 'undefined') this._galleryCount = 0;
  if (typeof this._selectMode === 'undefined') this._selectMode = false;

  this.verifyToken().then(isAuthed => {
    if (!isAuthed) {
      hint.style.display = 'block';
      if (actions) actions.style.display = 'none';
      empty.style.display = 'none';
      return;
    }

    hint.style.display = 'none';
    if (actions) actions.style.display = 'flex';

    this.listMyPhotos().then(({ ok, items }) => {
      if (!ok || !items || items.length === 0) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';

      this._galleryCount = items.length;

      const sorted = items.slice().sort((a,b) =>
        new Date(b.createdAt||0) - new Date(a.createdAt||0)
      );

      this._galleryItems = sorted;
      sorted.forEach((it, index) => {
        const card = this.buildGalleryCard(it, index);
        if (card) grid.appendChild(card);
      });
    });
  });
}

/* ========= UI wiring + Lightbox ========= */
setupGalleryUi() {
  const refresh = document.getElementById('refresh-gallery');
  const logout  = document.getElementById('logout-from-gallery');
  const select  = document.getElementById('select-toggle');
  const delSel  = document.getElementById('delete-selected');

  // Inject minimal CSS: mirror grid + lightbox only when .mirrored is present
  if (!document.getElementById('gallery-mirror-css')) {
    const style = document.createElement('style');
    style.id = 'gallery-mirror-css';
    style.textContent = `
      /* Mirror only items tagged/detected as photo-result */
      #gallery-grid img.mirrored,
      #lightbox-img.mirrored { transform: scaleX(-1); }
    `;
    document.head.appendChild(style);
  }

  if (refresh) refresh.addEventListener('click', () => this.refreshGallery());
  if (logout)  logout.addEventListener('click', (e) => { e.preventDefault(); this.logout(); this.refreshGallery(); });

  if (typeof this.MAX_GALLERY === 'undefined') this.MAX_GALLERY = 50;
  if (typeof this._galleryCount === 'undefined') this._galleryCount = 0;
  if (typeof this._selectMode === 'undefined') this._selectMode = false;

  if (select) select.addEventListener('click', () => {
    this._selectMode = !this._selectMode;
    document.body.classList.toggle('gallery-select-mode', this._selectMode);
    select.textContent = this._selectMode ? 'Cancel' : 'Select';
    if (!this._selectMode) document.querySelectorAll('.gallery-card.selected').forEach(el => el.classList.remove('selected'));
    if (delSel) delSel.disabled = !this._selectMode;
  });

  if (delSel) delSel.addEventListener('click', async () => {
    if (!this._selectMode) return;
    const chosen = Array.from(document.querySelectorAll('.gallery-card.selected'));
    if (!chosen.length) return;
    if (!confirm(`Delete ${chosen.length} photo(s)?`)) return;
    for (const card of chosen) {
      const id = card.dataset.id;
      const ok = await this.deletePhoto(id);
      if (ok) {
        card.remove();
        this._galleryCount = Math.max(0, this._galleryCount - 1);
      }
    }
  });

  // Lightbox overlay + controls
  const lb = document.getElementById('lightbox');
  if (lb) {
    if (lb.parentElement !== document.body) document.body.appendChild(lb);

    lb.querySelector('.lb-close')?.addEventListener('click', () => this.closeLightbox());
    lb.querySelector('.lb-next')?.addEventListener('click', () => this.nextLightbox(+1));
    lb.querySelector('.lb-prev')?.addEventListener('click', () => this.nextLightbox(-1));

    lb.addEventListener('click', (e) => {
      const onStage = e.target.closest('.lightbox-stage');
      const onBtn = e.target.closest('.lb-btn');
      if (!onStage && !onBtn) this.closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') this.closeLightbox();
      if (e.key === 'ArrowRight') this.nextLightbox(+1);
      if (e.key === 'ArrowLeft') this.nextLightbox(-1);
    });

    let touchX = null;
    lb.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) this.nextLightbox(dx < 0 ? +1 : -1);
      touchX = null;
    }, { passive: true });
  }

  // Re-fit on resize
  window.addEventListener('resize', () => {
    const open = document.getElementById('lightbox')?.classList.contains('open');
    if (open) this._setInitialViewFit();
  });
}

/* ========= Lightbox core ========= */
openLightbox(index = 0) {
  if (!this._galleryItems || !this._galleryItems.length) return;
  this._currentLight = Math.max(0, Math.min(index, this._galleryItems.length - 1));
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  this.updateLightboxImage();
}

closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
}

nextLightbox(delta = 1) {
  const len = this._galleryItems?.length || 0;
  if (!len) return;
  this._currentLight = (this._currentLight + delta + len) % len;
  this.updateLightboxImage();
}
updateLightboxImage() {
  // Find the lightbox image (robust to markup variations)
  const imgEl =
    document.getElementById('lightbox-img') ||
    document.querySelector('#lightbox-img, #lightbox .lightbox-stage img, #lightbox img');
  const counterEl = document.getElementById('lightbox-counter');
  if (!imgEl) return;

  const it = this._galleryItems[this._currentLight] || {};
  const abs = (u) => (!u ? '' : (u.startsWith('http') ? u : (this.API_BASE + u)));

  // Prefer full-res if your backend provides it
  const fullPref  = abs(it.urlFull || it.originalUrl || it.urlHigh || '');
  const tryPublic = fullPref || abs(it.urlPublic || it.url || '');
  const trySecure = abs(it.secureUrl || it.urlFull || it.url || '');

  if (counterEl) counterEl.textContent = `${this._currentLight + 1} / ${this._galleryItems.length}`;

  // Mirror ONLY if this comes from photo result
  const shouldMirror = this._isMirrored(it);

  // Apply mirror *inline* so no CSS can override it
  const applyMirror = () => {
    if (shouldMirror) {
      imgEl.classList.add('mirrored');           // optional, for consistency
      imgEl.style.transform = 'scaleX(-1)';      // <-- hard-enforce mirror
      imgEl.style.transformOrigin = 'center center';
    } else {
      imgEl.classList.remove('mirrored');
      imgEl.style.transform = '';                // normal
    }
  };

  // Ensure sizing then mirror after load (for both public and blob paths)
  const onLoad = () => {
    this._setInitialViewFit?.();
    applyMirror();
  };

  // Set src (public first, then secure)
  imgEl.onload = onLoad;
  imgEl.src = tryPublic || trySecure || '';
  imgEl.alt = it.fileName || 'Photo';

  // Auth fallback -> blob; re-apply mirror on load
  imgEl.onerror = () => {
    const token = localStorage.getItem('token');
    if (!token || !trySecure) return;
    fetch(trySecure, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        imgEl.onload = onLoad;
        imgEl.src = blobUrl;
      })
      .catch(() => {});
  };

  // Also apply immediately (covers cached image cases)
  applyMirror();
}



_setInitialViewFit() {
  // Do NOT set 'none' here; leave inline transform alone
  const img = document.getElementById('lightbox-img') ||
              document.querySelector('#lightbox-img, #lightbox .lightbox-stage img, #lightbox img');
  // keep your fit logic, but DON'T do: img.style.transform = 'none';
}

_resetZoomState() {
  const img = document.getElementById('lightbox-img') ||
              document.querySelector('#lightbox-img, #lightbox .lightbox-stage img, #lightbox img');
  // DON'T reset transform to 'none'; leave it as-is
  this._z = 1; this._tx = 0; this._ty = 0;
}


_applyTransform() { /* No-zoom */ }
_setupZoomHandlers() { /* No-zoom */ }

/* ========= Autosave + Manual save ========= */
maybeAutosaveToGallery() {
  this.verifyToken().then(isAuthed => {
    if (!isAuthed) return;
    if (this.isLayoutReady) return this._doAutosave();
    const once = () => this._doAutosave();
    document.addEventListener('pixelpop:layout-ready', once, { once: true });
  }).catch(e => console.warn('Autosave failed:', e));
}

_doAutosave() {
  const finalCanvas = document.getElementById('final-canvas');
  if (!finalCanvas) return;
  if ((this._galleryCount || 0) >= this.MAX_GALLERY) {
    alert('Gallery is full (50 photos). Please delete some photos first.');
    return;
  }
  const scale = 2;
  const tmp = document.createElement('canvas');
  tmp.width  = finalCanvas.width * scale;
  tmp.height = finalCanvas.height * scale;
  const ctx = tmp.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tmp.width, tmp.height);
  ctx.save(); ctx.scale(scale, scale); ctx.drawImage(finalCanvas, 0, 0); if (ctx.restore) ctx.restore();
  const dataURL = tmp.toDataURL('image/jpeg', 0.95);

  return this.savePhotoToGallery(dataURL).then((res) => {
    if (res && res.ok && res.item) this._rememberMirrored(res.item);
    return res;
  });
}

saveFinalToGallery() {
  const btn = document.getElementById('save-gallery-btn');
  const setBusy = (busy) => {
    if (!btn) return;
    if (busy) { btn.disabled = true; btn.dataset._old = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
    else { btn.disabled = false; btn.innerHTML = btn.dataset._old || '<i class="fas fa-cloud-upload-alt"></i> Save to My Gallery'; }
  };

  const finalCanvas = document.getElementById('final-canvas');
  if (!finalCanvas) return alert('No photo to save yet.');
  if (!this.isLayoutReady) return alert('Hang on — still rendering your photo…');
  if ((this._galleryCount || 0) >= this.MAX_GALLERY) return alert('Gallery is full (50 photos). Please delete some photos first.');

  setBusy(true);
  const scale = 2;
  const tmp = document.createElement('canvas');
  tmp.width  = finalCanvas.width * scale;
  tmp.height = finalCanvas.height * scale;
  const ctx = tmp.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tmp.width, tmp.height);
  ctx.save(); ctx.scale(scale, scale); ctx.drawImage(finalCanvas, 0, 0); if (ctx.restore) ctx.restore();
  const dataURL = tmp.toDataURL('image/jpeg', 0.95);

  this.savePhotoToGallery(dataURL)
    .then(({ ok, item, error }) => {
      if (ok) {
        const added = item || { id: null, url: dataURL, createdAt: new Date().toISOString(), fileName: `pixelpop-${Date.now()}.jpg` };
        this._rememberMirrored(added);
        alert('Saved to your private gallery!');
        this.goToGalleryAndShow(added);
      } else {
        alert('Save failed: ' + (error || 'Unknown error'));
      }
    })
    .catch(err => { console.warn('Save to gallery failed:', err); alert('Save failed. Please try again.'); })
    .finally(() => setBusy(false));
}
}

/* ────────────────────────────────────────────────────────────
   Initialize application + expose helpers
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const app = new PixelPopStudio();
  window.PixelPopAppNavigate = (page) => app.navigateToPage(page);
  window.PixelPopApp = app; // expose so frame section can call verifyToken()

  // reflect login state on privileged buttons immediately
  app.updatePrivilegedButtonsState();
});

/* ────────────────────────────────────────────────────────────
   Frame page (Download + Print + QR) - Promise version
   ──────────────────────────────────────────────────────────── */
const FRAME_API_BASE = 'https://pixelpop-backend-fm6t.onrender.com';
const toAbsolute = (url) => (!url ? null : url.startsWith('http') ? url : `${FRAME_API_BASE}${url}`);

function frameVerifyPublicUrl(url) {
  return fetch(url, { method: 'HEAD', cache: 'no-store' })
    .then(r => r.ok)
    .catch(() => false);
}

function frameUploadImageToService(imageData, mode = 'view') {
  // reuse 404-fallback if available
  const tryFetch = (path, alts) =>
    (window.PixelPopApp
      ? window.PixelPopApp.fetchWith404Fallback(FRAME_API_BASE, path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData, fileName: `framed-image-${Date.now()}.jpg` })
        }, alts)
      : fetch(`${FRAME_API_BASE}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData, fileName: `framed-image-${Date.now()}.jpg` })
        }).then(async res => { let j={};try{j=await res.clone().json()}catch{} res._json=j; return res; })
    );

  return tryFetch('/api/upload', ['/upload'])
    .then(res => {
      const data = res._json || {};
      if (!res.ok) return null;
      let url = data.url;
      if (mode === 'view' && data.viewerUrl)       url = data.viewerUrl;
      if (mode === 'download' && data.downloadUrl) url = data.downloadUrl;
      return toAbsolute(url);
    })
    .catch(() => null);
}

function showQRCodeFrame(uploadUrl) {
  const section = document.getElementById('qr-section-frame');
  const canvas  = document.getElementById('qr-code-frame');
  const link    = document.getElementById('qr-link-frame');
  const actions = document.getElementById('qr-actions-frame');
  const copyBtn = document.getElementById('copy-link-frame');
  const dlBtn   = document.getElementById('download-qr-frame');
  if (!(section && canvas && link) || !uploadUrl) return;

  section.style.display = 'block';
  canvas.width = 150; canvas.height = 150;

  if (typeof QRious === 'function') {
    new QRious({
      element: canvas,
      value: uploadUrl,
      size: 150,
      level: 'H',
      background: 'white',
      foreground: 'black',
      padding: 0
    });
  }

  link.href = uploadUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open / Download photo';

  if (actions && copyBtn && dlBtn) {
    actions.style.display = 'inline-flex';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(uploadUrl)
        .then(() => { copyBtn.textContent = 'Copied!'; })
        .catch(() => { copyBtn.textContent = 'Copy failed'; });
      setTimeout(() => (copyBtn.textContent = 'Copy link'), 1200);
    };
    dlBtn.onclick = () => {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl; a.download = `pixelpop-qr-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    };
  }
}

function buildFramedOutput(userSrc, frameSrc) {
  return new Promise((resolve) => {
    if (!userSrc || !frameSrc) return resolve(null);

    const imgPhoto = new Image();
    const imgFrame = new Image();
    imgPhoto.crossOrigin = 'anonymous';
    imgFrame.crossOrigin = 'anonymous';

    let loaded = 0;
    const done = () => {
      if (++loaded !== 2) return;

      const canvas = document.createElement('canvas');
      canvas.width  = imgPhoto.naturalWidth;
      canvas.height = imgPhoto.naturalHeight;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(imgPhoto, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgFrame, 0, 0, canvas.width, canvas.height);

      const dataURL = canvas.toDataURL('image/jpeg', 1.0);
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve({ canvas, blob, dataURL }), 'image/jpeg', 1.0);
      } else {
        const byteString = atob(dataURL.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        resolve({ canvas, blob: new Blob([ab], { type: 'image/jpeg' }), dataURL });
      }
    };

    imgPhoto.onload = done;  imgPhoto.onerror = () => resolve(null);
    imgFrame.onload = done;  imgFrame.onerror = () => resolve(null);

    imgPhoto.src = userSrc;
    imgFrame.src = frameSrc;
  });
}

// Frame page listeners
document.addEventListener('DOMContentLoaded', () => {
  const fileInput    = document.getElementById('fileInput');
  const userPhoto    = document.getElementById('userPhoto');
  const frameImage   = document.getElementById('frameImage');
  const messageBox   = document.getElementById('initialMessage');
  const downloadBtn  = document.getElementById('downloadBtn');
  const printBtn     = document.getElementById('printFrameBtn');
  const saveFrameBtn = document.getElementById('saveFrameToGalleryBtn'); // Save to My Gallery (frame)
  const frameSearch  = document.getElementById('frameSearch');
  const frameItems   = Array.from(document.querySelectorAll('.frame-item'));

  let selectedFrameSrc = '';
  let userPhotoSrc     = '';

  const showMessage = (text) => {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.style.display = 'block';
    setTimeout(() => { messageBox.style.display = 'none'; }, 3000);
  };

  const setActionsVisibility = () => {
    const ready = !!(userPhotoSrc && selectedFrameSrc);
    const hasToken = !!localStorage.getItem('token');

    if (downloadBtn) {
      downloadBtn.style.display = ready ? 'inline-block' : 'none';
      downloadBtn.title = hasToken ? '' : 'Log in to use this';
    }
    if (printBtn) {
      printBtn.style.display = ready ? 'inline-block' : 'none';
      printBtn.title = hasToken ? '' : 'Log in to use this';
    }
    if (saveFrameBtn) {
      saveFrameBtn.style.display = ready ? 'inline-block' : 'none';
      saveFrameBtn.title = hasToken ? '' : 'Log in to use this';
    }
  };

  // Upload photo
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        userPhotoSrc = String(ev.target.result);
        if (userPhoto) {
          userPhoto.src = userPhotoSrc;
          userPhoto.style.opacity = 1;
        }
        setActionsVisibility();
        if (!selectedFrameSrc) showMessage('Now choose a frame!');
      };
      reader.readAsDataURL(file);
    });
  }

  // Choose frame
  frameItems.forEach(item => {
    item.addEventListener('click', () => {
      frameItems.forEach(t => t.classList.remove('selected'));
      item.classList.add('selected');

      const thumb = item.querySelector('.frame-thumb');
      selectedFrameSrc = (thumb && (thumb.getAttribute('data-frame') || thumb.src)) || '';

      if (frameImage && selectedFrameSrc) {
        frameImage.src = selectedFrameSrc;
        frameImage.style.opacity = 1;
      }
      setActionsVisibility();
      showMessage(userPhotoSrc ? 'Frame applied successfully!' : 'Photo uploaded successfully, now choose a frame!');
    });
  });

  // Search frames
  if (frameSearch) {
    frameSearch.addEventListener('keyup', (event) => {
      const term = (event.target.value || '').toLowerCase();
      frameItems.forEach(item => {
        const thumb = item.querySelector('.frame-thumb');
        const alt = (thumb && thumb.alt) ? thumb.alt.toLowerCase() : '';
        item.style.display = alt.includes(term) ? 'flex' : 'none';
      });
    });
  }

  // Helper to check login on frame page with fallback (Promise-based)
  const requireLoginFrame = () => {
    const hasFn = window.PixelPopApp && typeof window.PixelPopApp.verifyToken === 'function';
    const p = hasFn ? window.PixelPopApp.verifyToken() : Promise.resolve(!!localStorage.getItem('token'));
    return p.then(ok => {
      if (!ok) {
        console.warn('[PixelPop Frame] verifyToken=false → showing alert');
        alert('Please log in to continue.');
        return false;
      }
      return true;
    });
  };

  // Download + QR (LOGIN REQUIRED)
  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();

      requireLoginFrame().then(ok => {
        if (!ok) return;
        if (!userPhotoSrc || !selectedFrameSrc) {
          alert('Upload a photo and choose a frame first.');
          return;
        }

        buildFramedOutput(userPhotoSrc, selectedFrameSrc).then(out => {
          if (!out) { alert('Could not compose framed image.'); return; }

          const a = document.createElement('a');
          a.download = `framed-image-${Date.now()}.jpg`;
          a.href = URL.createObjectURL(out.blob);
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 250);

          frameUploadImageToService(out.dataURL, 'view').then(qrUrl => {
            if (qrUrl) {
              frameVerifyPublicUrl(qrUrl)
                .then(() => showQRCodeFrame(qrUrl))
                .catch(() => showQRCodeFrame(qrUrl));
            }
          });

          showMessage('Image downloaded in original HD quality!');
        });
      });
    });
  }

  // Print + QR (LOGIN REQUIRED)
  if (printBtn) {
    printBtn.addEventListener('click', (e) => {
      e.preventDefault();

      requireLoginFrame().then(ok => {
        if (!ok) return;
        if (!userPhotoSrc || !selectedFrameSrc) {
          alert('Upload a photo and choose a frame first.');
          return;
        }

        buildFramedOutput(userPhotoSrc, selectedFrameSrc).then(out => {
          if (!out) { alert('Could not compose framed image.'); return; }

          const w = window.open('', '_blank');
          if (w) {
            w.document.write(`
              <html>
                <head>
                  <title>PixelPop Framed Photo</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <style>
                    @media print { html, body { height: 100%; } img { page-break-inside: avoid; } }
                    html, body { margin:0; }
                    body { display:flex; justify-content:center; align-items:center; min-height:100vh; background:#fff; }
                    img { max-width:100%; max-height:100vh; height:auto; }
                  </style>
                </head>
                <body>
                  <img src="${out.dataURL}" alt="Framed Photo"/>
                  <script>
                    const img = document.querySelector('img');
                    if (img && !img.complete) img.addEventListener('load', () => window.print());
                    else window.print();
                    window.addEventListener('afterprint', () => window.close());
                  <\/script>
                </body>
              </html>
            `);
            w.document.close();
          } else {
            alert('Please allow pop-ups to print.');
          }

          frameUploadImageToService(out.dataURL, 'view').then(qrUrl => {
            if (qrUrl) {
              frameVerifyPublicUrl(qrUrl)
                .then(() => showQRCodeFrame(qrUrl))
                .catch(() => showQRCodeFrame(qrUrl));
            }
          });

          showMessage('Ready to print. QR generated!');
        });
      });
    });
  }

  // Save framed output directly to gallery (LOGIN REQUIRED) + jump to Gallery
  if (saveFrameBtn) {
    saveFrameBtn.addEventListener('click', (e) => {
      e.preventDefault();

      requireLoginFrame().then(ok => {
        if (!ok) return;
        if (!userPhotoSrc || !selectedFrameSrc) {
          alert('Upload a photo and choose a frame first.');
          return;
        }

        const setBusy = (busy) => {
          if (!saveFrameBtn) return;
          if (busy) {
            saveFrameBtn.disabled = true;
            saveFrameBtn.dataset._old = saveFrameBtn.innerHTML;
            saveFrameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
          } else {
            saveFrameBtn.disabled = false;
            saveFrameBtn.innerHTML = saveFrameBtn.dataset._old || 'Save to My Gallery';
          }
        };

        setBusy(true);

        buildFramedOutput(userPhotoSrc, selectedFrameSrc).then(out => {
          if (!out) { alert('Could not compose framed image.'); setBusy(false); return; }

          const attempt = (window.PixelPopApp && typeof window.PixelPopApp.savePhotoToGallery === 'function')
            ? window.PixelPopApp.savePhotoToGallery(out.dataURL)
            : fetch(FRAME_API_BASE + '/api/gallery', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({
                  imageData: out.dataURL,
                  visibility: 'private',
                  fileName: 'pixelpop-' + Date.now() + '.jpg'
                })
              }).then(r => r.ok ? { ok: true, item: { url: out.dataURL } } : Promise.reject(new Error('save-failed')));

          Promise.resolve(attempt)
            .then((res) => {
              const item = res && res.item ? res.item : { id: null, url: out.dataURL, createdAt: new Date().toISOString() };
              alert('Saved to your private gallery!');
              // show immediately in Gallery
              if (window.PixelPopApp && typeof window.PixelPopApp.goToGalleryAndShow === 'function') {
                window.PixelPopApp.goToGalleryAndShow(item);
              } else {
                if (typeof window.PixelPopAppNavigate === 'function') window.PixelPopAppNavigate('gallery');
              }
            })
            .catch(() => alert('Could not save to gallery.'))
            .finally(() => setBusy(false));
        });
      });
    });
  }

  // init display state
  showMessage('Upload a photo to begin!');
  setActionsVisibility();
});

/* ────────────────────────────────────────────────────────────
   Auth UI + API glue (login/register forms)
   ──────────────────────────────────────────────────────────── */
/*const API_BASE = 'https://pixelpop-backend-fm6t.onrender.com';

function safeJson(res) {
  return res.text().then(text => {
    try { return text ? JSON.parse(text) : {}; } catch { return {}; }
  });
}

function setBusy(form, busy) {
  if (!form) return;
  [...form.elements].forEach(el => (el.disabled = !!busy));
  form.dataset.busy = busy ? '1' : '';
}

// Get elements
const loginForm    = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const container    = document.querySelector('.logincontainer');
const registerBtn  = document.querySelector('.register-btn');
const loginBtn     = document.querySelector('.login-btn');

// Toggle UI
if (registerBtn) registerBtn.addEventListener('click', () => container && container.classList.add('active'));
if (loginBtn)    loginBtn.addEventListener('click', () => container && container.classList.remove('active'));

// Registration (Promise version) with 404 fallback
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setBusy(registerForm, true);

    const username = e.target.username.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      setBusy(registerForm, false);
      return;
    }

    const doFetch = (path, alts) =>
      (window.PixelPopApp
        ? window.PixelPopApp.fetchWith404Fallback(API_BASE, path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
          }, alts)
        : fetch(API_BASE + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
          }).then(async r => { let j={}; try{j=await r.clone().json()}catch{} r._json=j; return r; })
      );

    doFetch('/signup', ['/api/signup'])
      .then(({ ok, _json: data, status }) => {
        if (ok) {
          alert('Registration successful! Please log in.');
          if (container) container.classList.remove('active');
          if (registerForm.reset) registerForm.reset();
        } else {
          alert(`Registration failed: ${(data && (data.error || data.message)) || `HTTP ${status}`}`);
          console.error('Registration failed:', data);
        }
      })
      .catch(err => {
        console.error('Error during registration:', err);
        alert('An error occurred during registration. Please try again later.');
      })
      .finally(() => setBusy(registerForm, false));
  });
}

// Login (Promise version) with 404 fallback
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setBusy(loginForm, true);

    const username = e.target.username.value.trim();
    const password = e.target.password.value;

    const doFetch = (path, alts) =>
      (window.PixelPopApp
        ? window.PixelPopApp.fetchWith404Fallback(API_BASE, path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          }, alts)
        : fetch(API_BASE + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          }).then(async r => { let j={}; try{j=await r.clone().json()}catch{} r._json=j; return r; })
      );

    doFetch('/login', ['/api/login'])
      .then(({ ok, _json: data, status }) => {
        if (ok && data && data.token) {
          localStorage.setItem('token', data.token);
          alert('Login successful!');

          if (window.PixelPopApp && window.PixelPopApp.updatePrivilegedButtonsState) {
            window.PixelPopApp.updatePrivilegedButtonsState();
          }

          if (typeof window.PixelPopAppNavigate === 'function') {
            window.PixelPopAppNavigate('layout');
          }

          if (loginForm.reset) loginForm.reset();
        } else {
          alert(`Login failed: ${(data && (data.error || data.message)) || `HTTP ${status}`}`);
          console.error('Login failed:', data);
        }
      })
      .catch(err => {
        console.error('Error during login:', err);
        alert('An error occurred during login. Please try again later.');
      })
      .finally(() => setBusy(loginForm, false));
  });
}
*/
/* ────────────────────────────────────────────────────────────
   Auth UI + API glue (login/register/forgot/google) + Profile
   ──────────────────────────────────────────────────────────── */

const API_BASE = window.API_BASE || 'https://pixelpop-backend-fm6t.onrender.com';

/* ---------- Tiny helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setBusy(form, busy) {
  if (!form) return;
  [...form.elements].forEach(el => (el.disabled = !!busy));
  form.dataset.busy = busy ? '1' : '';
}
function getToken() { return localStorage.getItem('token') || ''; }
function setToken(t) { if (t) localStorage.setItem('token', t); }

function authHeaders(extra = {}) {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

async function doPost(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  let j = {};
  try { j = await r.clone().json(); } catch {}
  r._json = j;
  return r;
}

async function doGet(path, { withAuth = false } = {}) {
  const r = await fetch(API_BASE + path, {
    method: 'GET',
    headers: withAuth ? authHeaders() : { 'Content-Type': 'application/json' }
  });
  let j = {};
  try { j = await r.clone().json(); } catch {}
  r._json = j;
  return r;
}

/* ---------- Elements ---------- */
const loginForm    = $('#login-form');
const registerForm = $('#register-form');
const container    = $('.logincontainer');
const registerBtn  = $('.register-btn');
const loginBtn     = $('.login-btn');
const forgotLink   = $('#forgot-link') || $('.forgot-link a');

// Profile box (inside login page)
const profileBox        = $('#user-profile');
const profileName       = $('#profile-name');
const profilePic        = $('#profile-pic');             // optional
const profileLogoutBtn  = $('#profile-logout-btn');      // keep different from nav logout id

/* ---------- Toggle between login/register cards ---------- */
if (registerBtn) registerBtn.addEventListener('click', () => container?.classList.add('active'));
if (loginBtn)    loginBtn.addEventListener('click', () => container?.classList.remove('active'));

/* ---------- Registration ---------- */
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBusy(registerForm, true);

    const username = e.target.username.value.trim();
    const email    = e.target.email.value.trim();
    const password = e.target.password.value;
    const confirm  = e.target.confirmPassword.value;

    if (!username || !email || !password) {
      alert('Please fill all fields.');
      return setBusy(registerForm, false);
    }
    if (password !== confirm) {
      alert('Passwords do not match!');
      return setBusy(registerForm, false);
    }

    try {
      const r = await doPost('/signup', { username, email, password });
      if (r.ok) {
        alert('Registration successful! Please log in.');
        container?.classList.remove('active');
        registerForm.reset();
      } else {
        alert(`Registration failed: ${r._json?.error || r._json?.message || `HTTP ${r.status}`}`);
        console.error('Registration failed:', r._json);
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('An error occurred during registration. Please try again.');
    } finally {
      setBusy(registerForm, false);
    }
  });
}

/* ---------- Login (email OR username) ---------- */
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBusy(loginForm, true);

    // Support <input name="identifier"> or legacy <input name="username">
    const raw = (e.target.identifier?.value ?? e.target.username?.value ?? '').trim();
    const password = e.target.password.value;

    if (!raw || !password) {
      alert('Please enter your email/username and password.');
      return setBusy(loginForm, false);
    }

    const body = raw.includes('@') ? { email: raw, password } : { username: raw, password };

    try {
      const r = await doPost('/login', body);
      if (r.ok && r._json?.token) {
        setToken(r._json.token);

        // Friendly display name for profile
        const displayName = r._json?.user?.username || r._json?.user?.email || raw;
        localStorage.setItem('username', displayName);

        // Update app UI (nav buttons, etc.)
        if (window.PixelPopApp?.updatePrivilegedButtonsState) {
          window.PixelPopApp.updatePrivilegedButtonsState();
        }

        // Show profile box on login page
        showUserProfile(displayName);

        // Optional: navigate to booth after login
        if (typeof window.PixelPopAppNavigate === 'function') {
          window.PixelPopAppNavigate('layout');
        }

        loginForm.reset();

        // Optional: quick verify (non-blocking)
        doGet('/api/auth/verify', { withAuth: true }).catch(() => {});
      } else {
        alert(`Login failed: ${r._json?.error || r._json?.message || `HTTP ${r.status}`}`);
        console.error('Login failed:', r._json);
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred during login. Please try again.');
    } finally {
      setBusy(loginForm, false);
    }
  });
}

/* ---------- Forgot Password ---------- */
if (forgotLink) {
  forgotLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Enter the email on your account:');
    if (!email) return;
    try {
      const r = await doPost('/forgot-password', { email });
      alert(r._json?.message || 'If that account exists, we sent a reset link.');
    } catch (err) {
      console.error('Forgot password error:', err);
      alert('Could not process password reset. Please try again.');
    }
  });
}

/* ---------- Google Sign-In (GIS) callback ---------- */
/* Ensure you include the GIS script in HTML:
   <script src="https://accounts.google.com/gsi/client" async defer></script> */
window.handleGoogleCredential = async (response) => {
  try {
    const idToken = response?.credential;
    if (!idToken) return alert('Google sign-in failed: no credential.');

    const r = await doPost('/auth/google', { idToken });
    if (!r.ok || !r._json?.token) {
      return alert(`Google sign-in failed: ${r._json?.error || `HTTP ${r.status}`}`);
    }

    setToken(r._json.token);

    const displayName = r._json?.user?.username || r._json?.user?.email || 'user';
    localStorage.setItem('username', displayName);

    if (window.PixelPopApp?.updatePrivilegedButtonsState) {
      window.PixelPopApp.updatePrivilegedButtonsState();
    }

    showUserProfile(displayName);

    if (typeof window.PixelPopAppNavigate === 'function') {
      window.PixelPopAppNavigate('layout');
    }

    // Optional verify
    doGet('/api/auth/verify', { withAuth: true }).catch(() => {});
  } catch (err) {
    console.error('Google sign-in error:', err);
    alert('Google sign-in failed. Please try again.');
  }
};

/* ---------- Profile UI helpers ---------- */
function showUserProfile(username) {
  // Hide the login form box, show the profile card
  if (container)  container.style.display = 'none';
  if (profileBox) profileBox.style.display  = 'block';
  if (profileName) profileName.textContent  = `Welcome, ${username || 'user'}!`;
  // Optionally: if you fetch user photo from backend, set profilePic.src here
}

/* ---------- Unified Logout: any .logout-btn triggers logout ---------- */
function doLogout() {
  localStorage.removeItem('username');
  localStorage.removeItem('token');

  // Restore login panel, hide profile card
  if (profileBox) profileBox.style.display = 'none';
  if (container)  container.style.display  = '';

  // Let the app rebuild nav state (adds/removes nav logout)
  if (window.PixelPopApp?.updatePrivilegedButtonsState) {
    window.PixelPopApp.updatePrivilegedButtonsState();
  }

  // Optional: route to home
  if (typeof window.PixelPopAppNavigate === 'function') {
    window.PixelPopAppNavigate('home');
  }
}

// Delegate click for any current/future .logout-btn (nav + profile)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.logout-btn');
  if (!btn) return;
  e.preventDefault();
  doLogout();
});

/* ---------- Auto-show profile on refresh ---------- */
window.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  if (username) showUserProfile(username);
});
