
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').json({ error: 'Method Not Allowed' });
  }

  try {
    // Check if we have a buffer in the request body
    if (!req.body) {
      return res.status(400).json({ error: 'No image data received' });
    }
    
    let imageBuffer;
    
    // Handle different input types
    if (Buffer.isBuffer(req.body)) {
      // Direct buffer
      imageBuffer = req.body;
    } else if (typeof req.body === 'object' && req.body.buffer) {
      // Object with buffer property
      imageBuffer = req.body.buffer;
    } else if (typeof req.body === 'string') {
      // Base64 string
      try {
        imageBuffer = Buffer.from(req.body.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      } catch (e) {
        return res.status(400).json({ error: 'Invalid base64 image data' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported image format' });
    }
    
    // Process the image buffer
    try {
      // Detect mime type from buffer
      const fileType = await sharp(imageBuffer).metadata();
      const mimeType = `image/${fileType.format}`;
      
      // Resize the image to fit in a PDF
      const processedImageBuffer = await sharp(imageBuffer)
        .resize({ width: 595, fit: 'contain' })
        .toBuffer();
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Determine image type and embed it
      let image;
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        image = await pdfDoc.embedJpg(processedImageBuffer);
      } else {
        image = await pdfDoc.embedPng(processedImageBuffer);
      }
      
      // Add a new page to the PDF
      const page = pdfDoc.addPage([595, 842]); // A4 size in points
      
      // Calculate dimensions to fit image proportionally
      const { width, height } = image.scale(1);
      
      // Draw the image centered on the page
      page.drawImage(image, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });
      
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
      
      // Send the PDF directly as the response
      return res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error('Error processing image:', error);
      return res.status(400).json({ error: 'Invalid image data or unsupported format' });
    }
  } catch (error) {
    console.error('Error during conversion:', error);
    return res.status(500).json({ error: 'Failed to convert image to PDF', details: error.message });
  }
};
