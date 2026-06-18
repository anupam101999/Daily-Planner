let audioContext;
let celebrationTimer;

function showCompletionRing(title, body) {
  if (typeof document === "undefined" || !document.body) return;

  document.querySelector(".completion-celebration")?.remove();
  clearTimeout(celebrationTimer);

  const celebration = document.createElement("div");
  celebration.className = "completion-celebration";
  celebration.setAttribute("role", "status");
  celebration.setAttribute("aria-live", "polite");

  const ring = document.createElement("span");
  ring.className = "completion-celebration-ring";
  ring.setAttribute("aria-hidden", "true");

  const message = document.createElement("span");
  message.className = "completion-celebration-message";

  const heading = document.createElement("strong");
  heading.textContent = title;
  message.appendChild(heading);

  if (body) {
    const detail = document.createElement("span");
    detail.textContent = body;
    message.appendChild(detail);
  }

  celebration.append(ring, message);
  document.body.appendChild(celebration);
  requestAnimationFrame(() => celebration.classList.add("is-visible"));

  celebrationTimer = window.setTimeout(() => {
    celebration.classList.remove("is-visible");
    celebration.addEventListener("transitionend", () => celebration.remove(), { once: true });
    window.setTimeout(() => celebration.remove(), 400);
  }, 2600);
}

export async function prepareCompletionFeedback() {
  const context = getAudioContext();
  if (context?.state === "suspended") {
    await context.resume().catch(() => {});
  }

  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission().catch(() => "default");
  }
}

export function announceCompletion(title, body) {
  showCompletionRing(title, body);
  playCompletionChime();

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body,
        icon: "/daily-planner-logo.png",
        tag: `daily-planner-${title}-${body}`,
      });
      window.setTimeout(() => notification.close(), 6000);
    } catch {
      // Completion feedback must never interrupt the saved planner action.
    }
  }
}

function playCompletionChime() {
  const context = getAudioContext();
  if (!context || context.state !== "running") return;

  const start = context.currentTime + 0.03;
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const cycleStart = start + cycle * 0.72;
    playBellTone(context, 987.77, cycleStart, 0.28, 0.24);
    playBellTone(context, 659.25, cycleStart + 0.3, 0.34, 0.2);
  }
}

function playBellTone(context, frequency, startTime, duration, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext = new AudioContext();
  return audioContext;
}
