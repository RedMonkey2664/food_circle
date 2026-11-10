'use client';

// One place to register GSAP plugins and share eases, so every component gets the same feel.
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { DUR, EASE, motionOK } from './tokens';

gsap.registerPlugin(useGSAP);
gsap.defaults({ ease: EASE.out, duration: DUR.enter });

export { gsap, useGSAP, motionOK, DUR, EASE };
