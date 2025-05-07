app.post('/api/convert', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
  try {
    const buffer = req.body;

    if (!buffer || !Buffer.isBuffer(buffer)) {
      return res.status(400).json({ error: 'Invalid image buffer' });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Process image with sharp
    const imageBuffer = await sharp(buffer)
      .resize({ width: 595, fit: 'contain' }) // A4 width
      .toBuffer();

    // Detect image format
    const metadata = await sharp(buffer).metadata();
    let image;
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else if (metadata.format === 'png') {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      return res.status(400).json({ error: 'Unsupported image format' });
    }

    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = image.scale(1);

    page.drawImage(image, {
      x: (595 - width) / 2,
      y: (842 - height) / 2,
      width,
      height
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ error: 'Failed to convert image' });
  }
});