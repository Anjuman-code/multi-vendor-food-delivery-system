export const restaurantFallbackSVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
  <rect width="400" height="300" fill="#f97316"/>
  <rect width="400" height="300" fill="url(#grad)"/>
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="400" y2="300">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#dc2626" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <g transform="translate(200,150)" text-anchor="middle">
    <rect x="-60" y="-45" width="120" height="90" rx="8" fill="white" fill-opacity="0.2" stroke="white" stroke-opacity="0.3" stroke-width="2"/>
    <text x="0" y="-20" font-family="Arial,sans-serif" font-size="32" fill="white" font-weight="bold">🍽️</text>
    <text x="0" y="25" font-family="Arial,sans-serif" font-size="14" fill="white" font-weight="500">Restaurant</text>
  </g>
</svg>
`)}`;

export const foodFallbackSVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
  <rect width="400" height="300" fill="#10b981"/>
  <rect width="400" height="300" fill="url(#grad2)"/>
  <defs>
    <linearGradient id="grad2" x1="0" y1="0" x2="400" y2="300">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#059669" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <g transform="translate(200,150)" text-anchor="middle">
    <circle cx="0" cy="-10" r="50" fill="white" fill-opacity="0.2" stroke="white" stroke-opacity="0.3" stroke-width="2"/>
    <text x="0" y="5" font-family="Arial,sans-serif" font-size="40" fill="white">🍕</text>
    <text x="0" y="45" font-family="Arial,sans-serif" font-size="14" fill="white" font-weight="500">Food Item</text>
  </g>
</svg>
`)}`;
