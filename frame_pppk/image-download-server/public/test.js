// PixelPop Studio - Main JavaScript File
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
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupLayoutSelection();
        this.setupBorderSelection();
        this.setupFilterSelection();
        this.setupCameraControls();
        this.setupTimerControls();
        this.setupPhotoControls();
        this.setupMobileMenu();
    }

  verifyToken() {
    var token = localStorage.getItem('token');
    if (!token) return Promise.resolve(false);
    return fetch('https://pixelpop-backend-fm6t.onrender.com/api/auth/verify', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  // ---- Navigation + gating ----
  setupNavigation() {
    var navLinks = document.querySelectorAll('.nav-link');
    var ctaButton = document.querySelector('.cta-button');

    for (var i = 0; i < navLinks.length; i++) {
      var link = navLinks[i];
      link.addEventListener('click', (e) => {
        e.preventDefault();
        var page = e.currentTarget.dataset.page;

        if (page === 'layout') {
          this.verifyToken().then((ok) => {
            if (!ok) {
              localStorage.removeItem('token');
              alert('You must log in first!');
              return;
            }
            this.navigateToPage(page);
          });
          return;
        }

        this.navigateToPage(page);
      });
    }

    if (ctaButton) {
      ctaButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.verifyToken().then((ok) => {
          if (!ok) {
            localStorage.removeItem('token');
            alert('You must log in first!');
            return;
          }
          this.navigateToPage('layout');
        });
      });
    }
  }

  navigateToPage(page) {
    // defense-in-depth: block programmatic calls too
    if (page === 'layout' && !localStorage.getItem('token')) {
      alert('You must log in first!');
      return;
    }

    // Hide all pages
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');

    // Show target page
    var targetPage = document.getElementById(page + '-page');
    if (targetPage) {
      targetPage.classList.add('active');
      targetPage.classList.add('fade-in');
    }

    // Update nav active state
    var links = document.querySelectorAll('.nav-link');
    for (var j = 0; j < links.length; j++) {
      var l = links[j];
      l.classList.toggle('active', l.dataset.page === page);
    }

    this.currentPage = page;

    // Camera lifecycle
    if (page === 'layout') this.initializeCamera();
    else if (this.stream) this.stopCamera();

    // Close mobile menu if open
    var navMenu = document.querySelector('.nav-menu');
    var hamburger = document.querySelector('.hamburger');
    if (navMenu && navMenu.classList.contains('active')) {
      navMenu.classList.remove('active');
      if (hamburger) hamburger.classList.remove('active');
    }
  }

  setupMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', function () {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
      });
    }
  }



    // Layout Selection
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

    // Border Selection
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

    // Filter Selection
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

    // Camera Controls
    setupCameraControls() {
        const captureBtn = document.getElementById('capture-btn');
        const startSessionBtn = document.getElementById('start-session');
        const resetSessionBtn = document.getElementById('reset-session');

        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                if (!this.isCapturing) {
                    this.capturePhoto();
                }
            });
        }

        if (startSessionBtn) {
            startSessionBtn.addEventListener('click', () => {
                this.startPhotoSession();
            });
        }

        if (resetSessionBtn) {
            resetSessionBtn.addEventListener('click', () => {
                this.resetSession();
            });
        }
    }

    // Timer Controls
    setupTimerControls() {
        const timerSelect = document.getElementById('timer-select');
        if (timerSelect) {
            timerSelect.addEventListener('change', (e) => {
                this.timerValue = parseInt(e.target.value);
            });
        }
    }

    // Photo Download Controls
    setupPhotoControls() {
        const downloadBtn = document.getElementById('download-btn');
        const printBtn = document.getElementById('print-btn');
        const newSessionBtn = document.getElementById('new-session');

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadPhotos();
            });
        }

        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printPhotos();
            });
        }

        if (newSessionBtn) {
            newSessionBtn.addEventListener('click', () => {
                this.startNewSession();
            });
        }
    }

    // Camera Initialization
    async initializeCamera() {
        const loadingOverlay = document.getElementById('loading-overlay');
        const cameraFeed = document.getElementById('camera-feed');
        
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            if (cameraFeed) {
                cameraFeed.srcObject = this.stream;
                cameraFeed.play();
            }

            if (loadingOverlay) loadingOverlay.style.display = 'none';
        } catch (error) {
            console.error('Camera access error:', error);
            this.showError('Camera access denied. Please allow camera permission and try again.');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    // Apply Live Filter Preview
    applyLiveFilter() {
        const cameraFeed = document.getElementById('camera-feed');
        if (!cameraFeed) return;

        // Remove existing filter classes
        cameraFeed.className = '';
        
        // Apply new filter
        if (this.currentFilter !== 'none') {
            cameraFeed.classList.add(`filter-${this.currentFilter}`);
        }
    }

    // Photo Capture
    async capturePhoto() {
        if (this.isCapturing) return;
        
        this.isCapturing = true;
        
        if (this.timerValue > 0) {
            await this.startTimer();
        }
        
        const photo = this.takeSnapshot();
        if (photo) {
            this.capturedPhotos.push(photo);
            this.checkSessionComplete();
        }
        
        this.isCapturing = false;
    }

    // Timer Countdown
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

    // Take Snapshot
    takeSnapshot() {
        const video = document.getElementById('camera-feed');
        const canvas = document.getElementById('photo-canvas');
        
        if (!video || !canvas) return null;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply filter effects
        this.applyCanvasFilter(ctx, canvas);

        // Apply border
        this.applyBorder(ctx, canvas);

        return canvas.toDataURL('image/jpeg', 0.9);
    }

    // Apply Canvas Filters
    applyCanvasFilter(ctx, canvas) {
        if (this.currentFilter === 'none') return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (this.currentFilter) {
            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
                break;
                
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                }
                break;
                
            case 'vintage':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
                break;
                
            case 'bright':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.3);
                    data[i + 1] = Math.min(255, data[i + 1] * 1.3);
                    data[i + 2] = Math.min(255, data[i + 2] * 1.3);
                }
                break;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Apply Border
    applyBorder(ctx, canvas) {
        if (this.currentBorder === 'none') return;

        const borderWidth = 20;
        
        ctx.strokeStyle = this.getBorderColor();
        ctx.lineWidth = borderWidth;
        
        switch (this.currentBorder) {
            case 'classic':
                ctx.strokeRect(borderWidth/2, borderWidth/2, 
                             canvas.width - borderWidth, canvas.height - borderWidth);
                break;
                
            case 'modern':
                ctx.strokeStyle = '#ff69b4';
                ctx.lineWidth = 15;
                ctx.strokeRect(7.5,7.5, canvas.width - 15, canvas.height - 15);
                break;
                
            case 'vintage':
                ctx.strokeStyle = '#8b4513';
                ctx.lineWidth = 25;
                ctx.strokeRect(12.5, 12.5, canvas.width - 25, canvas.height - 25);
                // Add inner border
                ctx.lineWidth = 5;
                ctx.strokeRect(22.5, 22.5, canvas.width - 45, canvas.height - 45);
                break;
        }
    }

    getBorderColor() {
        switch (this.currentBorder) {
            case 'classic': return '#343a40';
            case 'modern': return '#ff69b4';
            case 'vintage': return '#8b4513';
            default: return '#000000';
        }
    }

   // Check if session is complete
    checkSessionComplete() {
        const requiredPhotos = this.getRequiredPhotoCount();
        if (this.capturedPhotos.length >= requiredPhotos) {
            this.completeSession();
        }
    }

    getRequiredPhotoCount() {
        switch (this.currentLayout) {
            case 'single': return 1;
            case 'twostrip': return 2;
            case 'threestrip': return 3;
            case 'fourstrip': return 4;
            default: return 1;
        }
    }

    // Complete Photo Session
    completeSession() {
        this.createFinalLayout();
        this.showResults();
    }

    // Create Final Layout
    createFinalLayout() {
        const finalCanvas = document.getElementById('final-canvas');
        if (!finalCanvas) return;

        const ctx = finalCanvas.getContext('2d');
        
        switch (this.currentLayout) {
            case 'single':
                this.createSingleLayout(ctx, finalCanvas);
                break;
            case 'twostrip':
                this.createTwoStripLayout(ctx, finalCanvas);
                break;
            case 'threestrip':
                this.createThreeStripLayout(ctx, finalCanvas);
                break;
            case 'fourstrip':
                this.createFourStripLayout(ctx, finalCanvas);
                break;
        }
    }

    createSingleLayout(ctx, canvas) {
        canvas.width = 300;
        canvas.height = 200;

        const margin = 20;
        const photoHeight = 160; 

         // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.capturedPhotos.forEach((photo, index) => {
            const img = new Image();
            img.onload = () => {
                const y = margin + (index * (photoHeight + margin));
                ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);

                if (index === this.capturedPhotos.length - 1) {
                    this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
                }
            };
            img.src = photo;
        });
    }
        
        
    createTwoStripLayout(ctx, canvas) {
    canvas.width = 300;
    canvas.height = 380; // shorter height for 2 strips

    const margin = 20;
    const photoHeight = 160; // each photo height

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.capturedPhotos.slice(0, 2).forEach((photo, index) => { // only take 2 photos
            const img = new Image();
            img.onload = () => {
                const y = margin + (index * (photoHeight + margin));
                ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);

                // Add title after the last photo
                if (index === 1) {
                    this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
                }
            };
            img.src = photo;
        });
    }

    createThreeStripLayout(ctx, canvas) {
    canvas.width = 300;
    canvas.height = 560;

    // Adjust height based on strip count
    const margin = 20;
    const photoHeight = 160; // Default for 4 strips
    /*const heights = { 4: 800, 3: 620, 2: 420 };*/

    /*canvas.height = heights[stripCount] || heights[4];*/

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.capturedPhotos.forEach((photo, index) => {
            const img = new Image();
            img.onload = () => {
                const y = margin + (index * (photoHeight + margin));
                ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);

                if (index === this.capturedPhotos.length - 1) {
                    this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
                }
            };
            img.src = photo;
        });
    }

    createFourStripLayout(ctx, canvas) {
        canvas.width = 300;
        canvas.height = 740;
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const photoHeight = 160;
        const margin = 20;
        
        this.capturedPhotos.forEach((photo, index) => {
            const img = new Image();
            img.onload = () => {
                const y = margin + (index * (photoHeight + margin));
                
                ctx.drawImage(img, margin, y, canvas.width - (margin * 2), photoHeight);
            

                if (index === this.capturedPhotos.length - 1) {
                    this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
                }
            };
            img.src = photo;
        });
    }

  

    // Show Results
    showResults() {
        const resultsSection = document.getElementById('photo-results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Start Photo Session
    startPhotoSession() {
        if (!this.stream) {
            this.showError('Please allow camera access first.');
            return;
        }
        
        this.resetSession();
        this.capturePhoto();
    }

    // Reset Session
    resetSession() {
        this.capturedPhotos = [];
        const resultsSection = document.getElementById('photo-results');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    // Start New Session
    startNewSession() {
        this.resetSession();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }






// Class field
API_BASE = 'https://pixelpop-backend-fm6t.onrender.com';

// (optional) quick HEAD reachability check
async verifyPublicUrl(url) {
  try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok; }
  catch { return false; }
}

// mode: 'view' | 'download' | 'raw'
async uploadImageToService(imageData, mode = 'view') {
  try {
    const response = await fetch(`${this.API_BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData,
        fileName: `pixelpop-photo-${Date.now()}.jpg`
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Upload failed:', data?.error || 'Unknown error');
      return null;
    }

    // pick the nicest QR target
    let qrUrl = data.url;                          // raw fallback
    if (mode === 'view' && data.viewerUrl)        qrUrl = data.viewerUrl;   // /v/:id (Download button)
    if (mode === 'download' && data.downloadUrl)  qrUrl = data.downloadUrl; // /d/:id (force download)

    console.log('Image uploaded!', { id: data.id, qrUrl });
    return qrUrl;
  } catch (error) {
    console.error('Error during image upload:', error);
    return null;
  }
}

// --- QR render (size + level + quiet zone) ---
showQRCode(uploadUrl) {
  const qrSection = document.getElementById('qr-section');
  const qrCanvas  = document.getElementById('qr-code');
  const qrLink    = document.getElementById('qr-link');
  if (!(qrSection && qrCanvas && qrLink && uploadUrl)) return;

  qrSection.style.display = 'block';
  qrCanvas.width = 300;
  qrCanvas.height = 300;
  qrCanvas.style.background = 'white';

  if (typeof QRious !== 'function') {
    console.error('QRious is not available on the page.');
    qrLink.href = uploadUrl;
    qrLink.target = '_blank';
    qrLink.rel = 'noopener noreferrer';
    qrLink.textContent = 'Open image';
    return;
  }

  new QRious({
    element: qrCanvas,
    value: uploadUrl,
    size: 300,
    level: 'H',
    background: 'white',
    foreground: 'black',
    padding: 16 // true quiet zone
  });

  // clickable fallback link
  qrLink.href = uploadUrl;
  qrLink.target = '_blank';
  qrLink.rel = 'noopener noreferrer';
  qrLink.textContent = uploadUrl;

  // hook up buttons
  this.wireQrActions(uploadUrl);
}

// Optional UI niceties under the QR
wireQrActions(uploadUrl) {
  const actions = document.getElementById('qr-actions');
  const copyBtn = document.getElementById('copy-link');
  const dlBtn   = document.getElementById('download-qr');
  const qrCanvas = document.getElementById('qr-code');
  if (!(actions && copyBtn && dlBtn && qrCanvas)) return;

  actions.style.display = 'inline-flex';

  copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(uploadUrl); copyBtn.textContent = 'Copied!'; }
    catch { copyBtn.textContent = 'Copy failed'; }
    setTimeout(()=> copyBtn.textContent = 'Copy link', 1200);
  };

  dlBtn.onclick = () => {
    const dataUrl = qrCanvas.toDataURL('image/png'); // lossless export
    const a = document.createElement('a');
    a.href = dataUrl; a.download = `pixelpop-qr-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };
}

// --- DOWNLOAD + QR ---
async downloadPhotos() {
  const finalCanvas = document.getElementById('final-canvas');
  if (!finalCanvas) return;

  const scale = 2;
  const w = finalCanvas.width * scale;
  const h = finalCanvas.height * scale;

  const mirrorCanvas = document.createElement('canvas');
  mirrorCanvas.width = w;
  mirrorCanvas.height = h;
  const ctx = mirrorCanvas.getContext('2d');

  // white background
  ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.restore?.();

  // mirror + draw
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(finalCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(finalCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  ctx.restore?.();

  mirrorCanvas.toBlob(async (blob) => {
    const dataURL = mirrorCanvas.toDataURL('image/jpeg', 1.0);
    const qrUrl = await this.uploadImageToService(dataURL, 'view'); // 'view' | 'download' | 'raw'

    // local download
    const link = document.createElement('a');
    link.download = `pixelpop-photos-${Date.now()}.jpg`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 250);

    if (qrUrl && await this.verifyPublicUrl(qrUrl)) this.showQRCode(qrUrl);
    else if (qrUrl) this.showQRCode(qrUrl);
  }, 'image/jpeg', 1.0);
}

// --- PRINT + QR ---
async printPhotos() {
  const finalCanvas = document.getElementById('final-canvas');
  if (!finalCanvas) return;

  const scale = 2;
  const w = finalCanvas.width * scale;
  const h = finalCanvas.height * scale;

  const mirrorCanvas = document.createElement('canvas');
  mirrorCanvas.width = w;
  mirrorCanvas.height = h;
  const ctx = mirrorCanvas.getContext('2d');

  // white background
  ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.restore?.();

  // mirror + draw
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(finalCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(finalCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  ctx.restore?.();

  const dataURL = mirrorCanvas.toDataURL('image/jpeg', 1.0);

  // print first (snappy UX)
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

  // then upload & show QR
  const qrUrl = await this.uploadImageToService(dataURL, 'view');
  if (qrUrl && await this.verifyPublicUrl(qrUrl)) this.showQRCode(qrUrl);
  else if (qrUrl) this.showQRCode(qrUrl);
}
}



    // --- ERROR HANDLING ---
  function showError(message) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.style.display = 'flex';
        }
    }


// Global function to close error modal
function closeErrorModal() {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        errorModal.style.display = 'none';
    }
}

// Initialize application + expose navigate helper
document.addEventListener('DOMContentLoaded', () => {
  const app = new PixelPopStudio();
  window.PixelPopAppNavigate = (page) => app.navigateToPage(page);
  window.PixelPopApp = app; // <— expose so frame section can call upload/showQRCode/etc.
});

// ===============================
// Frame page (Download + Print + QR)
// ===============================

// was: const API_BASE = 'https://pixelpop-backend-fm6t.onrender.com';
const FRAME_API_BASE = 'https://pixelpop-backend-fm6t.onrender.com';

// ---------- helpers ----------
const toAbsolute = (url) => (!url ? null : url.startsWith('http') ? url : `${FRAME_API_BASE}${url}`);

async function verifyPublicUrl(url) {
  try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok; }
  catch { return false; }
}

// mode: 'view' | 'download' | 'raw'
async function uploadImageToService(imageData, mode = 'view') {
  try {
    const res = await fetch(`${FRAME_API_BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, fileName: `framed-image-${Date.now()}.jpg` })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Upload failed:', data?.error || res.statusText);
      return null;
    }
    let url = data.url;
    if (mode === 'view' && data.viewerUrl)       url = data.viewerUrl;   // pretty view page (tap to download)
    if (mode === 'download' && data.downloadUrl) url = data.downloadUrl; // force download route
    return toAbsolute(url);
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}


function showQRCode(uploadUrl) {
  const qrSection = document.getElementById('qr-section');
  const qrCanvas  = document.getElementById('qr-code');
  const qrLink    = document.getElementById('qr-link');
  const qrActions = document.getElementById('qr-actions');
  const copyBtn   = document.getElementById('copy-link');
  const dlQrBtn   = document.getElementById('download-qr');

  if (!(qrSection && qrCanvas && qrLink) || !uploadUrl) return;

  qrSection.style.display = 'block';
  qrCanvas.width = 300; qrCanvas.height = 300;

  if (typeof QRious === 'function') {
    new QRious({
      element: qrCanvas,
      value: uploadUrl,
      size: 300,
      level: 'H',
      background: 'white',
      foreground: 'black',
      padding: 16 // quiet zone
    });
  }

  // universal fallback link (works on all devices)
  qrLink.href = uploadUrl;
  qrLink.target = '_blank';
  qrLink.rel = 'noopener noreferrer';
  qrLink.textContent = 'Open / Download photo';

  if (qrActions && copyBtn && dlQrBtn) {
    qrActions.style.display = 'inline-flex';
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(uploadUrl); copyBtn.textContent = 'Copied!'; }
      catch { copyBtn.textContent = 'Copy failed'; }
      setTimeout(() => (copyBtn.textContent = 'Copy link'), 1200);
    };
    dlQrBtn.onclick = () => {
      const dataUrl = qrCanvas.toDataURL('image/png');
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
    // If both are same-origin assets, crossOrigin can be omitted
    imgPhoto.crossOrigin = 'anonymous';
    imgFrame.crossOrigin = 'anonymous';

    let loaded = 0;
    const done = () => {
      if (++loaded !== 2) return;

      const canvas = document.createElement('canvas');
      canvas.width  = imgPhoto.naturalWidth;
      canvas.height = imgPhoto.naturalHeight;
      const ctx = canvas.getContext('2d');

      // white background for clean JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(imgPhoto, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgFrame, 0, 0, canvas.width, canvas.height);

      const dataURL = canvas.toDataURL('image/jpeg', 1.0);
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve({ canvas, blob, dataURL }), 'image/jpeg', 1.0);
      } else {
        // legacy fallback
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

// ---------- page wiring ----------
document.addEventListener('DOMContentLoaded', () => {
  const fileInput   = document.getElementById('fileInput');
  const userPhoto   = document.getElementById('userPhoto');
  const frameImage  = document.getElementById('frameImage');
  const messageBox  = document.getElementById('initialMessage');
  const downloadBtn = document.getElementById('downloadBtn');
  const printBtn    = document.getElementById('printFrameBtn'); // ensure this exists in HTML
  const frameSearch = document.getElementById('frameSearch');
  const frameItems  = Array.from(document.querySelectorAll('.frame-item'));

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
    if (downloadBtn) { downloadBtn.style.display = ready ? 'inline-block' : 'none'; downloadBtn.disabled = !ready; }
    if (printBtn)    { printBtn.style.display    = ready ? 'inline-block' : 'none'; printBtn.disabled    = !ready; }
  };

  // Upload photo
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
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

  // Choose frame
  frameItems.forEach(item => {
    item.addEventListener('click', () => {
      frameItems.forEach(t => t.classList.remove('selected'));
      item.classList.add('selected');

      const thumb = item.querySelector('.frame-thumb');
      selectedFrameSrc = thumb?.getAttribute('data-frame') || thumb?.src || '';

      if (frameImage && selectedFrameSrc) {
        frameImage.src = selectedFrameSrc;
        frameImage.style.opacity = 1;
      }
      setActionsVisibility();
      showMessage(userPhotoSrc ? 'Frame applied successfully!' : 'Photo uploaded successfully, now choose a frame!');
    });
  });

  // Search frames
  frameSearch?.addEventListener('keyup', (event) => {
    const term = (event.target.value || '').toLowerCase();
    frameItems.forEach(item => {
      const alt = (item.querySelector('.frame-thumb')?.alt || '').toLowerCase();
      item.style.display = alt.includes(term) ? 'flex' : 'none';
    });
  });

  // Download + QR
  downloadBtn?.addEventListener('click', async () => {
    if (!userPhotoSrc || !selectedFrameSrc) return;

    const out = await buildFramedOutput(userPhotoSrc, selectedFrameSrc);
    if (!out) { alert('Could not compose framed image.'); return; }

    // local download (kiosk)
    const a = document.createElement('a');
    a.download = `framed-image-${Date.now()}.jpg`;
    a.href = URL.createObjectURL(out.blob);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 250);

    // upload → QR (works on all devices)
    const qrUrl = await uploadImageToService(out.dataURL, 'view'); // or 'download'
    if (qrUrl) { try { await verifyPublicUrl(qrUrl); } catch {} showQRCode(qrUrl); }

    showMessage('Image downloaded in original HD quality!');
  });

  // Print + QR
  printBtn?.addEventListener('click', async () => {
    if (!userPhotoSrc || !selectedFrameSrc) return;

    const out = await buildFramedOutput(userPhotoSrc, selectedFrameSrc);
    if (!out) { alert('Could not compose framed image.'); return; }

    // open print window
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

    // upload → QR (works on all devices)
    const qrUrl = await uploadImageToService(out.dataURL, 'view'); // or 'download'
    if (qrUrl) { try { await verifyPublicUrl(qrUrl); } catch {} showQRCode(qrUrl); }

    showMessage('Ready to print. QR generated!');
  });

  // init
  showMessage('Upload a photo to begin!');
  setActionsVisibility();
});



// ===== Auth UI + API glue =====
const API_BASE = 'https://pixelpop-backend-fm6t.onrender.com';

// Safely parse JSON (doesn't throw on empty/HTML responses)
async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

// Enable/disable an entire form while submitting
function setBusy(form, busy) {
  if (!form) return;
  [...form.elements].forEach(el => (el.disabled = !!busy));
  form.dataset.busy = busy ? '1' : '';
}

// Get elements (may be null if not on this page)
const loginForm   = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const container    = document.querySelector('.logincontainer');
const registerBtn  = document.querySelector('.register-btn');
const loginBtn     = document.querySelector('.login-btn');

// Toggle UI
registerBtn?.addEventListener('click', () => container?.classList.add('active'));
loginBtn?.addEventListener('click', () => container?.classList.remove('active'));

// --- Registration ---
registerForm?.addEventListener('submit', async (e) => {
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

  try {
    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await safeJson(response);

    if (response.ok) {
      alert('Registration successful! Please log in.');
      // switch back to login UI
      container?.classList.remove('active');
      // optional: clear the form
      registerForm.reset?.();
    } else {
      alert(`Registration failed: ${data.error || data.message || response.statusText}`);
      console.error('Registration failed:', data);
    }
  } catch (err) {
    console.error('Error during registration:', err);
    alert('An error occurred during registration. Please try again later.');
  } finally {
    setBusy(registerForm, false);
  }
});

// --- Login ---
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setBusy(loginForm, true);

  const username = e.target.username.value.trim();
  const password = e.target.password.value;

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await safeJson(response);

    if (response.ok && data?.token) {
      // Save token
      localStorage.setItem('token', data.token);
      toggleLogoutVisibility();
      alert('Login successful!');
      

      // Go to Photobooth
      if (typeof window.PixelPopAppNavigate === 'function') {
        window.PixelPopAppNavigate('layout');
      } else {
        // Fallback: stay put, or navigate however your app prefers
        // window.location.href = '/#layout';
      }

      // optional: clear the form
      loginForm.reset?.();
    } else {
      alert(`Login failed: ${data.error || data.message || response.statusText}`);
      console.error('Login failed:', data);
    }
  } catch (err) {
    console.error('Error during login:', err);
    alert('An error occurred during login. Please try again later.');
  } finally {
    setBusy(loginForm, false);
  }
});

// --- Example: Fetch Profile ---
async function getProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in first.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await safeJson(res);
    if (!res.ok) {
      alert(`Failed to fetch profile: ${data.error || data.message || res.statusText}`);
      return;
    }
    console.log('Profile:', data);
  } catch (err) {
    console.error('Error fetching profile:', err);
    alert('An error occurred while fetching your profile.');
  }
}

// --- Logout ---
function logout() {
  localStorage.removeItem('token');
  toggleLogoutVisibility();              // <-- hide the button immediately
  if (typeof window.PixelPopAppNavigate === 'function') {
    window.PixelPopAppNavigate('home');  // soft-return to homepage (stops camera)
  } else {
    window.location.replace('/');        // hard-return fallback
  }
}


// Show/hide logout based on token
function toggleLogoutVisibility() {
  const menu = document.querySelector('.nav-menu');
  if (!menu) return;

  const hasToken = !!localStorage.getItem('token');
  let li = document.getElementById('logout-li');

  if (hasToken) {
    // create once
    if (!li) {
      li = document.createElement('li');
      li.id = 'logout-li';
      // IMPORTANT: not using "nav-link" class so your nav click handler won't intercept it
      li.innerHTML = `<button id="logout-btn" class="logout-btn">Logout</button>`;
      menu.appendChild(li);

      document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  } else {
    // remove if present
    if (li) li.remove();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  toggleLogoutVisibility();
});














