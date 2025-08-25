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

    // Navigation Setup
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const ctaButton = document.querySelector('.cta-button');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
            });
        });

        if (ctaButton) {
            ctaButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage('layout');
            });
        }
    }

    navigateToPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.classList.add('fade-in');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        this.currentPage = page;

        // Initialize camera if navigating to layout page
        if (page === 'layout') {
            this.initializeCamera();
        } else if (this.stream) {
            this.stopCamera();
        }
    }

    // Mobile Menu Setup
    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
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
    /*checkSessionComplete() {
        const requiredPhotos = this.getRequiredPhotoCount();
        if (this.capturedPhotos.length >= requiredPhotos) {
            this.completeSession();
        }
    }

    getRequiredPhotoCount() {
        switch (this.currentLayout) {
            case 'single': return 1;
            case 'strip': return 4;
            case 'collage': return 3;
            case 'grid': return 4;
            default: return 1;
        }
    }

    // Complete Photo Session
    /*completeSession() {
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
            case 'strip':
                this.createStripLayout(ctx, finalCanvas);
                break;
            case 'collage':
                this.createCollageLayout(ctx, finalCanvas);
                break;
            case 'grid':
                this.createGridLayout(ctx, finalCanvas);
                break;
        }
    }

    createSingleLayout(ctx, canvas) {
        canvas.width = 600;
        canvas.height = 800;
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.capturedPhotos.length > 0) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 50, 50, 500, 375);
                this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
            };
            img.src = this.capturedPhotos[0];
        }
    }*/
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
        
        // Background
        /*ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.capturedPhotos.length > 0) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, margin, 50, canvas.width - (margin * 2), photoHeight);
                this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
            };
            img.src = this.capturedPhotos[0];
        }
    }*/

    /*createStripLayout(ctx, canvas) {
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

    createCollageLayout(ctx, canvas) {
        canvas.width = 800;
        canvas.height = 600;
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.capturedPhotos.length >= 3) {
            // Large photo
            const img1 = new Image();
            img1.onload = () => {
                ctx.drawImage(img1, 20, 20, 400, 300);
            };
            img1.src = this.capturedPhotos[0];
            
            // Small photos
            const img2 = new Image();
            img2.onload = () => {
                ctx.drawImage(img2, 440, 20, 180, 135);
            };
            img2.src = this.capturedPhotos[1];
            
            const img3 = new Image();
            img3.onload = () => {
                ctx.drawImage(img3, 440, 175, 180, 135);
                this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
            };
            img3.src = this.capturedPhotos[2];
        }
    }

    createGridLayout(ctx, canvas) {
        canvas.width = 600;
        canvas.height = 600;
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const photoSize = 280;
        const margin = 20;
        
        this.capturedPhotos.forEach((photo, index) => {
            const img = new Image();
            img.onload = () => {
                const x = margin + (index % 2) * (photoSize + margin);
                const y = margin + Math.floor(index / 2) * (photoSize + margin);
                ctx.drawImage(img, x, y, photoSize, photoSize);
                
               /* if (index === this.capturedPhotos.length - 1) {
                    this.addLayoutTitle(ctx, canvas, 'PixelPop Studio');
                }
            };
            img.src = photo;
        });
    }*/
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

   /* addLayoutTitle(ctx, canvas, title) {
        ctx.fillStyle = '#ff69b4';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, canvas.height - 30);
        
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        const date = new Date().toLocaleDateString();
        ctx.fillText(date, canvas.width / 2, canvas.height - 10);
    }*/

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

    /*
 // --- UPLOAD IMAGE TO SERVICE ---
    // This is a placeholder function. You MUST replace this with your real
    // server-side upload logic.
    async uploadImageToService(imageData) {
        console.log("Simulating image upload... You need to replace this function.");
        return `https://pixelpop-server.onrender.com/photo-${Date.now()}.jpg`;
    }
    
    // --- DOWNLOAD + QR ---
    async downloadPhotos() {
        const finalCanvas = document.getElementById('final-canvas');
        if (!finalCanvas) return;

        const w = finalCanvas.width;
        const h = finalCanvas.height;

        const tempImage = new Image();
        tempImage.src = finalCanvas.toDataURL('image/jpeg', 0.9);

        tempImage.onload = async () => {
            const mirrorCanvas = document.createElement('canvas');
            mirrorCanvas.width = w;
            mirrorCanvas.height = h;
            const ctx = mirrorCanvas.getContext('2d');

            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(tempImage, 0, 0, w, h);
            ctx.restore?.();

            const mirroredImage = mirrorCanvas.toDataURL('image/jpeg', 0.9);
            const uploadUrl = await this.uploadImageToService(mirroredImage);

            // Download with corrected filename syntax
            const link = document.createElement('a');
            link.download = `pixelpop-photos-${Date.now()}.jpg`;
            link.href = mirroredImage;
            link.click();

            // Show QR Code with the public URL
            const qrSection = document.getElementById('qr-section');
            const qrCanvas = document.getElementById('qr-code');
            const qrLink = document.getElementById('qr-link');

            if (qrSection && qrCanvas && qrLink) {
            qrSection.style.display = 'block';

            new QRious({
                element: qrCanvas,
                value: mirroredImage,
                size: 200
            });

            // Make QR clickable on desktop
            qrLink.href = mirroredImage;
        }
        };
    }


    // --- PRINT + QR ---
    async printPhotos() {
        const finalCanvas = document.getElementById('final-canvas');
        if (!finalCanvas) return;

        const imageData = finalCanvas.toDataURL('image/jpeg', 0.9);
        const uploadUrl = await this.uploadImageToService(imageData);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>PixelPop Studio Photos</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <img src="${imageData}" />
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();

        // Show QR Code with the public URL
        const qrSection = document.getElementById('qr-section');
        const qrCanvas = document.getElementById('qr-code');
        const qrLink = document.getElementById('qr-link');

        if (qrSection && qrCanvas && qrLink) {
            qrSection.style.display = 'block';

            new QRious({
                element: qrCanvas,
                value: mirroredImage,
                size: 200
            });

            // Make QR clickable on desktop
            qrLink.href = mirroredImage;
        }
    }*/

        // --- UPLOAD IMAGE TO SERVICE ---
// This is a placeholder function. You MUST replace this with your real
// server-side upload logic.
async uploadImageToService(imageData) {
    console.log("Simulating image upload... You need to replace this function.");
    return `https://pixelpop-server.onrender.com/photo-${Date.now()}.jpg`;
}
async downloadPhotos() {
    const finalCanvas = document.getElementById('final-canvas');
    if (!finalCanvas) return;
    const w = finalCanvas.width;
    const h = finalCanvas.height;
    const tempImage = new Image();
    tempImage.src = finalCanvas.toDataURL('image/jpeg', 0.9);
    // Correct async/await usage
    await new Promise(resolve => tempImage.onload = resolve);
    const mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = w;
    mirrorCanvas.height = h;
    const ctx = mirrorCanvas.getContext('2d');
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(tempImage, 0, 0, w, h);
    ctx.restore?.();
    const mirroredImage = mirrorCanvas.toDataURL('image/jpeg', 0.9);
    const uploadUrl = await this.uploadImageToService(mirroredImage);
    // Download with corrected filename syntax
    const link = document.createElement('a');
    link.download = `pixelpop-photos-${Date.now()}.jpg`;
    link.href = mirroredImage;
    link.click();
    // Show QR Code with the public URL
    const qrSection = document.getElementById('qr-section');
    const qrCanvas = document.getElementById('qr-code');
    const qrLink = document.getElementById('qr-link');
    if (qrSection && qrCanvas && qrLink && uploadUrl) {
        qrSection.style.display = 'block';
        new QRious({
            element: qrCanvas,
            value: uploadUrl,
            size: 200
        });
        qrLink.href = uploadUrl;
    }
}
// --- PRINT + QR ---
async printPhotos() {
    const finalCanvas = document.getElementById('final-canvas');
    if (!finalCanvas) return;
    const w = finalCanvas.width;
    const h = finalCanvas.height;
    // Create a new canvas to create the mirrored image for printing
    const mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = w;
    mirrorCanvas.height = h;
    const ctx = mirrorCanvas.getContext('2d');
    // Apply the mirroring transformation
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(finalCanvas, 0, 0, w, h);
    ctx.restore?.();
    // Get the mirrored image data
    const mirroredImageData = mirrorCanvas.toDataURL('image/jpeg', 0.9);
    const uploadUrl = await this.uploadImageToService(mirroredImageData);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>PixelPop Studio Photos</title>
                <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    img { max-width: 100%; height: auto; }
                </style>
            </head>
            <body>
                <img src="${mirroredImageData}" />
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    // Show QR Code with the public URL
    const qrSection = document.getElementById('qr-section');
    const qrCanvas = document.getElementById('qr-code');
    const qrLink = document.getElementById('qr-link');
    if (qrSection && qrCanvas && qrLink && uploadUrl) {
        qrSection.style.display = 'block';
        new QRious({
            element: qrCanvas,
            value: uploadUrl,
            size: 200
        });
        qrLink.href = uploadUrl;
    }
}

    // --- ERROR HANDLING ---
    showError(message) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.style.display = 'flex';
        }
    }
}

// Global function to close error modal
function closeErrorModal() {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        errorModal.style.display = 'none';
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    new PixelPopStudio();
});
//frame section

 document.addEventListener('DOMContentLoaded', () => {
            const fileInput = document.getElementById('fileInput');
            const userPhoto = document.getElementById('userPhoto');
            const frameImage = document.getElementById('frameImage');
            const frameThumbs = document.querySelectorAll('.frame-thumb');
            const messageBox = document.getElementById('initialMessage');
            const downloadBtn = document.getElementById('downloadBtn');

            let selectedFrameSrc = '';
            let userPhotoSrc = '';

            const showMessage = (text) => {
                messageBox.textContent = text;
                messageBox.style.display = 'block';
                setTimeout(() => { messageBox.style.display = 'none'; }, 3000);
            };

            function checkDownloadReady() {
                if (userPhotoSrc && selectedFrameSrc) downloadBtn.style.display = 'inline-block';
                else downloadBtn.style.display = 'none';
            }

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        userPhotoSrc = e.target.result;
                        userPhoto.src = userPhotoSrc;
                        userPhoto.style.opacity = 1;
                        checkDownloadReady();
                        if (!selectedFrameSrc) showMessage("Now choose a frame!");
                    };
                    reader.readAsDataURL(file);
                }
            });

            frameThumbs.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    frameThumbs.forEach(t => t.classList.remove('selected'));
                    thumb.classList.add('selected');

                    selectedFrameSrc = thumb.getAttribute('data-frame');
                    frameImage.src = selectedFrameSrc;
                    frameImage.style.opacity = 1;
                    checkDownloadReady();

                    if (userPhotoSrc) showMessage("Frame applied successfully!");
                    else showMessage("Photo uploaded successfully, now choose a frame!");
                });
            });

            downloadBtn.addEventListener('click', () => {
                if (!userPhotoSrc || !selectedFrameSrc) return;

                const imgPhoto = new Image();
                const imgFrame = new Image();
                imgPhoto.crossOrigin = "anonymous";
                imgFrame.crossOrigin = "anonymous";

                let loaded = 0;
                function checkLoaded() {
                    loaded++;
                    if (loaded === 2) {
                        const canvas = document.createElement('canvas');
                        canvas.width = imgPhoto.naturalWidth;
                        canvas.height = imgPhoto.naturalHeight;
                        const ctx = canvas.getContext('2d');

                        ctx.drawImage(imgPhoto, 0, 0, canvas.width, canvas.height);
                        ctx.drawImage(imgFrame, 0, 0, canvas.width, canvas.height);

                        canvas.toBlob(blob => {
                            const link = document.createElement('a');
                            link.download = "framed-image.png";
                            link.href = URL.createObjectURL(blob);
                            link.click();
                            URL.revokeObjectURL(link.href);
                            showMessage("Image downloaded!");
                        }, 'image/png');
                    }
                }

                imgPhoto.onload = checkLoaded;
                imgFrame.onload = checkLoaded;
                imgPhoto.src = userPhotoSrc;
                imgFrame.src = selectedFrameSrc;
            });

            showMessage("Upload a photo to begin!");
        });