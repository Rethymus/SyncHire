"use client";

import { Variants, Transition, TargetAndTransition } from "framer-motion";

// =============================================================================
// FADE ANIMATIONS
// =============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeInOut" }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

// =============================================================================
// SLIDE ANIMATIONS
// =============================================================================

export const slideInLeft: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    x: -100,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

export const slideInRight: Variants = {
  hidden: { x: 100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    x: 100,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

export const slideInFromBottom: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    y: 100,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

// =============================================================================
// SCALE & BOUNCE ANIMATIONS
// =============================================================================

export const scaleIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

export const scaleOut: Variants = {
  hidden: { scale: 1.2, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    scale: 1.2,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

export const bounceIn: Variants = {
  hidden: { scale: 0.3, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
      opacity: { duration: 0.3 }
    }
  },
  exit: {
    scale: 0.3,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

export const bounce: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

// =============================================================================
// STAGGER ANIMATIONS (for lists)
// =============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

// =============================================================================
// LOADING & SPINNER ANIMATIONS
// =============================================================================

export const spin: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop"
    }
  }
};

export const pulse: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop"
    }
  }
};

export const shimmer: Variants = {
  initial: { backgroundPosition: "-1000px 0" },
  animate: {
    backgroundPosition: ["1000px 0", "-1000px 0"],
    transition: {
      duration: 2,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop"
    }
  }
};

// =============================================================================
// PROGRESS BAR ANIMATIONS
// =============================================================================

export const progressFill: Variants = {
  initial: { width: "0%" },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.5, ease: "easeOut" }
  })
};

export const progressBarStripes: Variants = {
  animate: {
    backgroundPosition: ["1rem 0", "0 0"],
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop"
    }
  }
};

// =============================================================================
// SUCCESS & ERROR ANIMATIONS
// =============================================================================

export const successCheck: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
      opacity: { duration: 0.2 }
    }
  }
};

export const successPulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.6, ease: "easeInOut" }
  }
};

export const errorShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4, ease: "easeInOut" }
  }
};

export const errorPulse: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.02, 1],
    opacity: [1, 0.9, 1],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
      repeat: 2
    }
  }
};

// =============================================================================
// FORM INPUT ANIMATIONS
// =============================================================================

export const inputFocus: Variants = {
  initial: { scale: 1, borderColor: "rgba(0, 0, 0, 0.2)" },
  focus: {
    scale: 1.01,
    borderColor: "rgba(59, 130, 246, 0.5)",
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

export const labelFloat: Variants = {
  initial: { y: 0, fontSize: "1rem" },
  focus: {
    y: -24,
    fontSize: "0.875rem",
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

// =============================================================================
// BUTTON PRESS ANIMATIONS
// =============================================================================

export const buttonPress: Variants = {
  initial: { scale: 1 },
  tap: { scale: 0.95 },
  hover: { scale: 1.02 }
};

export const buttonGlow: Variants = {
  initial: { boxShadow: "0 0 0 rgba(59, 130, 246, 0)" },
  hover: {
    boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
    transition: { duration: 0.3 }
  }
};

// =============================================================================
// DIALOG & MODAL ANIMATIONS
// =============================================================================

export const dialogOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export const dialogContent: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      opacity: { duration: 0.2 }
    }
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// =============================================================================
// FILE UPLOAD ANIMATIONS
// =============================================================================

export const uploadZoneIdle: Variants = {
  initial: { scale: 1, borderColor: "rgba(209, 213, 219, 1)" },
  animate: {
    scale: 1,
    borderColor: "rgba(209, 213, 219, 1)",
    transition: { duration: 0.3 }
  }
};

export const uploadZoneHover: Variants = {
  hover: {
    scale: 1.02,
    borderColor: "rgba(59, 130, 246, 0.5)",
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    transition: { duration: 0.2 }
  }
};

export const uploadZoneDrag: Variants = {
  drag: {
    scale: 1.05,
    borderColor: "rgba(59, 130, 246, 1)",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    transition: { duration: 0.2 }
  }
};

export const fileDrop: Variants = {
  initial: { scale: 1.2, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      opacity: { duration: 0.3 }
    }
  }
};

// =============================================================================
// LIST ITEM ANIMATIONS
// =============================================================================

export const listItemEnter: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

export const listReorder: Variants = {
  initial: { y: 0 },
  animate: (custom: number) => ({
    y: custom,
    transition: { duration: 0.3, ease: "easeInOut" }
  })
};

// =============================================================================
// TOAST NOTIFICATION ANIMATIONS
// =============================================================================

export const toastSlideIn: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

export const toastFadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const createStaggerVariants = (staggerDelay: number = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1
    }
  }
});

export const createSlideVariants = (direction: "left" | "right" | "up" | "down", distance: number = 20): Variants => {
  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const value = direction === "right" || direction === "down" ? distance : -distance;

  return {
    hidden: { [axis]: value, opacity: 0 } as TargetAndTransition,
    visible: {
      [axis]: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] as any }
    } as TargetAndTransition,
    exit: {
      [axis]: value,
      opacity: 0,
      transition: { duration: 0.3, ease: "easeInOut" as any }
    } as TargetAndTransition
  };
};

// =============================================================================
// COMMON TRANSITIONS
// =============================================================================

export const defaultTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

export const fastTransition: Transition = {
  duration: 0.2,
  ease: "easeInOut"
};

export const smoothTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1.0]
};