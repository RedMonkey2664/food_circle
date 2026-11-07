import { PageMotion } from '@/components/motion/PageMotion';

// Re-mounts on every navigation inside the app, so each page gets the motion layer's entrance
// (GSAP: page ease-in, headline rise, cards revealed as they scroll in). Off for reduced motion.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageMotion>{children}</PageMotion>;
}
