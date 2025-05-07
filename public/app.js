document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const imagesPreview = document.getElementById('images-preview');
  const convertBtn = document.getElementById('convert-btn');
  const clearBtn = document.getElementById('clear-btn');
  const imageCountElement = document.getElementById('image-count');
  const loadingElement = document.getElementById('loading');

  let selectedFiles = [];

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, e => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(event => {
    dropArea.addEventListener(event, () => dropArea.classList.add('highlight'), false);
  });

  ['dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, () => dropArea.classList.remove('highlight'), false);
  });

  dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  function handleFiles(files) {
    const valid = Array.from(files).filter(file => /image\/(jpeg|png)/.test(file.type));
    if (valid.length === 0) return;

    selectedFiles = [...selectedFiles, ...valid];
    updateImageCount();
    previewContainer.classList.remove('hidden');
    convertBtn.disabled = false;
    valid.forEach(displayPreview);
  }

  function displayPreview(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const div = document.createElement('div');
      div.className = 'brutal-border p-3 bg-white relative';

      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'image-preview mx-auto mb-2';
      img.alt = file.name;

      const name = document.createElement('p');
      name.className = 'text-xs truncate font-mono';
      name.textContent = file.name;

      const size = document.createElement('p');
      size.className = 'text-xs text-gray-500 font-mono';
      size.textContent = formatFileSize(file.size);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'absolute top-1 right-1 brutal-border p-1 bg-red-500 text-white text-xs';
      removeBtn.textContent = 'X';
      removeBtn.onclick = () => {
        const i = selectedFiles.findIndex(f => f.name === file.name && f.size === file.size);
        if (i > -1) selectedFiles.splice(i, 1);
        div.remove();
        updateImageCount();
        if (selectedFiles.length === 0) {
          previewContainer.classList.add('hidden');
          convertBtn.disabled = true;
        }
      };

      div.append(img, name, size, removeBtn);
      imagesPreview.appendChild(div);
    };
    reader.readAsDataURL(file);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function updateImageCount() {
    imageCountElement.textContent = `${selectedFiles.length} image${selectedFiles.length !== 1 ? 's' : ''} selected`;
  }

  clearBtn.addEventListener('click', () => {
    selectedFiles = [];
    imagesPreview.innerHTML = '';
    previewContainer.classList.add('hidden');
    convertBtn.disabled = true;
    updateImageCount();
  });

  convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    loadingElement.classList.remove('hidden');
    convertBtn.disabled = true;

    try {
      const images = await Promise.all(selectedFiles.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }));

      const response = await fetch('/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to convert images');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted.pdf';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      loadingElement.classList.add('hidden');
      convertBtn.disabled = false;
    }
  });
});