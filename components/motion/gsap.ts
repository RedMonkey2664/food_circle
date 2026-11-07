'use client';

// One place to register GSAP plugins and share eases, so every component gets the same feel.
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
gsap.defaults({ ease: 'expo.out', duration: 0.7 });

/** True when the visitor has not asked for reduced motion. */
export function motionOK(): boolean {
  return (
    typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export { gsap, useGSAP };
