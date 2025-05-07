const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    let body = '';

    // collect body manually (karena Vercel tidak pakai body-parser default)
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid JSON input' });
      }

      const { images } = parsed;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'No images provided or invalid format' });
      }

      const pdfDoc = await PDFDocument.create();

      for (const base64String of images) {
        try {
          const base64Data = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          const processedImageBuffer = await sharp(imageBuffer)
            .resize({ width: 595, fit: 'contain' }) // A4 width
            .toBuffer();

          const imageFormat = await sharp(imageBuffer).metadata().then(m => m.format);

          let image;
          if (imageFormat === 'jpeg' || imageFormat === 'jpg') {
            image = await pdfDoc.embedJpg(processedImageBuffer);
          } else {
            image = await pdfDoc.embedPng(processedImageBuffer);
          }

          const page = pdfDoc.addPage([595, 842]); // A4 size
          const { width, height } = image.scale(1);

          page.drawImage(image, {
            x: (595 - width) / 2,
            y: (842 - height) / 2,
            width,
            height
          });

        } catch (imgErr) {
          console.error('Error processing image:', imgErr);
          continue;
        }
      }

      const pdfBytes = await pdfDoc.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
      res.send(Buffer.from(pdfBytes));
    });

  } catch (error) {
    console.error('Error during conversion:', error);
    res.status(500).json({ error: 'Failed to convert images to PDF' });
  }
};