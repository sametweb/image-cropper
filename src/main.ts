import './index.css';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

class StudioCropper {
  private step: 'upload' | 'crop' | 'export' = 'upload';
  private image: string | null = null;
  private imageSize = { width: 0, height: 0 };
  private cropArea: CropArea = { x: 0, y: 0, width: 400, height: 300 };
  private aspectLocked = true;

  // Elements
  private views = {
    upload: document.getElementById('upload-view')!,
    crop: document.getElementById('crop-view')!,
    export: document.getElementById('export-view')!
  };
  private backBtn = document.getElementById('back-btn')!;
  private statusText = document.getElementById('status-text')!;
  private dropzone = document.getElementById('dropzone')!;
  private fileInput = document.getElementById('file-input') as HTMLInputElement;
  private sourceImage = document.getElementById('source-image') as HTMLImageElement;
  private cropOverlay = document.getElementById('crop-overlay')!;
  private widthInput = document.getElementById('width-input') as HTMLInputElement;
  private heightInput = document.getElementById('height-input') as HTMLInputElement;
  private lockBtn = document.getElementById('lock-btn')!;
  private presetsGrid = document.getElementById('presets-grid')!;
  private renderBtn = document.getElementById('render-btn')!;
  private croppedImage = document.getElementById('cropped-image') as HTMLImageElement;
  private exportMeta = document.getElementById('export-meta')!;
  private resetBtn = document.getElementById('reset-btn')!;
  private downloadLink = document.getElementById('download-link') as HTMLAnchorElement;

  constructor() {
    this.initEventListeners();
  }

  private initEventListeners() {
    // File Upload
    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleFile(file);
    });

    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('border-primary', 'bg-surface-hover');
    });

    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('border-primary', 'bg-surface-hover');
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('border-primary', 'bg-surface-hover');
      const file = (e as DragEvent).dataTransfer?.files[0];
      if (file) this.handleFile(file);
    });

    // Navigation
    this.backBtn.addEventListener('click', () => {
      if (this.step === 'export') this.setStep('crop');
      else if (this.step === 'crop') this.setStep('upload');
    });

    // Dimensions
    this.widthInput.addEventListener('input', () => {
      const val = parseInt(this.widthInput.value) || 0;
      this.updateCropArea({ width: val });
      if (this.aspectLocked) {
        const ratio = this.cropArea.height / this.cropArea.width;
        this.updateCropArea({ height: Math.round(val * ratio) });
      }
      this.renderOverlay();
    });

    this.heightInput.addEventListener('input', () => {
      const val = parseInt(this.heightInput.value) || 0;
      this.updateCropArea({ height: val });
      if (this.aspectLocked) {
        const ratio = this.cropArea.width / this.cropArea.height;
        this.updateCropArea({ width: Math.round(val * ratio) });
      }
      this.renderOverlay();
    });

    this.lockBtn.addEventListener('click', () => {
      this.aspectLocked = !this.aspectLocked;
      this.lockBtn.classList.toggle('bg-primary/10', this.aspectLocked);
      this.lockBtn.classList.toggle('border-primary', this.aspectLocked);
      this.lockBtn.classList.toggle('text-primary', this.aspectLocked);
    });

    this.presetsGrid.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (btn && btn.dataset.ratio) {
        this.applyAspectRatio(btn.dataset.ratio);
      }
    });

    // Actions
    this.renderBtn.addEventListener('click', () => this.renderCrop());
    this.resetBtn.addEventListener('click', () => this.setStep('upload'));
  }

  private handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.image = result;
      this.sourceImage.src = result;

      const img = new Image();
      img.onload = () => {
        this.imageSize = { width: img.width, height: img.height };
        const initialWidth = Math.min(img.width * 0.8, 800);
        const initialHeight = Math.min(img.height * 0.8, 600);
        this.cropArea = {
          x: (img.width - initialWidth) / 2,
          y: (img.height - initialHeight) / 2,
          width: initialWidth,
          height: initialHeight
        };
        this.setStep('crop');
        this.renderOverlay();
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  private setStep(step: typeof this.step) {
    this.step = step;
    Object.values(this.views).forEach(v => v.classList.add('hidden'));
    this.views[step].classList.remove('hidden');

    this.backBtn.classList.toggle('hidden', step === 'upload');
    
    const statusMap = {
      upload: 'LOCAL PROCESSING ONLY',
      crop: 'ACTIVE CROPPER',
      export: 'EXPORT PREVIEW'
    };
    this.statusText.textContent = statusMap[step];
  }

  private applyAspectRatio(ratioStr: string) {
    const [wRatio, hRatio] = ratioStr.split(':').map(Number);
    const ratio = wRatio / hRatio;

    let newWidth = this.cropArea.width;
    let newHeight = newWidth / ratio;

    if (newHeight > this.imageSize.height) {
      newHeight = this.imageSize.height;
      newWidth = newHeight * ratio;
    }
    
    if (newWidth > this.imageSize.width) {
      newWidth = this.imageSize.width;
      newHeight = newWidth / ratio;
    }

    // Centering
    const newX = (this.imageSize.width - newWidth) / 2;
    const newY = (this.imageSize.height - newHeight) / 2;

    this.updateCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
    this.renderOverlay();
    
    // Auto-lock aspect ratio if a preset is selected
    if (!this.aspectLocked) {
      this.lockBtn.click();
    }
  }

  private updateCropArea(updates: Partial<CropArea>) {
    this.cropArea = { ...this.cropArea, ...updates };
    this.widthInput.value = Math.round(this.cropArea.width).toString();
    this.heightInput.value = Math.round(this.cropArea.height).toString();
  }

  private renderOverlay() {
    const { x, y, width, height } = this.cropArea;
    const { width: imgW, height: imgH } = this.imageSize;

    this.cropOverlay.style.left = `${(x / imgW) * 100}%`;
    this.cropOverlay.style.top = `${(y / imgH) * 100}%`;
    this.cropOverlay.style.width = `${(width / imgW) * 100}%`;
    this.cropOverlay.style.height = `${(height / imgH) * 100}%`;

    this.widthInput.value = Math.round(width).toString();
    this.heightInput.value = Math.round(height).toString();
  }

  private renderCrop() {
    if (!this.image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = this.cropArea.width;
      canvas.height = this.cropArea.height;
      
      ctx.drawImage(
        img,
        this.cropArea.x, this.cropArea.y, this.cropArea.width, this.cropArea.height,
        0, 0, this.cropArea.width, this.cropArea.height
      );
      
      const dataUrl = canvas.toDataURL('image/png');
      this.croppedImage.src = dataUrl;
      this.downloadLink.href = dataUrl;
      this.downloadLink.download = 'studio-crop.png';
      this.exportMeta.textContent = `${Math.round(this.cropArea.width)}x${Math.round(this.cropArea.height)} • PNG • LOCAL`;
      this.setStep('export');
    };
    img.src = this.image;
  }
}

new StudioCropper();
