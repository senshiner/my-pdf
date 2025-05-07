app.post('/api/convert', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
  try {
    const buffer = req.body;

    if (!buffer || !Buffer.isBuffer(buffer)) {
      return res.status(400).json({ error: 'Invalid image buffer' });
    }

    // Cek metadata gambar
    const metadata = await sharp(buffer).metadata();
    if (!['jpeg', 'png'].includes(metadata.format)) {
      return res.status(400).json({ error: 'Only JPEG and PNG are supported' });
    }

    // Resize gambar ke lebar A4 (595pt)
    const resizedBuffer = await sharp(buffer)
      .resize({ width: 595, fit: 'contain' })
      .toBuffer();

    const pdfDoc = await PDFDocument.create();
    let image;

    if (metadata.format === 'jpeg') {
      image = await pdfDoc.embedJpg(resizedBuffer);
    } else {
      image = await pdfDoc.embedPng(resizedBuffer);
    }

    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = image.scale(1);

    page.drawImage(image, {
      x: (595 - width) / 2,
      y: (842 - height) / 2,
      width,
      height,
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ error: 'Failed to convert image' });
  }
});