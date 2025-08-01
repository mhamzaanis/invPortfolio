const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");
const container = document.querySelector(".chart-container");

let animationFrameId;
const minPrice = 100;
const maxPrice = 200;
const dataYellow = [];
const dataRed = [];

// Enhanced configuration
const CHART_WIDTH_PERCENTAGE = 0.75;
const PIXELS_PER_SECOND = 35;
const DATA_UPDATE_INTERVAL = 150;

let lastUpdateTime = 0;
let isVisible = true;
let isInitialized = false;

// Visibility handling
document.addEventListener("visibilitychange", () => {
  isVisible = !document.hidden;
  if (isVisible && !animationFrameId) {
    animationFrameId = requestAnimationFrame(animate);
  }
});

function resizeCanvas() {
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Reinitialize if already initialized (for resize)
  if (isInitialized) {
    initializeChart();
  }
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function getChartDimensions() {
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const paddingY = 20;
  const paddingX = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const updateX = paddingX + chartWidth * CHART_WIDTH_PERCENTAGE;

  return {
    width,
    height,
    chartWidth,
    chartHeight,
    paddingY,
    paddingX,
    updateX,
  };
}

function drawLine(data, color, shadowColor) {
  if (data.length < 2) return;

  const dims = getChartDimensions();

  // Calculate positions based on data index and current time
  const getX = (dataPoint, index) => {
    const newestIndex = data.length - 1;
    const pointsFromNewest = newestIndex - index;
    const pixelsFromUpdateX =
      pointsFromNewest * ((PIXELS_PER_SECOND * DATA_UPDATE_INTERVAL) / 1000);
    return dims.updateX - pixelsFromUpdateX;
  };

  const getY = (val) => {
    return (
      dims.paddingY +
      dims.chartHeight -
      ((val - minPrice) / (maxPrice - minPrice)) * dims.chartHeight
    );
  };

  // Filter visible points
  const visiblePoints = [];
  for (let i = 0; i < data.length; i++) {
    const x = getX(data[i], i);
    if (x >= dims.paddingX - 50 && x <= dims.width + 50) {
      visiblePoints.push({
        index: i,
        x,
        y: getY(data[i].value),
        value: data[i].value,
      });
    }
  }

  if (visiblePoints.length < 2) return;

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, dims.width, 0);
  gradient.addColorStop(0, color.replace("0.9", "0.3"));
  gradient.addColorStop(1, color);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = shadowColor;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);

  for (let i = 1; i < visiblePoints.length; i++) {
    ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
  }

  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw current value indicator at updateX
  const latestPoint = visiblePoints[visiblePoints.length - 1];
  if (latestPoint && Math.abs(latestPoint.x - dims.updateX) < 20) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(latestPoint.x, latestPoint.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Value label
    const labelText = latestPoint.value.toFixed(2);
    ctx.font = "12px 'Inter', Arial, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText(labelText, latestPoint.x + 10, latestPoint.y - 10);
  }
}

function drawGrid() {
  const dims = getChartDimensions();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  // Horizontal grid lines
  for (let i = 0; i <= 4; i++) {
    const y = dims.paddingY + dims.chartHeight * (i / 4);
    ctx.beginPath();
    ctx.moveTo(dims.paddingX, y);
    ctx.lineTo(dims.width - dims.paddingX, y);
    ctx.stroke();
  }

  // Update line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(dims.updateX, dims.paddingY);
  ctx.lineTo(dims.updateX, dims.height - dims.paddingY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function draw() {
  const dims = getChartDimensions();
  ctx.clearRect(0, 0, dims.width, dims.height);

  drawGrid();
  drawLine(dataYellow, "rgba(100, 255, 100, 0.9)", "rgba(100, 255, 100, 0.3)");
  drawLine(dataRed, "rgba(255, 100, 100, 0.9)", "rgba(255, 100, 100, 0.3)");
}

function updateData(currentTime) {
  if (currentTime - lastUpdateTime >= DATA_UPDATE_INTERVAL) {
    const lastYellow =
      dataYellow.length > 0 ? dataYellow[dataYellow.length - 1].value : 150;
    const lastRed =
      dataRed.length > 0 ? dataRed[dataRed.length - 1].value : 140;

    const priceYellow = Math.min(
      maxPrice,
      Math.max(minPrice, lastYellow + (Math.random() - 0.5) * 8)
    );
    const priceRed = Math.min(
      maxPrice,
      Math.max(minPrice, lastRed + (Math.random() - 0.5) * 8)
    );

    dataYellow.push({
      value: priceYellow,
      timestamp: currentTime,
    });

    dataRed.push({
      value: priceRed,
      timestamp: currentTime,
    });

    lastUpdateTime = currentTime;

    // Cleanup old data
    const dims = getChartDimensions();
    const maxPoints = Math.ceil(
      (dims.width + 200) / ((PIXELS_PER_SECOND * DATA_UPDATE_INTERVAL) / 1000)
    );

    while (dataYellow.length > maxPoints) {
      dataYellow.shift();
    }
    while (dataRed.length > maxPoints) {
      dataRed.shift();
    }
  }
}

function animate(currentTime) {
  updateData(currentTime);
  draw();

  if (isVisible) {
    animationFrameId = requestAnimationFrame(animate);
  }
}

function initializeChart() {
  // Clear existing data
  dataYellow.length = 0;
  dataRed.length = 0;

  const dims = getChartDimensions();

  // Calculate how many points we need to fill from left edge to updateX
  const historicalWidth = dims.updateX - dims.paddingX;
  const totalPoints = Math.ceil(
    historicalWidth / ((PIXELS_PER_SECOND * DATA_UPDATE_INTERVAL) / 1000)
  );

  // Generate historical data
  let yellowPrice = 150;
  let redPrice = 140;
  const baseTime = performance.now();

  for (let i = 0; i < totalPoints; i++) {
    yellowPrice = Math.min(
      maxPrice,
      Math.max(minPrice, yellowPrice + (Math.random() - 0.5) * 6)
    );
    redPrice = Math.min(
      maxPrice,
      Math.max(minPrice, redPrice + (Math.random() - 0.5) * 6)
    );

    const timestamp = baseTime - (totalPoints - 1 - i) * DATA_UPDATE_INTERVAL;

    dataYellow.push({
      value: yellowPrice,
      timestamp: timestamp,
    });
    dataRed.push({
      value: redPrice,
      timestamp: timestamp,
    });
  }

  // Set last update time
  lastUpdateTime = baseTime;
  isInitialized = true;

  // Draw immediately
  draw();
}

function startChart() {
  // Initialize the chart with historical data
  initializeChart();

  // Start the animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(animate);
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startChart);
} else {
  startChart();
}

