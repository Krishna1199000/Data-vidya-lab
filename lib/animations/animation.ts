export const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  };
  
  export const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  export const slideIn = {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 }
  };
  
  export const scaleIn = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 }
  };
  
  export const springConfig = {
    type: "spring",
    stiffness: 400,
    damping: 30
  };
  
  