document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const imagesPreview = document.getElementById('images-preview');
  const convertBtn = document.getElementById('convert-btn');
  const clearBtn = document.getElementById('clear-btn');
  const imageCountElement = document.getElementById('image-count');
  const loadingElement = document.getElementById('loading');

  // Track selected files
  let selectedFiles = [];

  // Prevent defaults for drag events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop area when dragging over it
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropArea.classList.add('highlight');
  }

  function unhighlight() {
    dropArea.classList.remove('highlight');
  }

  // Handle dropped files
  dropArea.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }

  // Handle file input change
  fileInput.addEventListener('change', function() {
    handleFiles(this.files);
  });

  // Process the selected files
  function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
      return file.type === 'image/jpeg' || file.type === 'image/png';
    });

    if (validFiles.length === 0) return;

    // Add new files to selected files
    selectedFiles = [...selectedFiles, ...validFiles];

    // Update UI
    updateImageCount();
    previewContainer.classList.remove('hidden');
    convertBtn.disabled = false;

    // Display previews
    validFiles.forEach(file => {
      displayPreview(file);
    });
  }

  // Create and display image preview
  function displayPreview(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
      const previewContainer = document.createElement('div');
      previewContainer.className = 'brutal-border p-3 bg-white relative';

      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'image-preview mx-auto mb-2';
      img.alt = file.name;

      const nameElement = document.createElement('p');
      nameElement.className = 'text-xs truncate font-mono';
      nameElement.textContent = file.name;

      const sizeElement = document.createElement('p');
      sizeElement.className = 'text-xs text-gray-500 font-mono';
      sizeElement.textContent = formatFileSize(file.size);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'absolute top-1 right-1 brutal-border p-1 bg-red-500 text-white text-xs';
      removeBtn.textContent = 'X';
      removeBtn.addEventListener('click', () => {
        // Remove file from selectedFiles
        const fileIndex = selectedFiles.findIndex(f => f.name === file.name && f.size === file.size);
        if (fileIndex > -1) {
          selectedFiles.splice(fileIndex, 1);
        }

        // Remove preview
        previewContainer.remove();

        // Update UI
        updateImageCount();
        if (selectedFiles.length === 0) {
          previewContainer.classList.add('hidden');
          convertBtn.disabled = true;
        }
      });

      previewContainer.appendChild(img);
      previewContainer.appendChild(nameElement);
      previewContainer.appendChild(sizeElement);
      previewContainer.appendChild(removeBtn);

      imagesPreview.appendChild(previewContainer);
    };

    reader.readAsDataURL(file);
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // Update image count display
  function updateImageCount() {
    imageCountElement.textContent = `${selectedFiles.length} image${selectedFiles.length !== 1 ? 's' : ''} selected`;
  }

  // Clear all selected images
  clearBtn.addEventListener('click', () => {
    selectedFiles = [];
    imagesPreview.innerHTML = '';
    previewContainer.classList.add('hidden');
    convertBtn.disabled = true;
    updateImageCount();
  });

  // Convert images to PDF
  convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    // Show loading indicator
    loadingElement.classList.remove('hidden');
    convertBtn.disabled = true;

    // Create FormData with selected files
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      // Send files to server
      const response = await fetch('/convert', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert images');
      }

      // Get the PDF as a blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'converted.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error converting images:', error);
      alert('Failed to convert images: ' + error.message);
    } finally {
      // Hide loading indicator
      loadingElement.classList.add('hidden');
      convertBtn.disabled = false;
    }
  });
});