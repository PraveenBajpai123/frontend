import { Variants } from 'framer-motion';

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

// Container animations with staggered children
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Individual item animations
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// MCQ option slide-in animations
export const mcqOptionVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: index * 0.1,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

// Progress bar animation
export const progressVariants: Variants = {
  initial: { scaleX: 0 },
  animate: (value: number) => ({
    scaleX: value / 100,
    transition: { duration: 0.8, ease: 'easeOut' },
  }),
};

// Score reveal animation
export const scoreRevealVariants: Variants = {
  hidden: { scale: 0, opacity: 0, rotateZ: -180 },
  visible: {
    scale: 1,
    opacity: 1,
    rotateZ: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.8,
    },
  },
};

// Floating animation for elements
export const floatVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Pulse animation
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Slide up animation (for modals/cards)
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
      duration: 0.5,
    },
  },
};

// Mastery bar fill animation
export const masteryBarVariants: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: (percentage: number) => ({
    scaleX: percentage / 100,
    originX: 0,
    transition: {
      duration: 1.2,
      ease: 'easeOut',
      delay: 0.2,
    },
  }),
};
