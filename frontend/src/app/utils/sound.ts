// Utility to play a pleasant two-note chime for trade completion
export function playTradeChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // First note (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.18, now);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second note (E5), starts slightly after the first
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.32);

    // Clean up
    osc1.onended = () => ctx.close();
    osc2.onended = () => ctx.close();
  } catch (e) {
    // Audio not supported or blocked
    // Optionally log or ignore
  }
}
