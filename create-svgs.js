const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'public', 'images');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. ROAD REPAIR
const roadBase = `
  <!-- Sky -->
  <rect x="0" y="0" width="800" height="400" fill="#87CEEB"/>
  <!-- Sun -->
  <circle cx="700" cy="80" r="40" fill="#FFD700"/>
  <!-- Mountains/Hills -->
  <path d="M0,400 L200,200 L450,400 Z" fill="#2E8B57"/>
  <path d="M300,400 L550,150 L800,400 Z" fill="#3CB371"/>
  <!-- Buildings -->
  <rect x="50" y="250" width="120" height="150" fill="#D3D3D3"/>
  <rect x="70" y="280" width="30" height="40" fill="#87CEFA"/>
  <rect x="110" y="280" width="30" height="40" fill="#87CEFA"/>
  <rect x="650" y="200" width="100" height="200" fill="#F5F5DC"/>
  <rect x="670" y="230" width="60" height="30" fill="#87CEFA"/>
  <!-- Trees -->
  <circle cx="250" cy="300" r="50" fill="#006400"/>
  <rect x="240" y="350" width="20" height="50" fill="#8B4513"/>
  <!-- Ground/Sidewalk -->
  <rect x="0" y="380" width="800" height="20" fill="#A9A9A9"/>
`;

const roadBefore = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  ${roadBase}
  <!-- Damaged Road -->
  <path d="M0,400 L800,400 L800,600 L0,600 Z" fill="#696969"/>
  <!-- Potholes -->
  <ellipse cx="300" cy="480" rx="60" ry="20" fill="#303030"/>
  <ellipse cx="320" cy="485" rx="20" ry="10" fill="#1C1C1C"/>
  <ellipse cx="500" cy="540" rx="80" ry="25" fill="#303030"/>
  <ellipse cx="480" cy="545" rx="30" ry="15" fill="#1C1C1C"/>
  <ellipse cx="150" cy="430" rx="40" ry="12" fill="#303030"/>
  <!-- Cracks -->
  <path d="M280,480 L200,520 L150,510" stroke="#1C1C1C" stroke-width="3" fill="none"/>
  <path d="M520,540 L650,490 L700,500" stroke="#1C1C1C" stroke-width="4" fill="none"/>
</svg>`;

const roadAfter = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  ${roadBase}
  <!-- Repaired Road -->
  <path d="M0,400 L800,400 L800,600 L0,600 Z" fill="#4B4B4B"/>
  <!-- New Lane Markings -->
  <rect x="100" y="495" width="80" height="10" fill="#FFFFFF"/>
  <rect x="280" y="495" width="80" height="10" fill="#FFFFFF"/>
  <rect x="460" y="495" width="80" height="10" fill="#FFFFFF"/>
  <rect x="640" y="495" width="80" height="10" fill="#FFFFFF"/>
</svg>`;

fs.writeFileSync(path.join(outDir, 'road_before.svg'), roadBefore);
fs.writeFileSync(path.join(outDir, 'road_after.svg'), roadAfter);


// 2. STREET LIGHTING
const lightBase = `
  <!-- Night Sky -->
  <rect x="0" y="0" width="800" height="450" fill="#0B1021"/>
  <!-- Moon -->
  <circle cx="700" cy="80" r="30" fill="#F0F8FF" opacity="0.8"/>
  <!-- City Skyline Silhouette -->
  <rect x="50" y="200" width="100" height="250" fill="#151B2E"/>
  <rect x="150" y="150" width="120" height="300" fill="#1A2238"/>
  <rect x="270" y="250" width="80" height="200" fill="#151B2E"/>
  <rect x="450" y="100" width="150" height="350" fill="#1A2238"/>
  <rect x="600" y="180" width="120" height="270" fill="#151B2E"/>
  <!-- Street -->
  <rect x="0" y="450" width="800" height="150" fill="#0A0D17"/>
  <rect x="100" y="520" width="80" height="5" fill="#1A2238"/>
  <rect x="280" y="520" width="80" height="5" fill="#1A2238"/>
  <rect x="460" y="520" width="80" height="5" fill="#1A2238"/>
  <rect x="640" y="520" width="80" height="5" fill="#1A2238"/>
  <!-- Light Poles -->
  <rect x="200" y="250" width="10" height="200" fill="#2C354A"/>
  <path d="M200,250 L250,230 L250,240 L210,255 Z" fill="#2C354A"/>
  
  <rect x="550" y="200" width="12" height="250" fill="#2C354A"/>
  <path d="M550,200 L610,175 L610,187 L562,207 Z" fill="#2C354A"/>
`;

const lightBefore = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  ${lightBase}
  <!-- Broken light fixtures -->
  <ellipse cx="245" cy="235" rx="10" ry="5" fill="#151B2E"/>
  <ellipse cx="605" cy="182" rx="12" ry="6" fill="#151B2E"/>
  <!-- Very dark overlay to simulate darkness -->
  <rect x="0" y="0" width="800" height="600" fill="#000000" opacity="0.6"/>
</svg>`;

const lightAfter = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  ${lightBase}
  <!-- Glowing fixtures -->
  <ellipse cx="245" cy="235" rx="10" ry="5" fill="#FFFF99"/>
  <ellipse cx="605" cy="182" rx="12" ry="6" fill="#FFFF99"/>
  
  <!-- Light Cones -->
  <path d="M245,235 L120,450 L370,450 Z" fill="#FFFF99" opacity="0.15"/>
  <path d="M605,182 L420,450 L790,450 Z" fill="#FFFF99" opacity="0.15"/>
  
  <!-- Lit Street Area -->
  <ellipse cx="245" cy="480" rx="150" ry="40" fill="#FFFF99" opacity="0.1"/>
  <ellipse cx="605" cy="480" rx="200" ry="50" fill="#FFFF99" opacity="0.1"/>
</svg>`;

fs.writeFileSync(path.join(outDir, 'lighting_before.svg'), lightBefore);
fs.writeFileSync(path.join(outDir, 'lighting_after.svg'), lightAfter);


// 3. DRINKING WATER
const waterBase = `
  <!-- Sky -->
  <rect x="0" y="0" width="800" height="300" fill="#E0F7FA"/>
  <!-- Trees behind -->
  <circle cx="150" cy="200" r="100" fill="#4CAF50"/>
  <circle cx="250" cy="180" r="120" fill="#388E3C"/>
  <circle cx="650" cy="220" r="90" fill="#4CAF50"/>
  <!-- Ground -->
  <rect x="0" y="300" width="800" height="300" fill="#8D6E63"/>
  <path d="M0,320 Q400,280 800,320 L800,600 L0,600 Z" fill="#A1887F"/>
  <!-- Concrete Platform -->
  <rect x="250" y="380" width="300" height="40" fill="#B0BEC5"/>
  <polygon points="230,420 570,420 600,480 200,480" fill="#90A4AE"/>
  <!-- Main Water Tank / Structure -->
  <rect x="320" y="150" width="160" height="230" fill="#CFD8DC"/>
  <path d="M320,150 L400,100 L480,150 Z" fill="#78909C"/>
`;

const waterBefore = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  ${waterBase}
  <!-- Damaged aspects -->
  <!-- Cracks in tank -->
  <path d="M360,180 L380,220 L350,250 L390,290" stroke="#546E7A" stroke-width="3" fill="none"/>
  <!-- Broken tap -->
  <rect x="390" y="320" width="20" height="10" fill="#607D8B"/>
  <path d="M410,320 L420,340" stroke="#607D8B" stroke-width="8" stroke-linecap="round"/>
  <!-- Rust/Stains -->
  <path d="M390,330 Q400,370 410,380" stroke="#795548" stroke-width="15" opacity="0.4" fill="none"/>
  <!-- Mud puddle -->
  <ellipse cx="400" cy="460" rx="90" ry="25" fill="#5D4037"/>
  <ellipse cx="430" cy="465" rx="40" ry="15" fill="#4E342E"/>
</svg>`;

const waterAfter = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  ${waterBase}
  <!-- Repaired aspects -->
  <!-- New Tap -->
  <rect x="390" y="320" width="30" height="12" fill="#E0E0E0"/>
  <rect x="410" y="332" width="10" height="15" fill="#E0E0E0"/>
  <!-- Clean Flowing Water -->
  <path d="M415,347 C415,380 410,400 415,430" stroke="#29B6F6" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.8"/>
  <!-- Clean grate/drain -->
  <rect x="370" y="440" width="60" height="15" fill="#455A64"/>
  <rect x="375" y="442" width="50" height="2" fill="#263238"/>
  <rect x="375" y="447" width="50" height="2" fill="#263238"/>
  <rect x="375" y="452" width="50" height="2" fill="#263238"/>
  <!-- Small fresh puddle reflecting water -->
  <ellipse cx="400" cy="465" rx="30" ry="8" fill="#81D4FA" opacity="0.6"/>
</svg>`;

fs.writeFileSync(path.join(outDir, 'water_before.svg'), waterBefore);
fs.writeFileSync(path.join(outDir, 'water_after.svg'), waterAfter);

console.log("SVGs created successfully.");
