// Museum kiosk (Phase 5): launch Chrome with --kiosk --app=https://your-url
// instead of Cmd+Ctrl+F fullscreen, to avoid the top-edge toolbar and cursor flash.

window.params = {
    shape: "circle",
    hue: 200,
    saturation: 80,
    brightness: 95,
    size: 48,
    eraserSize: 56,
    alpha: 90,
  };

window.blockCanvasInput = false;
  
  function isEraserMode() {
    return params.shape === "eraser";
  }
  
  function getActiveSize() {
    return isEraserMode() ? params.eraserSize : params.size;
  }
  
  function setActiveSize(value) {
    if (isEraserMode()) {
      params.eraserSize = value;
    } else {
      params.size = value;
    }
  }
  
  function setPanelOpen(isOpen) {
    const panel = document.getElementById("controls");
    const toggle = document.getElementById("panel-toggle");
    const backdrop = document.getElementById("panel-backdrop");
    panel.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    backdrop.hidden = !isOpen;
    backdrop.classList.toggle("is-visible", isOpen);
    backdrop.setAttribute("aria-hidden", String(!isOpen));
    
    // disable canvas while settings panel is open
    const container = document.getElementById("canvas-container");
    container?.classList.toggle("canvas-blocked", isOpen);

  }
  
  function updateShapeButtons(activeShape) {
    document.querySelectorAll("[data-shape]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.shape === activeShape);
    });
  }
  
  function updateColourControls() {
    const disabled = isEraserMode();
    document.querySelectorAll(".colour-control").forEach((el) => {
      el.disabled = disabled;
    });
    const colourSection = document.getElementById("colour-section");
    if (colourSection) {
      colourSection.classList.toggle("is-disabled", disabled);
    }
  }
  
  function colourToCss(hue, saturation, brightness) {
    return `hsl(${hue}, ${saturation}%, ${brightness * 0.55}%)`;
  }
  
  function updateColourLegend() {
    const swatch = document.getElementById("hue-swatch");
    if (swatch) {
      swatch.style.background = colourToCss(
        params.hue,
        params.saturation,
        params.brightness
      );
    }
  }
  
  function syncSizeUI() {
    const slider = document.getElementById("size-slider");
    const label = document.getElementById("size-label");
    const sectionTitle = document.querySelector("#size-section h2");
    const active = getActiveSize();
  
    if (slider) slider.value = active;
    if (label) {
      label.textContent = isEraserMode()
        ? `Eraser ${Math.round(active)}`
        : `Size ${Math.round(active)}`;
    }
    if (sectionTitle) {
      sectionTitle.textContent = isEraserMode() ? "Eraser size" : "Size";
    }
  
    updateColourControls();
  }
  
  function initShapeButtons() {
    document.querySelectorAll("[data-shape]").forEach((btn) => {
      btn.addEventListener("click", () => {
        params.shape = btn.dataset.shape;
        updateShapeButtons(params.shape);
        syncSizeUI();
      });
    });
    updateShapeButtons(params.shape);
  }
  
  function initHueSlider() {
    const slider = document.getElementById("hue-slider");
    if (!slider) return;
  
    slider.addEventListener("input", () => {
      params.hue = Number(slider.value);
      updateColourLegend();
    });
  
    slider.value = params.hue;
  }
  
  function initSaturationSlider() {
    const slider = document.getElementById("saturation-slider");
    if (!slider) return;
  
    slider.addEventListener("input", () => {
      params.saturation = Number(slider.value);
      window.resetSaturationDir?.();
      updateColourLegend();
    });
  
    slider.value = params.saturation;
  }
  
  function initBrightnessSlider() {
    const slider = document.getElementById("brightness-slider");
    if (!slider) return;
  
    slider.addEventListener("input", () => {
      params.brightness = Number(slider.value);
      window.resetBrightnessDir?.();
      updateColourLegend();
    });
  
    slider.value = params.brightness;
  }
  
  function initSizeSlider() {
    const slider = document.getElementById("size-slider");
    if (!slider) return;
  
    slider.addEventListener("input", () => {
      setActiveSize(Number(slider.value));
      syncSizeUI();
    });
  
    syncSizeUI();
  }

  function initActionButtons() {
    const clearBtn = document.getElementById("clear-btn");
    const exportBtn = document.getElementById("export-btn");
  
    clearBtn?.addEventListener("click", () => {
      window.clearArt?.();
    });
  
    exportBtn?.addEventListener("click", () => {
      window.exportArt?.();
    });
  }
  
  function initPanel() {
    const toggle = document.getElementById("panel-toggle");
    const closeBtn = document.getElementById("panel-close");
    const backdrop = document.getElementById("panel-backdrop");
    
    toggle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      window.blockCanvasInput = true;
    });

    document.addEventListener("pointerup", () => {
      window.blockCanvasInput = false;
    });

    toggle.addEventListener("click", () => {
      const panel = document.getElementById("controls");
      setPanelOpen(!panel.classList.contains("is-open"));
    });
  
    closeBtn.addEventListener("click", () => setPanelOpen(false));
    backdrop.addEventListener("click", () => setPanelOpen(false));
  
    initShapeButtons();
    initHueSlider();
    initSaturationSlider();
    initBrightnessSlider();
    initSizeSlider();
    initActionButtons();
    updateColourLegend();
  }
  
  window.updateShapeButtons = updateShapeButtons;
  window.updateColourLegend = updateColourLegend;
  window.syncSizeUI = syncSizeUI;
  window.isDrawingBlocked = () => {
    return document.getElementById("controls")?.classList.contains("is-open") ?? false;
  };
  
  initPanel();