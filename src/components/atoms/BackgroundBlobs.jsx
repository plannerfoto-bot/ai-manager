import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeProvider';

const BackgroundBlobs = () => {
  const { isDark } = useTheme();

  if (!isDark) return null; // No blobs in clean light mode

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-[var(--accent-glow)] blur-[120px]"
        animate={{
          x: [0, 100, 0, -100, 0],
          y: [0, 50, 100, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ top: '-10%', left: '-10%' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px]"
        animate={{
          x: [0, -100, 0, 100, 0],
          y: [0, -50, -100, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ bottom: '-10%', right: '-10%' }}
      />
    </div>
  );
};

export default BackgroundBlobs;
