/**
 * SPEX - Lesson Command Center Service
 * المنطق الخاص بصفارة الصوت، توليد الفرق، وإدارة المراحل والتقارير
 */
import { Student } from '../types/spex';

export function playWhistleSound(
  type: 'short' | 'double' | 'long' | 'chime' = 'short',
  soundEnabled = true
) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'short') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(2700, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'double') {
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2900, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(3300, ctx.currentTime + delay + 0.04);
        osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + delay + 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.14);
      });
    } else if (type === 'long') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2850, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3150, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(3000, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

export function triggerVibration(vibrationEnabled = true) {
  if (vibrationEnabled && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch {
      // Ignore vibration unsupported errors
    }
  }
}

export function divideStudentsIntoBalancedTeams(
  studentsList: Student[],
  teamCount: number
): Record<string, Student[]> {
  const shuffled = [...studentsList].sort(() => Math.random() - 0.5);
  const result: Record<string, Student[]> = {};

  const teamNames = ['الفريق (أ) - الصقور', 'الفريق (ب) - الأبطال', 'الفريق (ج) - الفرسان', 'الفريق (د) - النجوم'];

  for (let i = 0; i < teamCount; i++) {
    result[teamNames[i] || `الفريق ${i + 1}`] = [];
  }

  shuffled.forEach((student, index) => {
    const teamKey = teamNames[index % teamCount] || `الفريق ${(index % teamCount) + 1}`;
    result[teamKey].push(student);
  });

  return result;
}
