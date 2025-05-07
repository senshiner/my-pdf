
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided or invalid format' });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Process each image in the array
    for (const base64String of images) {
      try {
        // Extract the base64 data (remove data:image/jpeg;base64, prefix if present)
        const base64Data = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Process image with sharp
        const processedImageBuffer = await sharp(imageBuffer)
          .resize({ width: 595, fit: 'contain' }) // A4 width in points
          .toBuffer();
        
        // Determine image type based on buffer header and embed it
        const imageFormat = await sharp(imageBuffer).metadata().then(metadata => metadata.format);
        
        let image;
        if (imageFormat === 'jpeg') {
          image = await pdfDoc.embedJpg(processedImageBuffer);
        } else {
          image = await pdfDoc.embedPng(processedImageBuffer);
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
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        // Continue with the next image instead of failing the entire process
      }
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="result.pdf"');
    
    // Send the PDF directly as response
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error during conversion:', error);
    res.status(500).json({ error: 'Failed to convert images to PDF' });
  }
};
