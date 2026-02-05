import Head from "next/head";
import { useState, useRef } from "react";

export default function Home() {
  const [images, setImages] = useState([]);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("document");

  const handleFiles = (files) => {
    const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));

    if (fileArray.length === 0) {
      alert("Pilih gambar yang valid!");
      return;
    }

    const newImages = fileArray.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("highlight");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("highlight");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("highlight");
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setImages([]);
    setPdfPreview(null);
  };

  const convertToPDF = async () => {
    if (images.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      images.forEach((img) => {
        formData.append("images", img.file);
      });

      const response = await fetch("/api/convert-multi", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Conversion failed");
      }

      const blob = await response.blob();
      const previewUrl = URL.createObjectURL(blob);
      setPdfPreview(previewUrl);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!pdfPreview) return;

    try {
      const response = await fetch(pdfPreview);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Error downloading: " + error.message);
    }
  };

  return (
    <>
      <Head>
        <title>My PDF</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#FF3366',
                  secondary: '#3300FF',
                  accent: '#33FFCC',
                },
                fontFamily: {
                  mono: ['Space Mono', 'monospace']
                },
                boxShadow: {
                  'brutal': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
                }
              }
            }
          }
        `,
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`
          body { font-family: 'Space Mono', monospace; background-color: #f5f5f5; }
          .brutal-border { border: 3px solid #000; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); }
          .brutal-btn { transition: transform 0.1s ease-in-out; }
          .brutal-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px 0px rgba(0,0,0,1); }
          .brutal-btn:active { transform: translate(2px,2px); box-shadow: 2px 2px 0px 0px rgba(0,0,0,1); }
          .drop-area.highlight { background-color: #fef3c7; }
          .image-preview { max-height: 150px; object-fit: contain; }
          #pdf-canvas { max-width: 100%; border: 2px solid #000; }
        `}</style>
      </Head>

      <main className="min-h-screen bg-accent bg-opacity-10">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-2">IMAGE → PDF</h1>
            <p className="text-xl md:text-2xl font-mono">Convert your images to a beautiful PDF file</p>
          </header>

          {!pdfPreview ? (
            <>
              <div className="brutal-border bg-white p-6 mb-8">
                <div id="drop-area" className="brutal-border border-dashed p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                  <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="text-lg mb-2">Drag &amp; Drop your images here</p>
                  <p className="text-sm text-gray-500 mb-4">or</p>
                  <label className="brutal-border brutal-btn inline-block px-6 py-3 bg-primary text-white font-bold cursor-pointer">
                    BROWSE FILES
                    <input ref={fileInputRef} type="file" multiple accept="image/jpeg, image/png, image/webp" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </label>
                </div>
              </div>

              {images.length > 0 && (
                <div className="brutal-border bg-white p-6 mb-8">
                  <h2 className="text-2xl font-bold mb-4">IMAGE PREVIEW ({images.length})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative brutal-border bg-gray-100 p-2">
                        <img src={img.preview} alt={img.name} className="image-preview w-full h-32 mx-auto" />
                        <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-700">
                          ✕
                        </button>
                        <p className="text-xs mt-2 truncate">{img.name}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={clearAll} className="brutal-border brutal-btn px-4 py-2 bg-gray-200 font-bold hover:bg-gray-300">
                      CLEAR ALL
                    </button>
                    <p className="text-sm font-bold">{images.length} gambar dipilih</p>
                  </div>
                </div>
              )}

              <div className="text-center">
                <button onClick={convertToPDF} disabled={images.length === 0 || loading} className="brutal-border brutal-btn px-8 py-4 bg-secondary text-white text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? "CONVERTING..." : "CONVERT TO PDF"}
                </button>
              </div>
            </>
          ) : (
            <div className="brutal-border bg-white p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">PDF PREVIEW</h2>
              <div className="mb-4 overflow-auto bg-gray-100 p-4 rounded">
                <iframe src={pdfPreview} width="100%" height="600" className="border-2 border-black"></iframe>
              </div>

              <div className="mb-6 p-4 brutal-border bg-yellow-50">
                <label className="block text-sm font-bold mb-2">Nama File:</label>
                <div className="flex gap-2">
                  <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="flex-1 px-3 py-2 border-2 border-black font-bold" placeholder="Enter filename" />
                  <span className="px-3 py-2 font-bold">.pdf</span>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setPdfPreview(null);
                    setImages([]);
                  }}
                  className="brutal-border brutal-btn px-6 py-3 bg-gray-400 text-white font-bold"
                >
                  UPLOAD ULANG
                </button>
                <button onClick={downloadPDF} className="brutal-border brutal-btn px-6 py-3 bg-primary text-white font-bold">
                  DOWNLOAD PDF
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="py-6 mt-12 bg-white brutal-border-t-2 border-t-2 border-black">
          <div className="container mx-auto px-4 text-center">
            <p className="font-mono text-sm">Created by Senshiner</p>
          </div>
        </footer>

        <script src="/app.js"></script>
      </main>
    </>
  );
}
