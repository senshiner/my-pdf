import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), "tmp"),
      keepExtensions: true,
      multiples: true,
    });

    if (!fs.existsSync(form.uploadDir)) {
      fs.mkdirSync(form.uploadDir, { recursive: true });
    }

    form.parse(req, async (err, fields, files) => {
      if (err) return reject(err);
      return resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    const imageFiles = Array.isArray(files.images) ? files.images : files.images ? [files.images] : [];

    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of imageFiles) {
      try {
        const fileBuffer = fs.readFileSync(file.filepath);
        const processedImageBuffer = await sharp(fileBuffer).resize({ width: 595, fit: "contain" }).toBuffer();

        const imageMetadata = await sharp(fileBuffer).metadata();
        const imageFormat = imageMetadata.format;

        let image;
        if (imageFormat === "jpeg" || imageFormat === "jpg") {
          image = await pdfDoc.embedJpg(processedImageBuffer);
        } else if (imageFormat === "png") {
          image = await pdfDoc.embedPng(processedImageBuffer);
        } else if (imageFormat === "webp") {
          const pngBuffer = await sharp(processedImageBuffer).png().toBuffer();
          image = await pdfDoc.embedPng(pngBuffer);
        }

        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = image.scale(1);

        page.drawImage(image, {
          x: (595 - width) / 2,
          y: (842 - height) / 2,
          width,
          height,
        });

        fs.unlinkSync(file.filepath);
      } catch (imgErr) {
        console.error("Error processing image:", imgErr);
      }
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="preview.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Error during conversion:", error);
    return res.status(500).json({ error: "Failed to convert images to PDF", details: error.message });
  }
}
