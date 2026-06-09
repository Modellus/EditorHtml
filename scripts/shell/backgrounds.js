const BACKGROUNDS = [
    {
        id: "math-grid",
        title: "Math Workbook",
        category: "Workbook",
        backgroundColor: "#f8f9fa",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#f8f9fa"/>
            <path d="M 10 0 V 100 M 20 0 V 100 M 30 0 V 100 M 40 0 V 100 M 50 0 V 100 M 60 0 V 100 M 70 0 V 100 M 80 0 V 100 M 90 0 V 100" stroke="#cdd6e0" stroke-width="0.3"/>
            <path d="M 0 10 H 100 M 0 20 H 100 M 0 30 H 100 M 0 40 H 100 M 0 50 H 100 M 0 60 H 100 M 0 70 H 100 M 0 80 H 100 M 0 90 H 100" stroke="#cdd6e0" stroke-width="0.3"/>
        </svg>`,
        pattern: {
            width: 40,
            height: 40,
            content: `<path d="M 40 0 V 40 M 0 40 H 40" fill="none" stroke="rgba(100,130,180,0.4)" stroke-width="0.8"/>
                <path d="M 20 0 V 40 M 0 20 H 40" fill="none" stroke="rgba(100,130,180,0.2)" stroke-width="0.5"/>`
        }
    },
    {
        id: "ruled-lines",
        title: "Ruled Notebook",
        category: "Workbook",
        backgroundColor: "#fffef8",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#fffef8"/>
            <path d="M 0 12 H 100 M 0 24 H 100 M 0 36 H 100 M 0 48 H 100 M 0 60 H 100 M 0 72 H 100 M 0 84 H 100 M 0 96 H 100" stroke="#b8cce4" stroke-width="0.5"/>
            <path d="M 12 0 V 100" stroke="#e8a0a0" stroke-width="0.5"/>
        </svg>`,
        pattern: {
            width: 100,
            height: 32,
            content: `<path d="M 0 32 H 100" fill="none" stroke="rgba(140,170,210,0.5)" stroke-width="0.8"/>`
        },
        overlay: `<line x1="40" y1="-1e6" x2="40" y2="1e6" stroke="rgba(200,80,80,0.55)" stroke-width="1.0"/>`
    },
    {
        id: "dot-grid",
        title: "Dot Grid",
        category: "Workbook",
        backgroundColor: "#fafbfc",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#fafbfc"/>
            <circle cx="10" cy="10" r="0.8" fill="#a0b0c8"/><circle cx="30" cy="10" r="0.8" fill="#a0b0c8"/><circle cx="50" cy="10" r="0.8" fill="#a0b0c8"/><circle cx="70" cy="10" r="0.8" fill="#a0b0c8"/><circle cx="90" cy="10" r="0.8" fill="#a0b0c8"/>
            <circle cx="10" cy="30" r="0.8" fill="#a0b0c8"/><circle cx="30" cy="30" r="0.8" fill="#a0b0c8"/><circle cx="50" cy="30" r="0.8" fill="#a0b0c8"/><circle cx="70" cy="30" r="0.8" fill="#a0b0c8"/><circle cx="90" cy="30" r="0.8" fill="#a0b0c8"/>
            <circle cx="10" cy="50" r="0.8" fill="#a0b0c8"/><circle cx="30" cy="50" r="0.8" fill="#a0b0c8"/><circle cx="50" cy="50" r="0.8" fill="#a0b0c8"/><circle cx="70" cy="50" r="0.8" fill="#a0b0c8"/><circle cx="90" cy="50" r="0.8" fill="#a0b0c8"/>
            <circle cx="10" cy="70" r="0.8" fill="#a0b0c8"/><circle cx="30" cy="70" r="0.8" fill="#a0b0c8"/><circle cx="50" cy="70" r="0.8" fill="#a0b0c8"/><circle cx="70" cy="70" r="0.8" fill="#a0b0c8"/><circle cx="90" cy="70" r="0.8" fill="#a0b0c8"/>
            <circle cx="10" cy="90" r="0.8" fill="#a0b0c8"/><circle cx="30" cy="90" r="0.8" fill="#a0b0c8"/><circle cx="50" cy="90" r="0.8" fill="#a0b0c8"/><circle cx="70" cy="90" r="0.8" fill="#a0b0c8"/><circle cx="90" cy="90" r="0.8" fill="#a0b0c8"/>
        </svg>`,
        pattern: {
            width: 24,
            height: 24,
            content: `<circle cx="12" cy="12" r="1.2" fill="rgba(100,130,180,0.5)"/>`
        }
    },
    {
        id: "isometric",
        title: "Isometric Grid",
        category: "Workbook",
        backgroundColor: "#f9fafb",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#f9fafb"/>
            <path d="M 0 20 L 50 0 L 100 20 M 0 40 L 50 20 L 100 40 M 0 60 L 50 40 L 100 60 M 0 80 L 50 60 L 100 80 M 0 100 L 50 80 L 100 100" stroke="#c0d0e0" stroke-width="0.4" fill="none"/>
            <path d="M 0 20 L 50 40 L 100 20 M 0 40 L 50 60 L 100 40 M 0 60 L 50 80 L 100 60 M 0 80 L 50 100 L 100 80" stroke="#c0d0e0" stroke-width="0.4" fill="none"/>
        </svg>`,
        pattern: {
            width: 56,
            height: 32,
            content: `<path d="M 0 16 L 28 0 L 56 16 L 28 32 Z" fill="none" stroke="rgba(100,140,180,0.35)" stroke-width="0.7"/>`
        }
    },
    {
        id: "graph-paper",
        title: "Graph Paper",
        category: "School Manual",
        backgroundColor: "#f5f8f5",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#f5f8f5"/>
            <path d="M 10 0 V 100 M 20 0 V 100 M 30 0 V 100 M 40 0 V 100 M 50 0 V 100 M 60 0 V 100 M 70 0 V 100 M 80 0 V 100 M 90 0 V 100" stroke="#a8d4a8" stroke-width="0.3"/>
            <path d="M 0 10 H 100 M 0 20 H 100 M 0 30 H 100 M 0 40 H 100 M 0 50 H 100 M 0 60 H 100 M 0 70 H 100 M 0 80 H 100 M 0 90 H 100" stroke="#a8d4a8" stroke-width="0.3"/>
            <path d="M 50 0 V 100 M 0 50 H 100" stroke="#70b070" stroke-width="0.6"/>
        </svg>`,
        pattern: {
            width: 50,
            height: 50,
            content: `<path d="M 50 0 V 50 M 0 50 H 50" fill="none" stroke="rgba(80,160,80,0.4)" stroke-width="0.8"/>
                <path d="M 10 0 V 50 M 20 0 V 50 M 30 0 V 50 M 40 0 V 50" fill="none" stroke="rgba(80,160,80,0.18)" stroke-width="0.5"/>
                <path d="M 0 10 H 50 M 0 20 H 50 M 0 30 H 50 M 0 40 H 50" fill="none" stroke="rgba(80,160,80,0.18)" stroke-width="0.5"/>`
        },
        overlay: `<line x1="0" y1="0" x2="1200" y2="0" stroke="rgba(60,130,60,0.5)" stroke-width="1.5"/>
            <line x1="0" y1="0" x2="0" y2="900" stroke="rgba(60,130,60,0.5)" stroke-width="1.5"/>
            <text x="605" y="-8" font-size="10" fill="rgba(60,130,60,0.4)" text-anchor="middle" font-family="serif" font-style="italic">x</text>
            <text x="-12" y="454" font-size="10" fill="rgba(60,130,60,0.4)" text-anchor="middle" font-family="serif" font-style="italic">y</text>
            <rect x="-30" y="-30" width="1260" height="960" fill="none" stroke="rgba(60,130,60,0.3)" stroke-width="1"/>`
    },
    {
        id: "blueprint",
        title: "Blueprint",
        category: "School Manual",
        backgroundColor: "#1a2744",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#1a2744"/>
            <path d="M 10 0 V 100 M 20 0 V 100 M 30 0 V 100 M 40 0 V 100 M 50 0 V 100 M 60 0 V 100 M 70 0 V 100 M 80 0 V 100 M 90 0 V 100" stroke="#2d4a7a" stroke-width="0.3"/>
            <path d="M 0 10 H 100 M 0 20 H 100 M 0 30 H 100 M 0 40 H 100 M 0 50 H 100 M 0 60 H 100 M 0 70 H 100 M 0 80 H 100 M 0 90 H 100" stroke="#2d4a7a" stroke-width="0.3"/>
            <path d="M 50 0 V 100 M 0 50 H 100" stroke="#3d6090" stroke-width="0.6"/>
        </svg>`,
        pattern: {
            width: 50,
            height: 50,
            content: `<path d="M 50 0 V 50 M 0 50 H 50" fill="none" stroke="rgba(100,160,220,0.45)" stroke-width="0.8"/>
                <path d="M 25 0 V 50 M 0 25 H 50" fill="none" stroke="rgba(100,160,220,0.22)" stroke-width="0.5"/>`
        },
        overlay: `<rect x="-40" y="-40" width="1280" height="980" fill="none" stroke="rgba(140,190,240,0.6)" stroke-width="2"/>
            <rect x="-35" y="-35" width="1270" height="970" fill="none" stroke="rgba(140,190,240,0.35)" stroke-width="0.5"/>
            <rect x="800" y="750" width="380" height="120" fill="none" stroke="rgba(140,190,240,0.5)" stroke-width="1"/>
            <line x1="800" y1="790" x2="1180" y2="790" stroke="rgba(140,190,240,0.4)" stroke-width="0.5"/>
            <line x1="800" y1="830" x2="1180" y2="830" stroke="rgba(140,190,240,0.4)" stroke-width="0.5"/>
            <text x="990" y="775" font-size="8" fill="rgba(140,190,240,0.5)" text-anchor="middle" font-family="monospace">TITLE</text>
            <text x="990" y="815" font-size="7" fill="rgba(140,190,240,0.4)" text-anchor="middle" font-family="monospace">SCALE: 1:1</text>
            <text x="990" y="855" font-size="7" fill="rgba(140,190,240,0.4)" text-anchor="middle" font-family="monospace">DATE:</text>`
    },
    {
        id: "physics-vectors",
        title: "Physics Notebook",
        category: "School Manual",
        backgroundColor: "#fafafa",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#fafafa"/>
            <path d="M 0 50 H 100 M 50 0 V 100" stroke="#d0d0d0" stroke-width="0.4"/>
            <path d="M 10 0 V 100 M 20 0 V 100 M 30 0 V 100 M 40 0 V 100 M 60 0 V 100 M 70 0 V 100 M 80 0 V 100 M 90 0 V 100" stroke="#e8e8e8" stroke-width="0.2"/>
            <path d="M 0 10 H 100 M 0 20 H 100 M 0 30 H 100 M 0 40 H 100 M 0 60 H 100 M 0 70 H 100 M 0 80 H 100 M 0 90 H 100" stroke="#e8e8e8" stroke-width="0.2"/>
            <circle cx="50" cy="50" r="20" fill="none" stroke="#d8d8e8" stroke-width="0.3" stroke-dasharray="2,2"/>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#d8d8e8" stroke-width="0.3" stroke-dasharray="2,2"/>
        </svg>`,
        pattern: {
            width: 60,
            height: 60,
            content: `<path d="M 60 0 V 60 M 0 60 H 60" fill="none" stroke="rgba(120,120,150,0.3)" stroke-width="0.7"/>
                <path d="M 30 0 V 60 M 0 30 H 60" fill="none" stroke="rgba(120,120,150,0.15)" stroke-width="0.5"/>
                <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(120,120,180,0.15)" stroke-width="0.5" stroke-dasharray="4,4"/>`
        },
        overlay: `<line x1="-200" y1="450" x2="1400" y2="450" stroke="rgba(80,80,120,0.35)" stroke-width="1.2"/>
            <line x1="600" y1="-200" x2="600" y2="1100" stroke="rgba(80,80,120,0.35)" stroke-width="1.2"/>
            <polygon points="1380,450 1370,446 1370,454" fill="rgba(80,80,120,0.35)"/>
            <polygon points="600,-180 596,-170 604,-170" fill="rgba(80,80,120,0.35)"/>
            <circle cx="600" cy="450" r="120" fill="none" stroke="rgba(100,100,160,0.15)" stroke-width="0.8" stroke-dasharray="6,4"/>
            <circle cx="600" cy="450" r="240" fill="none" stroke="rgba(100,100,160,0.12)" stroke-width="0.8" stroke-dasharray="6,4"/>
            <circle cx="600" cy="450" r="360" fill="none" stroke="rgba(100,100,160,0.09)" stroke-width="0.8" stroke-dasharray="6,4"/>`
    },
    {
        id: "college-ruled",
        title: "College Ruled",
        category: "Notebook",
        backgroundColor: "#fffff8",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#fffff8"/>
            <path d="M 0 11 H 100 M 0 22 H 100 M 0 33 H 100 M 0 44 H 100 M 0 55 H 100 M 0 66 H 100 M 0 77 H 100 M 0 88 H 100 M 0 99 H 100" stroke="#b8d4f0" stroke-width="0.4"/>
            <path d="M 8 0 V 100" stroke="#f0a0a0" stroke-width="0.5"/>
            <circle cx="4" cy="25" r="1.5" fill="none" stroke="#c0c0c0" stroke-width="0.5"/>
            <circle cx="4" cy="75" r="1.5" fill="none" stroke="#c0c0c0" stroke-width="0.5"/>
        </svg>`,
        pattern: {
            width: 100,
            height: 28,
            content: `<path d="M 0 28 H 100" fill="none" stroke="rgba(140,180,220,0.45)" stroke-width="0.8"/>`
        },
        overlay: `<line x1="32" y1="-1e6" x2="32" y2="1e6" stroke="rgba(220,100,100,0.5)" stroke-width="1.0"/>`
    },
    {
        id: "hexagonal",
        title: "Chemistry Grid",
        category: "School Manual",
        backgroundColor: "#fafbfd",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#fafbfd"/>
            <path d="M 15 5 L 25 0 L 35 5 L 35 15 L 25 20 L 15 15 Z M 35 5 L 45 0 L 55 5 L 55 15 L 45 20 L 35 15 Z M 55 5 L 65 0 L 75 5 L 75 15 L 65 20 L 55 15 Z M 75 5 L 85 0 L 95 5 L 95 15 L 85 20 L 75 15 Z" fill="none" stroke="#c0d0e0" stroke-width="0.4"/>
            <path d="M 5 20 L 15 15 L 25 20 L 25 30 L 15 35 L 5 30 Z M 25 20 L 35 15 L 45 20 L 45 30 L 35 35 L 25 30 Z M 45 20 L 55 15 L 65 20 L 65 30 L 55 35 L 45 30 Z M 65 20 L 75 15 L 85 20 L 85 30 L 75 35 L 65 30 Z" fill="none" stroke="#c0d0e0" stroke-width="0.4"/>
            <path d="M 15 35 L 25 30 L 35 35 L 35 45 L 25 50 L 15 45 Z M 35 35 L 45 30 L 55 35 L 55 45 L 45 50 L 35 45 Z M 55 35 L 65 30 L 75 35 L 75 45 L 65 50 L 55 45 Z M 75 35 L 85 30 L 95 35 L 95 45 L 85 50 L 75 45 Z" fill="none" stroke="#c0d0e0" stroke-width="0.4"/>
            <path d="M 5 50 L 15 45 L 25 50 L 25 60 L 15 65 L 5 60 Z M 25 50 L 35 45 L 45 50 L 45 60 L 35 65 L 25 60 Z M 45 50 L 55 45 L 65 50 L 65 60 L 55 65 L 45 60 Z M 65 50 L 75 45 L 85 50 L 85 60 L 75 65 L 65 60 Z" fill="none" stroke="#c0d0e0" stroke-width="0.4"/>
            <path d="M 15 65 L 25 60 L 35 65 L 35 75 L 25 80 L 15 75 Z M 35 65 L 45 60 L 55 65 L 55 75 L 45 80 L 35 75 Z M 55 65 L 65 60 L 75 65 L 75 75 L 65 80 L 55 75 Z M 75 65 L 85 60 L 95 65 L 95 75 L 85 80 L 75 75 Z" fill="none" stroke="#c0d0e0" stroke-width="0.4"/>
            <path d="M 5 80 L 15 75 L 25 80 L 25 90 L 15 95 L 5 90 Z M 25 80 L 35 75 L 45 80 L 45 90 L 35 95 L 25 90 Z M 45 80 L 55 75 L 65 80 L 65 90 L 55 95 L 45 90 Z M 65 80 L 75 75 L 85 80 L 85 90 L 75 95 L 65 90 Z" fill="none" stroke="#c0d0e0" stroke-width="0.4"/>
        </svg>`,
        pattern: {
            width: 40,
            height: 46,
            content: `<path d="M 20 1 L 38 12 L 38 34 L 20 45 L 2 34 L 2 12 Z" fill="none" stroke="rgba(120,150,190,0.35)" stroke-width="0.7"/>`
        },
        overlay: `<rect x="-20" y="-20" width="1240" height="940" fill="none" stroke="rgba(100,130,170,0.35)" stroke-width="1.2"/>
            <line x1="-20" y1="60" x2="1220" y2="60" stroke="rgba(100,130,170,0.25)" stroke-width="0.8"/>
            <text x="600" y="35" font-size="11" fill="rgba(100,130,170,0.4)" text-anchor="middle" font-family="serif">PERIODIC TABLE REFERENCE</text>
            <text x="600" y="52" font-size="8" fill="rgba(100,130,170,0.3)" text-anchor="middle" font-family="serif">Molecular Geometry Workspace</text>`
    },
    {
        id: "sketch-paper",
        title: "Sketch Paper",
        category: "Notebook",
        backgroundColor: "#faf8f4",
        thumbnail_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#faf8f4"/>
            <path d="M 2 15 Q 25 14 50 15 Q 75 16 98 15" stroke="#e0dcd4" stroke-width="0.3" fill="none"/>
            <path d="M 2 30 Q 25 29 50 30 Q 75 31 98 30" stroke="#e0dcd4" stroke-width="0.3" fill="none"/>
            <path d="M 2 45 Q 25 44 50 45 Q 75 46 98 45" stroke="#e0dcd4" stroke-width="0.3" fill="none"/>
            <path d="M 2 60 Q 25 59 50 60 Q 75 61 98 60" stroke="#e0dcd4" stroke-width="0.3" fill="none"/>
            <path d="M 2 75 Q 25 74 50 75 Q 75 76 98 75" stroke="#e0dcd4" stroke-width="0.3" fill="none"/>
            <path d="M 2 90 Q 25 89 50 90 Q 75 91 98 90" stroke="#e0dcd4" stroke-width="0.3" fill="none"/>
        </svg>`,
        pattern: {
            width: 200,
            height: 30,
            content: `<path d="M 0 29 Q 50 28 100 29 Q 150 30 200 29" fill="none" stroke="rgba(160,150,130,0.35)" stroke-width="0.7"/>`
        }
    }
];
