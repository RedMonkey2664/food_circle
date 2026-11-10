'use client';

import { CSS_EASE, DUR_MS, motionOK, motionTier } from '@/components/motion/tokens';

/**
 * Interactive element: VERDICT BURST. A quick confetti of paper bits from a tapped element, in
 * the given colour, plus a tiny vibration on phones. Used by the Go / Skip / Only for buttons.
 */
export function burstFrom(el: HTMLElement, color: string) {
  navigator.vibrate?.(14);
  if (!motionOK()) return;
  // Fewer bits on phones: the burst must never cost a frame of the logging flow.
  const count = motionTier() === 'phone' ? 10 : 14;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const shapes = ['●', '✦', '■', '▲'];
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.textContent = shapes[i % shapes.length] ?? '●';
    bit.setAttribute('aria-hidden', 'true');
    const tint = i % 3 === 0 ? '#f6b500' : color;
    bit.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;z-index:60;pointer-events:none;color:${tint};font-size:${9 + (i % 3) * 4}px;line-height:1`;
    document.body.appendChild(bit);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 50 + Math.random() * 60;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    bit
      .animate(
        [
          { transform: 'translate(-50%,-50%) scale(0.4) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy - 20}px)) scale(1) rotate(${Math.random() * 360}deg)`,
            opacity: 1,
            offset: 0.6,
          },
          {
            transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 30}px)) scale(0.8) rotate(${Math.random() * 540}deg)`,
            opacity: 0,
          },
        ],
        { duration: DUR_MS.scene, easing: CSS_EASE.out },
      )
      .finished.then(
        () => bit.remove(),
        () => bit.remove(),
      );
  }
}
