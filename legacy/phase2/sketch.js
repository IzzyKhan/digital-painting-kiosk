let artLayer;
let saturationDir = 1;
let brightnessDir = 1;

const BG_HUE = 0;
const BG_SAT = 0;
const BG_BRIGHT = 12;

function getParams() {
  return window.params;
}

function getActiveSize(p) {
  return p.shape === "eraser" ? p.eraserSize : p.size;
}

function resetSaturationDir() {
  const p = getParams();
  if (!p) return;
  if (p.saturation >= 100) saturationDir = -1;
  else if (p.saturation <= 0) saturationDir = 1;
}

function resetBrightnessDir() {
  const p = getParams();
  if (!p) return;
  if (p.brightness >= 100) brightnessDir = -1;
  else if (p.brightness <= 0) brightnessDir = 1;
}

window.resetSaturationDir = resetSaturationDir;
window.resetBrightnessDir = resetBrightnessDir;
window.clearArt = clearArt;
window.exportArt = exportArt;

function resizeCanvasToContainer() {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  const w = container.offsetWidth;
  const h = container.offsetHeight;
  if (w === 0 || h === 0) return;

  resizeCanvas(w, h);
  noCursor();

  const newLayer = createGraphics(width, height);
  newLayer.colorMode(HSB, 360, 100, 100, 100);
  if (artLayer) {
    newLayer.image(artLayer, 0, 0);
  } else {
    newLayer.background(BG_HUE, BG_SAT, BG_BRIGHT);
  }
  artLayer = newLayer;
}

function setup() {
  const canvas = createCanvas(100, 100);
  canvas.parent("canvas-container");
  noCursor();
  document.body.classList.add("drawing-mode");
  colorMode(HSB, 360, 100, 100, 100);
  resizeCanvasToContainer();
  requestAnimationFrame(resizeCanvasToContainer);
}

function mouseOnCanvas() {
  return width > 0 && height > 0 &&
    mouseX >= 0 && mouseX < width &&
    mouseY >= 0 && mouseY < height;
}

function draw() {
  if (width === 0 || height === 0) {
    resizeCanvasToContainer();
    return;
  }

  background(BG_HUE, BG_SAT, BG_BRIGHT);
  image(artLayer, 0, 0);

  const blocked =
    window.isDrawingBlocked?.() ||
    window.blockCanvasInput === true;

  if (!blocked && mouseOnCanvas()) {
    drawPreview(mouseX, mouseY);
  }

  if (!blocked && mouseIsPressed) {
    drawBrush(artLayer, pmouseX, pmouseY, mouseX, mouseY);
  }
}

function drawPreview(x, y) {
  const p = getParams();
  if (!p) return;

  const activeSize = getActiveSize(p);

  push();

  if (p.shape === "eraser") {
    noFill();
    stroke(0, 0, 90, 80);
    strokeWeight(2);
    circle(x, y, activeSize);

    noStroke();
    fill(BG_HUE, BG_SAT, BG_BRIGHT, 60);
    circle(x, y, activeSize);
  } else {
    noStroke();
    fill(p.hue, p.saturation, p.brightness, p.alpha * 0.4);
    drawShape(x, y, p, activeSize);

    noFill();
    stroke(p.hue, p.saturation, p.brightness, 100);
    strokeWeight(2);
    drawShape(x, y, p, activeSize);
  }

  pop();
}

function drawShape(x, y, p, size) {
  if (p.shape === "circle") {
    circle(x, y, size);
  } else if (p.shape === "square") {
    rectMode(CENTER);
    square(x, y, size);
  } else if (p.shape === "triangle") {
    drawTriangleAt(x, y, size);
  }
}

function drawTriangleAt(x, y, size) {
  const half = size / 2;
  triangle(
    x, y - half,
    x - half, y + half,
    x + half, y + half
  );
}

function drawBrush(layer, x1, y1, x2, y2) {
  const p = getParams();
  if (!p) return;

  const activeSize = getActiveSize(p);

  layer.push();
  layer.noStroke();

  if (p.shape === "eraser") {
    layer.fill(BG_HUE, BG_SAT, BG_BRIGHT, 100);
    layer.circle(x2, y2, activeSize);
  } else {
    layer.fill(p.hue, p.saturation, p.brightness, p.alpha);

    if (p.shape === "circle") {
      layer.circle(x2, y2, activeSize);
    } else if (p.shape === "square") {
      layer.rectMode(CENTER);
      layer.square(x2, y2, activeSize);
    } else if (p.shape === "triangle") {
      const half = activeSize / 2;
      layer.triangle(
        x2, y2 - half,
        x2 - half, y2 + half,
        x2 + half, y2 + half
      );
    }
  }

  layer.pop();
}

function keyPressed() {
  const p = getParams();
  if (!p) return;

  if (key === "1") p.shape = "circle";
  if (key === "2") p.shape = "square";
  if (key === "3") p.shape = "triangle";
  if (key === "4") p.shape = "eraser";

  if (key === "1" || key === "2" || key === "3" || key === "4") {
    window.updateShapeButtons?.(p.shape);
    window.syncSizeUI?.();
  }

  if (key === "c" && p.shape !== "eraser") {
    p.hue = (p.hue + 5) % 360;
    window.updateColourLegend?.();
    const hueSlider = document.getElementById("hue-slider");
    if (hueSlider) hueSlider.value = p.hue;
  }

  if (key === "s" && p.shape !== "eraser") {
    if (p.saturation >= 100) saturationDir = -1;
    if (p.saturation <= 0) saturationDir = 1;
    p.saturation = constrain(p.saturation + 5 * saturationDir, 0, 100);
    window.updateColourLegend?.();
    const satSlider = document.getElementById("saturation-slider");
    if (satSlider) satSlider.value = p.saturation;
  }

  if (key === "b" && p.shape !== "eraser") {
    if (p.brightness >= 100) brightnessDir = -1;
    if (p.brightness <= 0) brightnessDir = 1;
    p.brightness = constrain(p.brightness + 5 * brightnessDir, 0, 100);
    window.updateColourLegend?.();
    const brightSlider = document.getElementById("brightness-slider");
    if (brightSlider) brightSlider.value = p.brightness;
  }

  if (key === "+" || key === "=") {
    if (p.shape === "eraser") {
      p.eraserSize = min(p.eraserSize + 4, 120);
    } else {
      p.size = min(p.size + 4, 120);
    }
  }

  if (key === "-") {
    if (p.shape === "eraser") {
      p.eraserSize = max(p.eraserSize - 4, 4);
    } else {
      p.size = max(p.size - 4, 4);
    }
  }

  if (key === "+" || key === "=" || key === "-") {
    window.syncSizeUI?.();
  }

  if (key === "r") {
    clearArt();
  }
}

function clearArt() {
  if (!artLayer) return;
  artLayer.background(BG_HUE, BG_SAT, BG_BRIGHT);
}

function exportArt() {
  if (!artLayer) return;
  save(artLayer, "generative-art.png");
}

function windowResized() {
  resizeCanvasToContainer();
}