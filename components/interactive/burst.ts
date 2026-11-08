'use client';

/**
 * Interactive element: VERDICT BURST. A quick confetti of paper bits from a tapped element, in
 * the given colour, plus a tiny vibration on phones. Used by the Go / Skip / Only for buttons.
 */
export function burstFrom(el: HTMLElement, color: string, count = 14) {
  navigator.vibrate?.(14);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
        { duration: 750 + Math.random() * 250, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
      )
      .finished.then(
        () => bit.remove(),
        () => bit.remove(),
      );
  }
}
