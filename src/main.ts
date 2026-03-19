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
  private lockedRatio = 1;
  private isDragging = false;
  private activeHandle: string | null = null;
  private dragStart = { x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 };

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

  // Branding Elements
  private appNameEl = document.getElementById('app-name')!;
  private heroTitleEl = document.getElementById('hero-title')!;
  private heroDescEl = document.getElementById('hero-desc')!;

  constructor() {
    this.setupBranding();
    this.initEventListeners();
  }

  private setupBranding() {
    const hostname = window.location.hostname;
    let name = 'Studio Cropper';
    let title = 'Drag and drop your image here';
    let desc = 'Zero-friction local file processing. Total privacy. Supports JPG, PNG, WEBP.';
    let metaDesc = 'A professional-grade local image cropping tool with a technical studio aesthetic. Zero-friction, total privacy.';

    if (hostname.includes('onlineimagecropper.com')) {
      name = 'Online Image Cropper';
      title = 'Fastest Online Image Cropper';
      desc = 'The fastest way to crop images online. Zero-friction local file processing. Total privacy.';
      metaDesc = 'Crop images online instantly with Online Image Cropper. Fast, local processing, and 100% private.';
    } else if (hostname.includes('photocroptool.com')) {
      name = 'Photo Crop Tool';
      title = 'Professional Photo Crop Tool';
      desc = 'Professional photo cropping tool for everyone. Zero-friction local file processing. Total privacy.';
      metaDesc = 'Professional photo cropping tool for everyone. Crop your photos with precision using Photo Crop Tool.';
    }

    this.appNameEl.textContent = name;
    this.heroTitleEl.textContent = title;
    this.heroDescEl.textContent = desc;
    document.title = name;

    // Update Meta Tags
    const metaDescEl = document.getElementById('meta-desc');
    if (metaDescEl) metaDescEl.setAttribute('content', metaDesc);

    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.setAttribute('content', name);

    const ogDesc = document.getElementById('og-desc');
    if (ogDesc) ogDesc.setAttribute('content', metaDesc);

    const twitterTitle = document.getElementById('twitter-title');
    if (twitterTitle) twitterTitle.setAttribute('content', name);

    const twitterDesc = document.getElementById('twitter-desc');
    if (twitterDesc) twitterDesc.setAttribute('content', metaDesc);
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
      if (this.aspectLocked) {
        this.updateCropArea({ width: val, height: val / this.lockedRatio }, 'width');
      } else {
        this.updateCropArea({ width: val }, 'width');
      }
    });

    this.heightInput.addEventListener('input', () => {
      const val = parseInt(this.heightInput.value) || 0;
      if (this.aspectLocked) {
        this.updateCropArea({ height: val, width: val * this.lockedRatio }, 'height');
      } else {
        this.updateCropArea({ height: val }, 'height');
      }
    });

    this.lockBtn.addEventListener('click', () => {
      this.aspectLocked = !this.aspectLocked;
      if (this.aspectLocked && this.cropArea.height > 0) {
        this.lockedRatio = this.cropArea.width / this.cropArea.height;
      }
      this.lockBtn.classList.toggle('bg-primary/10', this.aspectLocked);
      this.lockBtn.classList.toggle('border-primary', this.aspectLocked);
      this.lockBtn.classList.toggle('text-primary', this.aspectLocked);
      
      const icon = this.lockBtn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = this.aspectLocked ? 'link' : 'link_off';
      }
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

    // Dragging
    this.cropOverlay.addEventListener('pointerdown', (e) => {
      if (this.step !== 'crop') return;
      
      const handle = (e.target as HTMLElement).closest('.handle') as HTMLElement;
      if (handle) {
        this.activeHandle = handle.dataset.handle!;
        this.isDragging = false;
      } else {
        this.isDragging = true;
        this.activeHandle = null;
      }

      this.dragStart = {
        x: e.clientX,
        y: e.clientY,
        cropX: this.cropArea.x,
        cropY: this.cropArea.y,
        cropW: this.cropArea.width,
        cropH: this.cropArea.height
      };
      this.cropOverlay.setPointerCapture(e.pointerId);
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging && !this.activeHandle) return;

      const scaleX = this.imageSize.width / this.sourceImage.clientWidth;
      const scaleY = this.imageSize.height / this.sourceImage.clientHeight;

      const dx = (e.clientX - this.dragStart.x) * scaleX;
      const dy = (e.clientY - this.dragStart.y) * scaleY;

      if (this.isDragging) {
        let newX = this.dragStart.cropX + dx;
        let newY = this.dragStart.cropY + dy;

        // Bounds check
        newX = Math.max(0, Math.min(newX, this.imageSize.width - this.cropArea.width));
        newY = Math.max(0, Math.min(newY, this.imageSize.height - this.cropArea.height));

        this.updateCropArea({ x: newX, y: newY });
      } else if (this.activeHandle) {
        let x = this.dragStart.cropX;
        let y = this.dragStart.cropY;
        let width = this.dragStart.cropW;
        let height = this.dragStart.cropH;
        const ratio = this.aspectLocked ? this.lockedRatio : this.dragStart.cropW / this.dragStart.cropH;

        if (this.activeHandle.includes('r')) width = this.dragStart.cropW + dx;
        if (this.activeHandle.includes('l')) {
          width = this.dragStart.cropW - dx;
          x = this.dragStart.cropX + dx;
        }
        if (this.activeHandle.includes('b')) height = this.dragStart.cropH + dy;
        if (this.activeHandle.includes('t')) {
          height = this.dragStart.cropH - dy;
          y = this.dragStart.cropY + dy;
        }

        // Aspect ratio lock
        if (this.aspectLocked) {
          if (Math.abs(dx) > Math.abs(dy)) {
            height = width / ratio;
            if (this.activeHandle.includes('t')) y = this.dragStart.cropY + (this.dragStart.cropH - height);
          } else {
            width = height * ratio;
            if (this.activeHandle.includes('l')) x = this.dragStart.cropX + (this.dragStart.cropW - width);
          }
        }

        // Minimum size
        const minSize = 20;
        if (width < minSize) {
          width = minSize;
          if (this.activeHandle.includes('l')) x = this.dragStart.cropX + (this.dragStart.cropW - minSize);
        }
        if (height < minSize) {
          height = minSize;
          if (this.activeHandle.includes('t')) y = this.dragStart.cropY + (this.dragStart.cropH - minSize);
        }

        // Bounds check
        if (x < 0) {
          width += x;
          x = 0;
        }
        if (y < 0) {
          height += y;
          y = 0;
        }
        if (x + width > this.imageSize.width) width = this.imageSize.width - x;
        if (y + height > this.imageSize.height) height = this.imageSize.height - y;

        // Re-apply aspect ratio if locked after bounds check
        if (this.aspectLocked) {
          if (width / height > ratio) width = height * ratio;
          else height = width / ratio;
        }

        this.updateCropArea({ x, y, width, height });
      }
    });

    window.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      this.activeHandle = null;
      this.cropOverlay.releasePointerCapture(e.pointerId);
    });
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
        this.lockedRatio = img.width / img.height;
        this.widthInput.max = img.width.toString();
        this.heightInput.max = img.height.toString();
        this.updateCropArea({
          x: 0,
          y: 0,
          width: img.width,
          height: img.height
        });
        this.setStep('crop');
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
    this.lockedRatio = wRatio / hRatio;
    const ratio = this.lockedRatio;

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
    
    // Auto-lock aspect ratio if a preset is selected
    if (!this.aspectLocked) {
      this.lockBtn.click();
    }
  }

  private updateCropArea(updates: Partial<CropArea>, source?: 'width' | 'height') {
    this.cropArea = { ...this.cropArea, ...updates };
    if (source !== 'width') this.widthInput.value = Math.round(this.cropArea.width).toString();
    if (source !== 'height') this.heightInput.value = Math.round(this.cropArea.height).toString();
    this.renderOverlay();
  }

  private renderOverlay() {
    const { x, y, width, height } = this.cropArea;
    const { width: imgW, height: imgH } = this.imageSize;

    this.cropOverlay.style.left = `${(x / imgW) * 100}%`;
    this.cropOverlay.style.top = `${(y / imgH) * 100}%`;
    this.cropOverlay.style.width = `${(width / imgW) * 100}%`;
    this.cropOverlay.style.height = `${(height / imgH) * 100}%`;
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
