// Deterministyczny kolor poświaty z nazwy figurki (używany w Gablocie i panelu).
// Ta sama paleta i logika co accent 'auto' w [[shortOptions]] — spójny wygląd.
const GLOW_COLORS = ['#00d2d3', '#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff3f34'];

export function generateGlowColor(name) {
  if (!name) return GLOW_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GLOW_COLORS[Math.abs(hash) % GLOW_COLORS.length];
}
