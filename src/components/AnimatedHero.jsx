import React, { useEffect, useRef, useState } from 'react';

// ============================================================================
// Nagłówek z siatką świecących cząstek.
// ----------------------------------------------------------------------------
// WYDAJNOŚĆ — dlaczego to wygląda tak, a nie inaczej:
// Poprzednia wersja trzymała pozycję kursora w stanie Reacta i ustawiała go w
// każdej klatce, a następnie dla KAŻDEJ z 225 cząstek planowała osobny
// setTimeout. To ~13 500 timerów na sekundę i 60 przerysowań komponentu na
// sekundę. Na iPhonie animacja stawała, a Safari zaczynał wyrzucać zdekodowane
// zdjęcia z pamięci — stąd znikające karty w Gablocie.
//
// Teraz: jedna pętla requestAnimationFrame pisze WPROST do węzłów DOM
// (particlesRef), bez stanu Reacta i bez timerów. Efekt „fali" od środka daje
// transition-delay ustawiony raz, przy tworzeniu cząstki.
//
// Na ekranach dotykowych (telefon, tablet) oraz przy systemowym „ogranicz
// animacje" cząstek nie ma w ogóle — zostaje sama statyczna poświata.
// ============================================================================

// Czy urządzenie w ogóle powinno dostać animację. Sprawdzamy raz, przy montażu:
// telefon nie zamienia się w desktop w trakcie oglądania strony.
function useAnimationAllowed() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => setAllowed(fine.matches && !calm.matches);
    update();

    // Podpięcie pod zmianę ustawień systemowych — np. gdy ktoś włączy
    // „ogranicz animacje" przy otwartej stronie.
    calm.addEventListener?.('change', update);
    fine.addEventListener?.('change', update);
    return () => {
      calm.removeEventListener?.('change', update);
      fine.removeEventListener?.('change', update);
    };
  }, []);

  return allowed;
}

const ParticleHero = ({
  title = "FIGURE FAME",
  subtitle = "Twoja Baza Danych i Agregator",
  description = "Największy zbiór zaufanych danych, cen rynkowych i historii japońskich figurek kolekcjonerskich anime.",
  particleCount = 15,
  onTitleClick
}) => {
  const containerRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Kursor i tryb pracy trzymamy w ref, NIE w stanie — zmieniają się 60 razy
  // na sekundę, a React nie ma powodu nic wtedy przerysowywać.
  const cursorRef = useRef({ x: 0, y: 0 });
  const staticCursorRef = useRef({ x: 0, y: 0 });
  const autoModeRef = useRef(true);
  const startTimeRef = useRef(Date.now());
  const lastMouseMoveRef = useRef(Date.now());

  const animated = useAnimationAllowed();

  const rows = particleCount;
  const totalParticles = rows * rows;

  // --- Budowa siatki cząstek (tylko gdy animacja jest dozwolona) -------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    particlesRef.current = [];
    if (!animated) return; // dotyk / „mniej ruchu" — zostaje sama poświata

    const centerRow = Math.floor(rows / 2);
    const centerCol = Math.floor(rows / 2);

    for (let i = 0; i < totalParticles; i++) {
      const particle = document.createElement('div');

      const row = Math.floor(i / rows);
      const col = i % rows;
      const distanceFromCenter = Math.sqrt(
        Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
      );

      // Im dalej od środka, tym mniejsza, bledsza i ciemniejsza kropka.
      const scale = Math.max(0.1, 1.2 - distanceFromCenter * 0.12);
      const opacity = Math.max(0.05, 1 - distanceFromCenter * 0.1);
      const lightness = Math.max(15, 75 - distanceFromCenter * 6);
      const glowSize = Math.max(0.5, 6 - distanceFromCenter * 0.5);

      // Tłumienie i opóźnienie zapisujemy przy cząstce — pętla klatek tylko je
      // czyta, zamiast liczyć pierwiastki 225 razy na klatkę.
      particle.dataset.dampening = String(Math.max(0.3, 1 - distanceFromCenter * 0.08));
      particle.dataset.scale = String(scale);

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
        z-index: ${Math.round(totalParticles - distanceFromCenter * 5)};
        transition: transform ${120 + distanceFromCenter * 20}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        transition-delay: ${Math.round(distanceFromCenter * 8)}ms;
      `;

      container.appendChild(particle);
      particlesRef.current.push(particle);
    }

    return () => {
      container.innerHTML = '';
      particlesRef.current = [];
    };
  }, [rows, totalParticles, animated]);

  // --- Jedna pętla klatek: liczy pozycję i pisze wprost do DOM ---------------
  useEffect(() => {
    if (!animated) return;

    const animate = () => {
      const t = (Date.now() - startTimeRef.current) * 0.001;

      if (autoModeRef.current) {
        // Swobodny dryf, gdy nikt nie rusza myszką.
        cursorRef.current = {
          x: Math.sin(t * 0.3) * 200 + Math.sin(t * 0.17) * 100,
          y: Math.cos(t * 0.2) * 150 + Math.cos(t * 0.23) * 80,
        };
      } else {
        const idle = Date.now() - lastMouseMoveRef.current;
        if (idle > 4000) {
          // Długo bez ruchu — wracamy do dryfu.
          autoModeRef.current = true;
          startTimeRef.current = Date.now();
        } else if (idle > 200) {
          // Delikatne „oddychanie" wokół ostatniej pozycji kursora.
          const strength = Math.min((idle - 200) / 1000, 1);
          cursorRef.current = {
            x: staticCursorRef.current.x + Math.sin(t * 1.5) * 20 * strength,
            y: staticCursorRef.current.y + Math.cos(t * 1.2) * 16 * strength,
          };
        }
      }

      const { x, y } = cursorRef.current;
      for (const particle of particlesRef.current) {
        const damp = Number(particle.dataset.dampening);
        particle.style.transform =
          `translate(${x * damp}px, ${y * damp}px) scale(${particle.dataset.scale})`;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [animated]);

  // Ruch myszką przejmuje sterowanie od dryfu. Bez onTouchMove — na dotyku
  // cząstek i tak nie ma, a nasłuch tylko zabierałby gesty przewijania.
  const handlePointerMove = (e) => {
    if (!animated) return;
    const next = {
      x: (e.clientX - window.innerWidth / 2) * 0.8,
      y: (e.clientY - window.innerHeight / 2) * 0.8,
    };
    cursorRef.current = next;
    staticCursorRef.current = next;
    autoModeRef.current = false;
    lastMouseMoveRef.current = Date.now();
  };

  return (
    <div
      className="hero-container relative w-full overflow-hidden"
      onMouseMove={handlePointerMove}
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}
    >
      {/* Siatka cząstek (pusta na urządzeniach dotykowych) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, pointerEvents: 'none' }}>
        <div
          ref={containerRef}
          className="hero-particles"
          style={{
            position: 'relative',
            width: `${rows * 1.8}rem`,
            height: `${rows * 1.8}rem`
          }}
        />
      </div>

      {/* Treść */}
      <div className="relative z-10 text-center px-4">
        {/* Znak i nazwa stoją obok siebie jako jedna całość — tak samo jak na
            wizytówkach i w opisach filmów. Na wąskim ekranie układają się
            jedno pod drugim (index.css), bo w rzędzie nazwa zrobiłaby się
            nieczytelnie mała. */}
        <div className="hero-lockup hero-wejscie-z-gory">
          {/* Znak jest ozdobą przy nazwie, która i tak stoi obok — czytnik
              ekranu przeczytałby ją dwa razy, stąd aria-hidden.
              Tło zamiast <img>, bo są dwie wersje (jasna/ciemna): przeglądarka
              pobiera wtedy tylko tę pasującą do motywu, a nie obie. */}
          <div className="hero-logo" aria-hidden="true" />

          <h1
            className="hero-title"
            onClick={onTitleClick}
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              margin: 0,
              textShadow: '0 10px 30px rgba(255, 71, 87, 0.3)',
              cursor: onTitleClick ? 'pointer' : 'default'
            }}
          >
            {title}
          </h1>
        </div>

        <div className="hero-wejscie-z-dolu">
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
        </div>
      </div>

      {/* Poświata tła. Rozmiary i siła rozmycia schodzą na telefonie (index.css) —
          filter: blur na dużych powierzchniach to najdroższa rzecz w tym widoku. */}
      <div className="hero-ambient" aria-hidden="true">
        <div className="hero-ambient-1" />
        <div className="hero-ambient-2" />
        <div className="hero-ambient-3" />
      </div>
    </div>
  );
};

export default ParticleHero;
