
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/jpeg') || file.mimetype.startsWith('image/png')) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG files are allowed!'), false);
    }
  }
});

// API endpoint for converting a single image to PDF
app.post('/api/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Optional custom filename from request
    const customFilename = req.body.filename || 'converted';
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Process the uploaded image
    const imagePath = req.file.path;
    
    // Process image with sharp
    const imageBuffer = await sharp(imagePath)
      .resize({ width: 595, fit: 'contain' }) // A4 width in points
      .toBuffer();
    
    // Determine image type and embed it
    let image;
    if (req.file.mimetype === 'image/jpeg') {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else {
      image = await pdfDoc.embedPng(imageBuffer);
    }
    
    // Add a new page to the PDF
    const page = pdfDoc.addPage([595, 842]); // A4 size in points
    
    // Calculate dimensions to fit image proportionally
    const dimensions = image.scale(1);
    const { width, height } = dimensions;
    
    // Draw the image centered on the page
    page.drawImage(image, {
      x: (page.getWidth() - width) / 2,
      y: (page.getHeight() - height) / 2,
      width,
      height,
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Clean up the temporary file
    fs.unlinkSync(imagePath);
    
    // Set headers for PDF download with custom filename
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${customFilename}.pdf"`);
    
    // Send the PDF directly as the response
    res.end(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error during conversion:', error);
    res.status(500).json({ error: 'Failed to convert image to PDF' });
  }
});

// Convert multiple images to PDF endpoint
app.post('/convert', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Process each uploaded image
    for (const file of req.files) {
      const imagePath = file.path;
      
      // Process image with sharp (resize if needed)
      const imageBuffer = await sharp(imagePath)
        .resize({ width: 595, fit: 'contain' }) // A4 width in points
        .toBuffer();
      
      // Determine image type and embed it
      let image;
      if (file.mimetype === 'image/jpeg') {
        image = await pdfDoc.embedJpg(imageBuffer);
      } else {
        image = await pdfDoc.embedPng(imageBuffer);
      }
      
      // Add a new page to the PDF
      const page = pdfDoc.addPage([595, 842]); // A4 size in points
      
      // Calculate dimensions to fit image proportionally
      const dimensions = image.scale(1);
      const { width, height } = dimensions;
      
      // Draw the image centered on the page
      page.drawImage(image, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });
      
      // Clean up the temporary file
      fs.unlinkSync(imagePath);
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create PDF directory if it doesn't exist
    const pdfDir = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }
    
    // Save PDF to disk
    const pdfPath = path.join(pdfDir, `converted-${Date.now()}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=converted.pdf`);
    
    // Send the PDF file
    res.sendFile(pdfPath, {}, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      
      // Delete the PDF file after it's sent
      fs.unlinkSync(pdfPath);
    });
    
  } catch (error) {
    console.error('Error during conversion:', error);
    res.status(500).json({ error: 'Failed to convert images to PDF' });
  }
});

// Create uploads and pdfs directories if they don't exist
const dirs = ['uploads', 'pdfs', 'public'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
