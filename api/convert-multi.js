
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').json({ error: 'Method Not Allowed' });
  }

  try {
    // Handle request body
    let body;
    
    // If body is not parsed yet and is streaming
    if (!req.body && req.readable) {
      let data = '';
      await new Promise((resolve) => {
        req.on('data', chunk => {
          data += chunk;
        });
        req.on('end', () => {
          resolve();
        });
        body = data;
      });
    } else {
      // For pre-parsed bodies
      body = req.body;
    }
    
    // Parse the body
    let parsedBody;
    try {
      parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      console.error('JSON parsing error:', e);
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    
    const { images } = parsedBody;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided or invalid format' });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Process each image in the array
    for (const base64String of images) {
      try {
        // Extract the base64 data
        const base64Data = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Process image with sharp
        const processedImageBuffer = await sharp(imageBuffer)
          .resize({ width: 595, fit: 'contain' }) // A4 width in points
          .toBuffer();
        
        // Determine image type
        const imageFormat = await sharp(imageBuffer).metadata().then(m => m.format);
        
        let image;
        if (imageFormat === 'jpeg' || imageFormat === 'jpg') {
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
          x: (595 - width) / 2,
          y: (842 - height) / 2,
          width,
          height
        });
      } catch (imgErr) {
        console.error('Error processing image:', imgErr);
        // Continue to next image
      }
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="result.pdf"');
    
    // Send the PDF
    return res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error during conversion:', error);
    return res.status(500).json({ error: 'Failed to convert images to PDF' });
  }
};
