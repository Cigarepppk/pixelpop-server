




/*
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8000;

// Middleware to parse incoming request bodies
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Create the public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Create an images directory inside public
const imagesDir = path.join(publicDir, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// Endpoint to handle image uploads
app.post('/api/upload', (req, res) => {
    // Get the base64 image data from the request body
    const imageData = req.body.image;

    // Check if image data is present
    if (!imageData) {
        return res.status(400).json({ error: 'No image data received.' });
    }

    // Generate a unique filename
    const filename = `photo-${Date.now()}.jpeg`;
    const filepath = path.join(imagesDir, filename);

    // Remove the data URI part ("data:image/jpeg;base64,")
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

    // Write the base64 data to a file
    fs.writeFile(filepath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('File write error:', err);
            return res.status(500).json({ error: 'Failed to save image.' });
        }

        // Construct the public URL for the image
        const publicUrl = `http://localhost:${port}/images/${filename}`;

        // Send the public URL back to the client
        res.status(200).json({ url: publicUrl });
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Open http://localhost:${port} in your browser to see your website.`);
});


















const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '10mb' })); // allow big base64 images

// Upload generated image from client
app.post('/save-image', (req, res) => {
    const { imageData } = req.body;
    if (!imageData) {
        return res.status(400).send('No image data provided');
    }

    // Remove the "data:image/png;base64," prefix
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    const filePath = path.join(__dirname, 'public', 'generated.png');

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error("Error saving image:", err);
            return res.status(500).send("Error saving image");
        }
        res.json({ downloadUrl: '/download-generated' });
    });
});

// Route to download saved image
app.get('/download-generated', (req, res) => {
    const file = path.join(__dirname, 'public', 'generated.png');
    res.download(file, 'framed-photo.png', (err) => {
        if (err) {
            console.error("Error downloading generated image:", err);
            res.status(500).send("Error downloading generated image");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
*/












/*
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// ✅ Use Render's dynamic port or fallback to 8000 for local dev
const port = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static files from "public"
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Ensure "public" and "public/images" exist
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
const imagesDir = path.join(publicDir, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

// ✅ Image upload endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { imageData, fileName } = req.body;

    if (!imageData || !fileName) {
      return res.status(400).json({ error: 'Missing imageData or fileName' });
    }

    // Save image
    const filePath = path.join(imagesDir, fileName);
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    // Public URL
    const imageUrl = `/images/${fileName}`;

    res.json({ success: true, url: imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
*/

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// ✅ Use Render's dynamic port or fallback to 8000 for local dev
const port = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));

// Ensure "public" and "public/images" exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}
const imagesDir = path.join(publicDir, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// ✅ CORRECT: Serve files from the 'public/images' directory at the '/images' URL path
app.use('/images', express.static(imagesDir));

// ✅ Image upload endpoint
app.post('/api/upload', (req, res) => {
    try {
        const { imageData, fileName } = req.body;

        if (!imageData || !fileName) {
            return res.status(400).json({ error: 'Missing imageData or fileName' });
        }

        // Save image
        const filePath = path.join(imagesDir, fileName);
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        // Public URL
        const imageUrl = `/images/${fileName}`;

        res.json({ success: true, url: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Image upload failed' });
    }
});

// ✅ Start server
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
