# Cover Your Tracks — Anti-Forensics Detection Lab

![polito-logo](resources/images/logo_polito.jpg)

> A serious game for the **Computer Forensics & Cyber Crime Analysis** course at Politecnico di Torino.
> Detect anti-forensic techniques across filesystem, memory, and network domains.

## Overview

**Cover Your Tracks** is an interactive, browser-based serious game designed to teach students how to identify anti-forensic techniques used by attackers. Players take on the role of a digital forensic analyst, investigating realistic crime scenarios through a simulated forensic workstation.

Each scenario follows a structured learning loop:

1. **Pre-Quiz** — Assess baseline knowledge of the relevant technique
2. **Investigation** — Explore evidence (filesystem, RAM dumps, network logs) using forensic tools
3. **Flag Submission** — Identify and submit findings (tampered files, hidden processes, covert channels)
4. **Post-Quiz** — Confirm understanding after hands-on investigation
5. **Debrief** — Review the technique, real-world tools, and learning metrics

### Scenarios

| # | Title | Domain | Technique | Difficulty |
|---|-------|--------|-----------|------------|
| 01 | The Timestomper | Filesystem | MAC time manipulation ($SI vs $FN) | ★☆☆☆☆ |
| 02 | Ghosts in the Sectors | Filesystem | Slack space exploitation | ★★☆☆☆ |
| 03 | Ghost in the Machine | RAM | DKOM rootkit / process hiding | ★★★☆☆ |
| 04 | The Whispering DNS | Network | DNS tunneling for data exfiltration | ★★★☆☆ |
| 05 | Hidden in Plain Sight | Steganography | LSB steganography in PNG images | ★★★★☆ |
| 06 | The Last Stand | Combined | Multi-vector anti-forensics (boss level) | ★★★★★ |

## Tech Stack

- **React 18** — Component-based UI
- **Vite** — Fast development server and build tooling
- **Tailwind CSS** — Utility-first CSS (layout layer)
- **Custom CSS Design System** — CRT-inspired forensic terminal aesthetic
- **Lucide React** — Icon library

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/eliainnocenti/forensics-serious-game.git
cd forensics-serious-game

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173/`.

### Build for Production

```bash
npm run build
npm run preview   # Preview the production build locally
```

## Project Structure

```
cover-your-tracks/
├── index.html                    # Entry point
├── package.json                  # Dependencies & scripts
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
└── src/
    ├── main.jsx                  # React root
    ├── App.jsx                   # Game shell & phase router
    ├── styles/
    │   └── index.css             # Design system (CSS variables, CRT theme)
    ├── components/
    │   └── game/
    │       ├── ScenarioEngine.jsx         # State machine (useReducer + Context)
    │       ├── Landing.jsx                # Scenario selection screen
    │       ├── EvidenceNavigator.jsx      # File Explorer / Terminal / HEX / RAM / Network
    │       ├── InvestigatorNotebook.jsx   # Evidence tagging & flag submission
    │       ├── Quiz.jsx                   # Pre/Post quiz with explanations
    │       └── Debrief.jsx                # Learning assessment dashboard
    └── data/
        └── scenarios/
            ├── scenario_01_timestomper.json
            ├── scenario_02_slackspace.json
            ├── scenario_03_ram_injection.json
            ├── scenario_04_dns_tunnel.json
            ├── scenario_05_steganography.json
            └── scenario_06_boss_level.json
```

## Game Architecture

The game uses a **finite state machine** powered by React's `useReducer` + Context API:

```
[Landing] → [Pre-Quiz] → [Investigation] → [Post-Quiz] → [Debrief] → [Complete]
```

### Key Metrics (for Instructor Review)

| Metric | Description |
|--------|-------------|
| `preQuizScore` | Baseline knowledge (%) |
| `postQuizScore` | Knowledge after gameplay (%) |
| `knowledgeDelta` | Learning gain (post − pre) |
| `finalScore` | Investigation quality (base 100 + flag bonuses − penalties) |
| `hintsUsedCount` | Self-sufficiency indicator |
| `wrongAttempts` | Methodical vs. guessing behavior |
| `totalTimeSeconds` | Efficiency |
| `completionRate` | Thoroughness (flags found / total) |

## License

This project is developed for educational purposes as part of the Computer Forensics & Cyber Crime Analysis course at Politecnico di Torino.

## Author

| Name | GitHub | LinkedIn | Email |
| ---- | ------ | -------- | ----- |
| Elia Innocenti | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/eliainnocenti) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/eliainnocenti/) | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:elia.innocenti@studenti.polito.it) |

---

*Developed as part of the Computer Forensics & Cyber Crime Analysis course at Politecnico di Torino.*
