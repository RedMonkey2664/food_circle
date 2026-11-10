'use client';

// One place to register GSAP plugins and share eases, so every component gets the same feel.
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { DUR, EASE, motionOK } from './tokens';

gsap.registerPlugin(useGSAP);
gsap.defaults({ ease: EASE.out, duration: DUR.enter });
// An empty selection is normal here (a page with no stamps, a list with no icons).
gsap.config({ nullTargetWarn: false });

export { gsap, useGSAP, motionOK, DUR, EASE };
