import React from 'react';

interface DarkroomIconProps {
  className?: string;
  size?: number;
}

/**
 * Skeuomorphic Photographic Darkroom Icon:
 * Classic enameled developing tray containing 3 high-gloss black chemical bottles with vibrant red knurled caps.
 */
export const DarkroomIcon: React.FC<DarkroomIconProps> = ({ className = 'w-8 h-8', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      style={style}
      fill="none"
      role="img"
      aria-label="Rodinal Studio Darkroom Icon"
    >
      <defs>
        <filter id="uiTrayDropShadow" x="-25%" y="-20%" width="150%" height="160%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#000000" floodOpacity="0.7" />
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
        </filter>

        <filter id="uiBottleShadow" x="-35%" y="-20%" width="170%" height="150%">
          <feDropShadow dx="3" dy="12" stdDeviation="7" floodColor="#020305" floodOpacity="0.8" />
        </filter>

        <filter id="uiCapShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.6" />
        </filter>

        <filter id="uiFluidGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <linearGradient id="uiTrayOuterLip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="20%" stopColor="#f8f7f2" />
          <stop offset="65%" stopColor="#e8e4d8" />
          <stop offset="100%" stopColor="#cfc8b8" />
        </linearGradient>

        <linearGradient id="uiTraySkirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d3ccbc" />
          <stop offset="45%" stopColor="#b0a896" />
          <stop offset="100%" stopColor="#7e7766" />
        </linearGradient>

        <linearGradient id="uiTrayBasin" x1="25%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor="#b6afa0" />
          <stop offset="30%" stopColor="#d4cebf" />
          <stop offset="70%" stopColor="#e8e4d9" />
          <stop offset="100%" stopColor="#f5f3ec" />
        </linearGradient>

        <linearGradient id="uiTrayCavityShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3d372c" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#5a5344" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7a7261" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="uiAmberLiquid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="35%" stopColor="#d97706" stopOpacity="0.72" />
          <stop offset="75%" stopColor="#b45309" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#78350f" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="uiTrayRibGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#e6e2d8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6e6858" stopOpacity="0.75" />
        </linearGradient>

        <linearGradient id="uiGlossyBlackCylinder" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#08080a" />
          <stop offset="10%" stopColor="#16171b" />
          <stop offset="25%" stopColor="#383c46" />
          <stop offset="38%" stopColor="#606675" />
          <stop offset="44%" stopColor="#80889c" />
          <stop offset="50%" stopColor="#474c59" />
          <stop offset="62%" stopColor="#1a1c21" />
          <stop offset="85%" stopColor="#0b0c0e" />
          <stop offset="95%" stopColor="#24262c" />
          <stop offset="100%" stopColor="#090a0c" />
        </linearGradient>

        <linearGradient id="uiSharpGlint" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="58%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="uiBottleShoulder" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#555a68" />
          <stop offset="25%" stopColor="#2a2c33" />
          <stop offset="80%" stopColor="#121316" />
          <stop offset="100%" stopColor="#08080a" />
        </linearGradient>

        <linearGradient id="uiThreadedNeck" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0d0e11" />
          <stop offset="30%" stopColor="#383c46" />
          <stop offset="60%" stopColor="#18191d" />
          <stop offset="100%" stopColor="#08080a" />
        </linearGradient>

        <linearGradient id="uiCapRedCylinder" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#660d0d" />
          <stop offset="12%" stopColor="#991b1b" />
          <stop offset="32%" stopColor="#dc2626" />
          <stop offset="46%" stopColor="#ef4444" />
          <stop offset="54%" stopColor="#f87171" />
          <stop offset="68%" stopColor="#dc2626" />
          <stop offset="88%" stopColor="#881337" />
          <stop offset="100%" stopColor="#4c0505" />
        </linearGradient>

        <radialGradient id="uiCapTopDisc" cx="42%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="25%" stopColor="#f87171" />
          <stop offset="65%" stopColor="#dc2626" />
          <stop offset="90%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#550808" />
        </radialGradient>
      </defs>

      {/* 1. Developing Tray */}
      <g id="ui-tray-group" filter="url(#uiTrayDropShadow)">
        <path
          d="M 44 402 C 44 426, 68 446, 96 446 L 416 446 C 444 446, 468 426, 468 402 L 478 274 C 478 256, 458 244, 436 244 L 76 244 C 54 244, 34 256, 34 274 Z"
          fill="url(#uiTraySkirt)"
        />
        <path
          d="M 42 278 C 42 254, 62 240, 88 240 L 424 240 C 450 240, 470 254, 470 278 L 462 396 C 462 422, 438 438, 410 438 L 102 438 C 74 438, 50 422, 50 396 Z"
          fill="url(#uiTrayOuterLip)"
        />
        <path
          d="M 88 242 L 424 242 C 446 242, 464 253, 466 272 C 462 258, 442 246, 420 246 L 92 246 C 70 246, 50 258, 46 272 C 48 253, 66 242, 88 242 Z"
          fill="#ffffff"
          opacity="0.9"
        />
        <path
          d="M 72 284 C 72 268, 88 258, 110 258 L 402 258 C 424 258, 440 268, 440 284 L 432 384 C 432 404, 412 418, 388 418 L 124 418 C 100 418, 80 404, 80 384 Z"
          fill="url(#uiTrayBasin)"
        />
        <path
          d="M 72 284 C 72 268, 88 258, 110 258 L 402 258 C 424 258, 440 268, 440 284 L 438 304 C 420 286, 396 278, 370 278 L 142 278 C 116 278, 92 286, 74 304 Z"
          fill="url(#uiTrayCavityShadow)"
        />
        <path d="M 126 292 L 138 402 L 146 402 L 134 292 Z" fill="url(#uiTrayRibGrad)" />
        <path d="M 188 288 L 196 406 L 204 406 L 196 288 Z" fill="url(#uiTrayRibGrad)" />
        <path d="M 252 286 L 252 408 L 260 408 L 260 286 Z" fill="url(#uiTrayRibGrad)" />
        <path d="M 316 288 L 308 406 L 316 406 L 324 288 Z" fill="url(#uiTrayRibGrad)" />
        <path d="M 378 292 L 366 402 L 374 402 L 386 292 Z" fill="url(#uiTrayRibGrad)" />
        <path
          d="M 82 322 C 82 304, 102 294, 126 294 L 386 294 C 410 294, 430 304, 430 322 L 424 386 C 424 404, 406 414, 384 414 L 128 414 C 106 414, 88 404, 88 386 Z"
          fill="url(#uiAmberLiquid)"
        />
        <ellipse cx="256" cy="312" rx="145" ry="12" fill="#fef08a" opacity="0.3" filter="url(#uiFluidGlow)" />
        <path d="M 126 300 Q 256 312 386 300 Q 256 306 126 300 Z" fill="#ffffff" opacity="0.5" />
        <ellipse cx="210" cy="392" rx="70" ry="8" fill="#ffffff" opacity="0.25" />
      </g>

      {/* 2. Left Bottle */}
      <g id="ui-bottle-left" transform="rotate(-3.5, 172, 280)" filter="url(#uiBottleShadow)">
        <ellipse cx="172" cy="384" rx="44" ry="14" fill="#020304" opacity="0.8" />
        <path
          d="M 136 226 C 136 208, 150 196, 164 194 L 164 180 L 180 180 L 180 194 C 194 196, 208 208, 208 226 L 211 364 C 211 376, 200 384, 186 384 L 158 384 C 144 384, 133 376, 133 364 Z"
          fill="url(#uiGlossyBlackCylinder)"
        />
        <path
          d="M 136 226 C 136 208, 150 196, 164 194 L 180 194 C 194 196, 208 208, 208 226 C 194 216, 150 216, 136 226 Z"
          fill="url(#uiBottleShoulder)"
        />
        <path d="M 134.5 244 C 158 250, 186 250, 209.5 244 L 209.8 251 C 186 257, 158 257, 134.2 251 Z" fill="#07080a" />
        <path d="M 134.2 251 C 158 257, 186 257, 209.8 251 L 210.1 253 C 186 259, 158 259, 134 253 Z" fill="#6d7587" opacity="0.65" />
        <path d="M 133.5 264 C 158 270, 186 270, 210.5 264 L 210.8 271 C 186 277, 158 277, 133.2 271 Z" fill="#07080a" />
        <path d="M 133.2 271 C 158 277, 186 277, 210.8 271 L 211.1 273 C 186 279, 158 279, 133 273 Z" fill="#6d7587" opacity="0.65" />
        <path d="M 133 328 C 158 334, 186 334, 210.8 328 L 211.1 334 C 186 340, 158 340, 132.8 334 Z" fill="#07080a" />
        <path d="M 132.8 334 C 158 340, 186 340, 211.1 334 L 211.4 336 C 186 342, 158 342, 132.5 336 Z" fill="#6d7587" opacity="0.65" />
        <path d="M 152 216 L 160 216 L 159 380 L 151 380 Z" fill="url(#uiSharpGlint)" />
        <path d="M 206 230 C 208 260, 209 320, 210 366 C 207 366, 206 320, 204 230 Z" fill="#ffffff" opacity="0.22" />
        <rect x="163" y="176" width="18" height="18" fill="url(#uiThreadedNeck)" rx="1" />

        <g id="ui-cap-left" filter="url(#uiCapShadow)">
          <rect x="150" y="146" width="44" height="34" rx="4" fill="url(#uiCapRedCylinder)" />
          <line x1="154" y1="152" x2="154" y2="178" stroke="#fca5a5" strokeWidth="1.2" opacity="0.6" />
          <line x1="155.5" y1="152" x2="155.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="158" y1="152" x2="158" y2="178" stroke="#fca5a5" strokeWidth="1.6" opacity="0.75" />
          <line x1="160" y1="152" x2="160" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="163" y1="152" x2="163" y2="178" stroke="#fca5a5" strokeWidth="2" opacity="0.95" />
          <line x1="165.5" y1="152" x2="165.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="169" y1="152" x2="169" y2="178" stroke="#fee2e2" strokeWidth="2.2" opacity="1" />
          <line x1="171.5" y1="152" x2="171.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="175" y1="152" x2="175" y2="178" stroke="#fca5a5" strokeWidth="2" opacity="0.85" />
          <line x1="177.5" y1="152" x2="177.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="181" y1="152" x2="181" y2="178" stroke="#fca5a5" strokeWidth="1.6" opacity="0.65" />
          <line x1="183" y1="152" x2="183" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <ellipse cx="172" cy="147" rx="22" ry="6" fill="url(#uiCapTopDisc)" />
          <ellipse cx="170" cy="146" rx="15" ry="3.5" fill="#ffffff" opacity="0.5" />
          <path d="M 150 178 Q 172 183 194 178 L 194 180 Q 172 185 150 180 Z" fill="#3a0404" />
        </g>
      </g>

      {/* 3. Center Bottle */}
      <g id="ui-bottle-center" filter="url(#uiBottleShadow)">
        <ellipse cx="256" cy="382" rx="48" ry="15" fill="#010203" opacity="0.85" />
        <path
          d="M 214 214 C 214 192, 230 180, 246 178 L 246 162 L 266 162 L 266 178 C 282 180, 298 192, 298 214 L 302 366 C 302 380, 288 388, 272 388 L 240 388 C 224 388, 210 380, 210 366 Z"
          fill="url(#uiGlossyBlackCylinder)"
        />
        <path
          d="M 214 214 C 214 192, 230 180, 246 178 L 266 178 C 282 180, 298 192, 298 214 C 280 202, 232 202, 214 214 Z"
          fill="url(#uiBottleShoulder)"
        />
        <path d="M 212.5 236 C 238 243, 274 243, 299.5 236 L 299.8 243 C 274 250, 238 250, 212.2 243 Z" fill="#07080a" />
        <path d="M 212.2 243 C 238 250, 274 250, 299.8 243 L 300.1 245 C 274 252, 238 252, 212 245 Z" fill="#6d7587" opacity="0.7" />
        <path d="M 211.5 258 C 238 265, 274 265, 300.5 258 L 300.8 265 C 274 272, 238 272, 211.2 265 Z" fill="#07080a" />
        <path d="M 211.2 265 C 238 272, 274 272, 300.8 265 L 301.1 267 C 274 274, 238 274, 211 267 Z" fill="#6d7587" opacity="0.7" />
        <path d="M 211 324 C 238 331, 274 331, 301 324 L 301.3 330 C 274 337, 238 337, 210.7 330 Z" fill="#07080a" />
        <path d="M 210.7 330 C 238 337, 274 337, 301.3 330 L 301.6 332 C 274 339, 238 339, 210.4 332 Z" fill="#6d7587" opacity="0.7" />
        <path d="M 233 204 L 242 204 L 241 384 L 232 384 Z" fill="url(#uiSharpGlint)" />
        <path d="M 297 220 C 299 260, 300 320, 301 368 C 298 368, 297 320, 295 220 Z" fill="#ffffff" opacity="0.22" />
        <rect x="245" y="156" width="22" height="22" fill="url(#uiThreadedNeck)" rx="1.5" />

        <g id="ui-cap-center" filter="url(#uiCapShadow)">
          <rect x="231" y="122" width="50" height="38" rx="4.5" fill="url(#uiCapRedCylinder)" />
          <line x1="236" y1="129" x2="236" y2="158" stroke="#fca5a5" strokeWidth="1.4" opacity="0.55" />
          <line x1="238" y1="129" x2="238" y2="158" stroke="#450a0a" strokeWidth="1.3" opacity="0.75" />
          <line x1="241" y1="129" x2="241" y2="158" stroke="#fca5a5" strokeWidth="1.8" opacity="0.8" />
          <line x1="243.5" y1="129" x2="243.5" y2="158" stroke="#450a0a" strokeWidth="1.3" opacity="0.75" />
          <line x1="247" y1="129" x2="247" y2="158" stroke="#fca5a5" strokeWidth="2.2" opacity="0.95" />
          <line x1="249.5" y1="129" x2="249.5" y2="158" stroke="#450a0a" strokeWidth="1.3" opacity="0.75" />
          <line x1="253.5" y1="129" x2="253.5" y2="158" stroke="#fee2e2" strokeWidth="2.6" opacity="1" />
          <line x1="256.5" y1="129" x2="256.5" y2="158" stroke="#450a0a" strokeWidth="1.3" opacity="0.75" />
          <line x1="261" y1="129" x2="261" y2="158" stroke="#fca5a5" strokeWidth="2.2" opacity="0.9" />
          <line x1="263.5" y1="129" x2="263.5" y2="158" stroke="#450a0a" strokeWidth="1.3" opacity="0.75" />
          <line x1="268" y1="129" x2="268" y2="158" stroke="#fca5a5" strokeWidth="1.8" opacity="0.75" />
          <line x1="270" y1="129" x2="270" y2="158" stroke="#450a0a" strokeWidth="1.3" opacity="0.75" />
          <line x1="274" y1="129" x2="274" y2="158" stroke="#fca5a5" strokeWidth="1.4" opacity="0.55" />
          <line x1="276" y1="129" x2="276" y2="158" stroke="#450a0a" strokeWidth="1.3" opacity="0.75" />
          <ellipse cx="256" cy="123" rx="25" ry="7.5" fill="url(#uiCapTopDisc)" />
          <ellipse cx="253" cy="122" rx="17" ry="4" fill="#ffffff" opacity="0.55" />
          <path d="M 231 158 Q 256 164 281 158 L 281 160 Q 256 166 231 160 Z" fill="#3a0404" />
        </g>
      </g>

      {/* 4. Right Bottle */}
      <g id="ui-bottle-right" transform="rotate(3.5, 340, 280)" filter="url(#uiBottleShadow)">
        <ellipse cx="340" cy="384" rx="44" ry="14" fill="#020304" opacity="0.8" />
        <path
          d="M 304 226 C 304 208, 318 196, 332 194 L 332 180 L 348 180 L 348 194 C 362 196, 376 208, 376 226 L 379 364 C 379 376, 368 384, 354 384 L 326 384 C 312 384, 301 376, 301 364 Z"
          fill="url(#uiGlossyBlackCylinder)"
        />
        <path
          d="M 304 226 C 304 208, 318 196, 332 194 L 348 194 C 362 196, 376 208, 376 226 C 362 216, 318 216, 304 226 Z"
          fill="url(#uiBottleShoulder)"
        />
        <path d="M 302.5 244 C 326 250, 354 250, 377.5 244 L 377.8 251 C 354 257, 326 257, 302.2 251 Z" fill="#07080a" />
        <path d="M 302.2 251 C 326 257, 354 257, 377.8 251 L 378.1 253 C 354 259, 326 259, 302 253 Z" fill="#6d7587" opacity="0.65" />
        <path d="M 301.5 264 C 326 270, 354 270, 378.5 264 L 378.8 271 C 354 277, 326 277, 301.2 271 Z" fill="#07080a" />
        <path d="M 301.2 271 C 326 277, 354 277, 378.8 271 L 379.1 273 C 354 279, 326 279, 301 273 Z" fill="#6d7587" opacity="0.65" />
        <path d="M 301 328 C 326 334, 354 334, 378.8 328 L 379.1 334 C 354 340, 326 340, 300.8 334 Z" fill="#07080a" />
        <path d="M 300.8 334 C 326 340, 354 340, 379.1 334 L 379.4 336 C 354 342, 326 342, 300.5 336 Z" fill="#6d7587" opacity="0.65" />
        <path d="M 320 216 L 328 216 L 327 380 L 319 380 Z" fill="url(#uiSharpGlint)" />
        <path d="M 374 230 C 376 260, 377 320, 378 366 C 375 366, 374 320, 372 230 Z" fill="#ffffff" opacity="0.22" />
        <rect x="331" y="176" width="18" height="18" fill="url(#threadedNeck)" rx="1" />

        <g id="ui-cap-right" filter="url(#uiCapShadow)">
          <rect x="318" y="146" width="44" height="34" rx="4" fill="url(#uiCapRedCylinder)" />
          <line x1="322" y1="152" x2="322" y2="178" stroke="#fca5a5" strokeWidth="1.2" opacity="0.6" />
          <line x1="323.5" y1="152" x2="323.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="326" y1="152" x2="326" y2="178" stroke="#fca5a5" strokeWidth="1.6" opacity="0.75" />
          <line x1="328" y1="152" x2="328" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="331" y1="152" x2="331" y2="178" stroke="#fca5a5" strokeWidth="2" opacity="0.95" />
          <line x1="333.5" y1="152" x2="333.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="337" y1="152" x2="337" y2="178" stroke="#fee2e2" strokeWidth="2.2" opacity="1" />
          <line x1="339.5" y1="152" x2="339.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="343" y1="152" x2="343" y2="178" stroke="#fca5a5" strokeWidth="2" opacity="0.85" />
          <line x1="345.5" y1="152" x2="345.5" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <line x1="349" y1="152" x2="349" y2="178" stroke="#fca5a5" strokeWidth="1.6" opacity="0.65" />
          <line x1="351" y1="152" x2="351" y2="178" stroke="#450a0a" strokeWidth="1.2" opacity="0.75" />
          <ellipse cx="340" cy="147" rx="22" ry="6" fill="url(#uiCapTopDisc)" />
          <ellipse cx="338" cy="146" rx="15" ry="3.5" fill="#ffffff" opacity="0.5" />
          <path d="M 318 178 Q 340 183 362 178 L 362 180 Q 340 185 318 180 Z" fill="#3a0404" />
        </g>
      </g>

      {/* Front Rim Reflection */}
      <path
        d="M 102 438 L 410 438 C 426 438, 442 430, 452 418 C 438 424, 422 428, 404 428 L 108 428 C 90 428, 74 424, 60 418 C 70 430, 86 438, 102 438 Z"
        fill="#ffffff"
        opacity="0.45"
      />
    </svg>
  );
};