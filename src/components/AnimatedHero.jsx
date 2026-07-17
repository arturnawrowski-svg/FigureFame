import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

const ParticleHero = ({
  title = "FIGURE FAME",
  subtitle = "Twoja Baza Danych i Agregator",
  description = "Największy zbiór zaufanych danych, cen rynkowych i historii japońskich figurek kolekcjonerskich anime.",
  particleCount = 50,
  primaryButton = { text: "Eksploruj Kolekcję", onClick: () => {} }
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [particles] = useState(() => Array.from({ length: particleCount }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    speed: Math.random() * 2 + 0.5,
  })));

  return (
    <div 
      ref={containerRef}
      className="hero-container relative w-full overflow-hidden"
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}
    >
      {/* Background container for particles covering the hero */}
      <div 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              backgroundColor: 'var(--color-particles)',
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: particle.speed * -30,
              x: particle.speed * 20,
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{
              duration: particle.speed * 4,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <a href="/" style={{ textDecoration: 'none' }}>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              margin: '0 0 1rem 0',
              background: 'linear-gradient(135deg, #ff4757 0%, #ff7eb3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 10px 30px rgba(255, 71, 87, 0.3)',
              cursor: 'pointer'
            }}
          >
            {title}
          </motion.h1>
        </a>
        
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
            color: 'var(--color-text-secondary)',
            marginBottom: '1rem' 
          }}>
            {subtitle}
          </h2>
          <p style={{ 
            maxWidth: '600px', 
            margin: '0 auto 2rem auto', 
            color: 'var(--color-text-secondary)', 
            lineHeight: 1.6 
          }}>
            {description}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ParticleHero;
