import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const ParticleHero = ({
  title = "FIGURE FAME",
  subtitle = "Twoja Baza Danych i Agregator",
  description = "Największy zbiór zaufanych danych, cen rynkowych i historii japońskich figurek kolekcjonerskich anime.",
  particleCount = 15,
  onTitleClick
}) => {
  const containerRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef();
  const timeoutRef = useRef();
  
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [staticCursor, setStaticCursor] = useState({ x: 0, y: 0 });
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isStaticAnimation, setIsStaticAnimation] = useState(false);
  
  const startTimeRef = useRef(Date.now());
  const lastMouseMoveRef = useRef(Date.now());

  const rows = particleCount;
  const totalParticles = rows * rows;

  // Initialize particles
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = '';
    particlesRef.current = [];

    for (let i = 0; i < totalParticles; i++) {
      const particle = document.createElement('div');
      
      // Calculate grid position
      const row = Math.floor(i / rows);
      const col = i % rows;
      const centerRow = Math.floor(rows / 2);
      const centerCol = Math.floor(rows / 2);
      
      // Distance from center for stagger effects
      const distanceFromCenter = Math.sqrt(
        Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
      );
      
      // Staggered scale (larger in center)
      const scale = Math.max(0.1, 1.2 - distanceFromCenter * 0.12);
      
      // Staggered opacity (more opaque in center)
      const opacity = Math.max(0.05, 1 - distanceFromCenter * 0.1);
      
      // Color intensity based on distance
      const lightness = Math.max(15, 75 - distanceFromCenter * 6);
      
      // Glow intensity
      const glowSize = Math.max(0.5, 6 - distanceFromCenter * 0.5);
      
      particle.style.cssText = `
        position: absolute;
        border-radius: 50%;
        will-change: transform;
        width: 0.4rem;
        height: 0.4rem;
        left: ${col * 1.8}rem;
        top: ${row * 1.8}rem;
        transform: scale(${scale});
        opacity: ${opacity};
        background: hsl(42, 95%, ${lightness}%);
        box-shadow: 0 0 ${glowSize * 0.2}rem 0 hsl(42, 95%, 60%);
        mix-blend-mode: var(--particle-blend, screen);
        z-index: ${Math.round(totalParticles - distanceFromCenter * 5)};
        transition: transform 0.05s linear;
      `;
      
      container.appendChild(particle);
      particlesRef.current.push(particle);
    }
  }, [rows, totalParticles]);

  // Continuous animation
  useEffect(() => {
    const animate = () => {
      const currentTime = (Date.now() - startTimeRef.current) * 0.001;
      
      if (isAutoMode) {
        const x = Math.sin(currentTime * 0.3) * 200 + Math.sin(currentTime * 0.17) * 100;
        const y = Math.cos(currentTime * 0.2) * 150 + Math.cos(currentTime * 0.23) * 80;
        setCursor({ x, y });
      } else if (isStaticAnimation) {
        const timeSinceLastMove = Date.now() - lastMouseMoveRef.current;
        
        if (timeSinceLastMove > 200) {
          const animationStrength = Math.min((timeSinceLastMove - 200) / 1000, 1);
          const subtleX = Math.sin(currentTime * 1.5) * 20 * animationStrength;
          const subtleY = Math.cos(currentTime * 1.2) * 16 * animationStrength;
          
          setCursor({
            x: staticCursor.x + subtleX,
            y: staticCursor.y + subtleY
          });
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAutoMode, isStaticAnimation, staticCursor]);

  // Update particle positions
  useEffect(() => {
    particlesRef.current.forEach((particle, i) => {
      const row = Math.floor(i / rows);
      const col = i % rows;
      const centerRow = Math.floor(rows / 2);
      const centerCol = Math.floor(rows / 2);
      const distanceFromCenter = Math.sqrt(
        Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
      );
      
      const delay = distanceFromCenter * 8;
      const originalScale = Math.max(0.1, 1.2 - distanceFromCenter * 0.12);
      const dampening = Math.max(0.3, 1 - distanceFromCenter * 0.08);
      
      setTimeout(() => {
        const moveX = cursor.x * dampening;
        const moveY = cursor.y * dampening;
        
        particle.style.transform = `translate(${moveX}px, ${moveY}px) scale(${originalScale})`;
        particle.style.transition = `transform ${120 + distanceFromCenter * 20}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      }, delay);
    });
  }, [cursor, rows]);

  // Mouse/touch movement handler
  const handlePointerMove = (e) => {
    const event = e.touches ? e.touches[0] : e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const newCursor = {
      x: (event.clientX - centerX) * 0.8,
      y: (event.clientY - centerY) * 0.8
    };
    
    setCursor(newCursor);
    setStaticCursor(newCursor);
    setIsAutoMode(false);
    setIsStaticAnimation(false);
    lastMouseMoveRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsStaticAnimation(true);
    }, 500);
    
    setTimeout(() => {
      if (Date.now() - lastMouseMoveRef.current >= 4000) {
        setIsAutoMode(true);
        setIsStaticAnimation(false);
        startTimeRef.current = Date.now();
      }
    }, 4000);
  };

  return (
    <div 
      className="hero-container relative w-full overflow-hidden"
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}
    >
      {/* Particle Animation Background from 21st.dev */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, pointerEvents: 'none' }}>
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: `${rows * 1.8}rem`,
            height: `${rows * 1.8}rem`
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          onClick={onTitleClick}
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            margin: '0 0 1rem 0',
            textShadow: '0 10px 30px rgba(255, 71, 87, 0.3)',
            cursor: onTitleClick ? 'pointer' : 'default'
          }}
        >
          {title}
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <h2 style={{ 
            fontSize: '1.2rem', 
            fontWeight: 600, 
            letterSpacing: '2px', 
            textTransform: 'uppercase', 
            color: 'var(--color-text-main)',
            marginBottom: '1rem' 
          }}>
            {subtitle}
          </h2>
          <p style={{ 
            maxWidth: '600px', 
            margin: '0 auto 2rem auto', 
            color: 'var(--color-text-main)', 
            lineHeight: 1.6 
          }}>
            {description}
          </p>
        </motion.div>
      </div>

      {/* Ambient Effects */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5rem', left: '5rem', width: '20rem', height: '20rem', backgroundColor: 'var(--color-ambient-1, rgba(250, 204, 21, 0.05))', borderRadius: '50%', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '5rem', right: '5rem', width: '24rem', height: '24rem', backgroundColor: 'var(--color-ambient-2, rgba(249, 115, 22, 0.05))', borderRadius: '50%', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120vh', height: '120vh', background: 'var(--color-ambient-radial, radial-gradient(circle, rgba(250, 204, 21, 0.03) 0%, transparent 70%))', borderRadius: '50%' }}></div>
      </div>
    </div>
  );
};

export default ParticleHero;
