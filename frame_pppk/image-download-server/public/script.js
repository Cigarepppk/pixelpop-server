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

    // This method handles the navigation links and CTA button
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

    // This method handles the logic for showing/hiding pages
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

        // Close mobile menu after navigation
        const navMenu = document.querySelector('.nav-menu');
        const hamburger = document.querySelector('.hamburger');
        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            if (hamburger) {
                hamburger.classList.remove('active');
            }
        }
    }

    // This method handles the mobile menu toggle functionality
    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger) {
            hamburger.addEventListener('click', () => {
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

  
async uploadImageToService(imageData) {
    try {
        const response = await fetch('https://pixelpop-server.onrender.com/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData: imageData,
                fileName: `pixelpop-photo-${Date.now()}.jpg`
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Image uploaded successfully!", data.url);
            return data.url; // This returns the public URL of the uploaded image
        } else {
            console.error("Image upload failed:", data.error);
            return null;
        }
    } catch (error) {
        console.error("Error during image upload:", error);
        return null;
    }
}


// --- DOWNLOAD + QR ---
async downloadPhotos() {
    const finalCanvas = document.getElementById('final-canvas');
    if (!finalCanvas) return;

    // --- SCALE FOR HD OUTPUT ---
    const scale = 2; // increase for sharper output (2x = HD, 3x = 4K-ish)
    const w = finalCanvas.width * scale;
    const h = finalCanvas.height * scale;

    const mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = w;
    mirrorCanvas.height = h;
    const ctx = mirrorCanvas.getContext('2d');

    // Scale the context for HD
    ctx.scale(scale, scale);
    ctx.translate(finalCanvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(finalCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
    ctx.restore?.();

    // --- EXPORT HD IMAGE ---
    mirrorCanvas.toBlob(async (blob) => {
        const uploadUrl = await this.uploadImageToService(mirrorCanvas.toDataURL('image/jpeg', 1.0));

        // Download: The a.click() method is synchronous, so we need to add a short delay
        // before revoking the URL to give the browser a chance to start the download.
        const link = document.createElement('a');
        link.download = `pixelpop-photos-${Date.now()}.jpg`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link); // Append the link to the body
        link.click();
        document.body.removeChild(link); // Clean up the link element

        // The URL.revokeObjectURL call is now deferred to ensure the download works
        setTimeout(() => URL.revokeObjectURL(link.href), 100);

        // Show QR code
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
    }, 'image/jpeg', 1.0); // best quality
}

// --- PRINT + QR ---
async printPhotos() {
    const finalCanvas = document.getElementById('final-canvas');
    if (!finalCanvas) return;

    // --- SCALE FOR HD OUTPUT ---
    const scale = 2;
    const w = finalCanvas.width * scale;
    const h = finalCanvas.height * scale;

    const mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = w;
    mirrorCanvas.height = h;
    const ctx = mirrorCanvas.getContext('2d');

    ctx.scale(scale, scale);
    ctx.translate(finalCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(finalCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
    ctx.restore?.();

    // Get HD image data
    const mirroredImageData = mirrorCanvas.toDataURL('image/jpeg', 1.0);
    const uploadUrl = await this.uploadImageToService(mirroredImageData);

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>PixelPop Studio Photos</title>
                <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    img { max-width: 100%; height: 100%; }
                </style>
            </head>
            <body>
                <img src="${mirroredImageData}" />
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();

    // Show QR code
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
    const messageBox = document.getElementById('initialMessage');
    const downloadBtn = document.getElementById('downloadBtn');
    const frameSearch = document.getElementById('frameSearch');

    // CHANGE: Select the parent containers instead of just the images
    const frameItems = document.querySelectorAll('.frame-item');

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
    
    // CHANGE: Loop through the new frameItems and add the click listener
    frameItems.forEach(item => {
        item.addEventListener('click', () => {
            frameItems.forEach(t => t.classList.remove('selected'));
            item.classList.add('selected');

            // Find the image inside the clicked item
            const thumb = item.querySelector('.frame-thumb');
            selectedFrameSrc = thumb.getAttribute('data-frame');
            frameImage.src = selectedFrameSrc;
            frameImage.style.opacity = 1;
            checkDownloadReady();

            if (userPhotoSrc) showMessage("Frame applied successfully!");
            else showMessage("Photo uploaded successfully, now choose a frame!");
        });
    });

    // CHANGE: Update the search functionality to target frame-item containers
    frameSearch.addEventListener('keyup', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        
        frameItems.forEach(item => {
            // Find the alt text from the image inside the item
            const frameAltText = item.querySelector('.frame-thumb').alt.toLowerCase();
            
            if (frameAltText.includes(searchTerm)) {
                // Show the whole frame item
                item.style.display = 'flex';
            } else {
                // Hide the whole frame item
                item.style.display = 'none';
            }
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
            // ✅ Keep original resolution
            const canvas = document.createElement('canvas');
            canvas.width = imgPhoto.naturalWidth;
            canvas.height = imgPhoto.naturalHeight;
            const ctx = canvas.getContext('2d');

            // Draw original image and frame
            ctx.drawImage(imgPhoto, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgFrame, 0, 0, canvas.width, canvas.height);

            // ✅ Export at best quality
            canvas.toBlob(blob => {
                const link = document.createElement('a');
                link.download = `framed-image-${Date.now()}.jpg`;
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
                showMessage("Image downloaded in original HD quality!");
            }, 'image/jpeg', 1.0); // full quality
        }
    }

    imgPhoto.onload = checkLoaded;
    imgFrame.onload = checkLoaded;
    imgPhoto.src = userPhotoSrc;
    imgFrame.src = selectedFrameSrc;
});

showMessage("Upload a photo to begin!");
});

/*
// Get the login form element
const loginForm = document.getElementById('login-form');

// Add an event listener for the form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevents the default form submission behavior

  // Get the username and password from the form inputs
  const username = e.target.username.value;
  const password = e.target.password.value;

  try {
    // Send a POST request to your live backend server
    const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Login successful:', data);
      // Handle a successful login (e.g., redirect or show a success message)
    } else {
      console.error('Login failed:', data.error);
      // Handle a failed login (e.g., show an error message to the user)
    }
  } catch (error) {
    console.error('Error during login:', error);
  }
});

// The UI code you provided is also correct and can be included as well.
const container = document.querySelector('.logincontainer');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
})

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
})*/



/*
// Get the form elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const container = document.querySelector('.logincontainer');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

// UI Toggling
registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

// Registration Form Submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmpassword.value;

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Log the data being sent to the backend
    console.log('Attempting registration with:', { username, password });

    try {
        const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        // Log the full response object
        console.log('Received response:', response);

        const data = await response.json();
        
        if (response.ok) {
            console.log('Registration successful:', data);
            alert('Registration successful!');
            // You might want to redirect the user or show a success message
        } else {
            console.error('Registration failed:', data.error);
            console.error('Full response data:', data);
            console.error('Response status:', response.status); // Log the HTTP status code
            alert(`Registration failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again later.');
    }
});


// ------------------
// Login Form
// ------------------
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    console.log('Attempting login with:', { username, password });

    try {
        const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login successful:', data);

            // ✅ Save token
            localStorage.setItem('token', data.token);

            alert('Login successful!');
            // Example: redirect to dashboard
            window.location.href = "/dashboard.html";
        } else {
            console.error('Login failed:', data.error);
            alert(`Login failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login. Please try again later.');
    }
});

// ------------------
// Example: Fetch Profile
// ------------------
async function getProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in first.');
        return;
    }

    try {
        const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        console.log('Profile:', data);
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
}

// ------------------
// Logout Function
// ------------------
function logout() {
    localStorage.removeItem('token');
    alert('You have been logged out.');
    window.location.href = "/"; // back to home/login page
}*/



// Get the form elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const container = document.querySelector('.logincontainer');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

// UI Toggling
registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});
// Registration Form Submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Log the data being sent to the backend
    console.log('Attempting registration with:', { username, password });

    try {
        const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        // Log the full response object
        console.log('Received response:', response);

        const data = await response.json();
        
        if (response.ok) {
            console.log('Registration successful:', data);
            alert('Registration successful!');
            // You might want to redirect the user or show a success message
        } else {
            console.error('Registration failed:', data.error);
            console.error('Full response data:', data);
            console.error('Response status:', response.status); // Log the HTTP status code
            alert(`Registration failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again later.');
    }
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    // Log the data being sent to the backend
    console.log('Attempting login with:', { username, password });

    try {
      const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        // Log the full response object
        console.log('Received response:', response);

        const data = await response.json();

        if (response.ok) {
            console.log('Login successful:', data);
            alert('Login successful!');
            // Handle successful login (e.g., redirect to dashboard)
        } else {
            console.error('Login failed:', data.error);
            console.error('Full response data:', data);
            console.error('Response status:', response.status); // Log the HTTP status code
            alert(`Login failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login. Please try again later.');
    }
});

/*
// Registration Form Submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    console.log('Attempting registration with:', { username, password });

    try {
        const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Registration successful:', data);
            alert('Registration successful! You can now log in.');
            container.classList.remove('active'); // Switch to the login view
        } else {
            console.error('Registration failed:', data.error);
            console.error('Full response:', response);
            alert(`Registration failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again later.');
    }
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    // Log the data being sent to the backend
    console.log('Attempting login with:', { username, password });

    try {
      const response = await fetch('https://pixelpop-backend-fm6t.onrender.com/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        // Log the full response object
        console.log('Received response:', response);

        const data = await response.json();

        if (response.ok) {
            console.log('Login successful:', data);
            alert('Login successful!');
            // Handle successful login (e.g., redirect to dashboard)
        } else {
            console.error('Login failed:', data.error);
            console.error('Full response data:', data);
            console.error('Response status:', response.status); // Log the HTTP status code
            alert(`Login failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login. Please try again later.');
    }
});
*/



