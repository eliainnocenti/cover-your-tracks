# Cover Your Tracks — Anti-Forensics Detection Lab

![polito-logo](resources/images/logo_polito.jpg)

> A serious game for the **Computer Forensics and Cyber Crime Analysis** course at Politecnico di Torino.
> Detect anti-forensic techniques across filesystem, memory, and network domains.

## Overview

**Cover Your Tracks** is an interactive, browser-based serious game designed to teach students how to identify anti-forensic techniques used by attackers. Players take on the role of a digital forensic analyst, investigating realistic crime scenarios through a simulated forensic workstation.

Each scenario follows a structured learning loop:

1. **Pre-Quiz** — Assess baseline knowledge of the relevant technique
2. **Investigation** — Explore evidence (filesystem, RAM dumps, network logs) using forensic tools
3. **Flag Submission** — Identify and submit findings (tampered files, hidden processes, covert channels)
4. **Post-Quiz** — Confirm understanding after hands-on investigation
5. **Debrief** — Review the technique, real-world tools, and learning metrics

### Core Features
- **Scenario-Based Learning**: Play through 6 distinct scenarios covering filesystem, memory, network, and steganography domains.
- **Granular Assessments**: Every scenario features a 4-question pre-quiz and post-quiz to accurately measure the knowledge delta (learning gain) before and after the hands-on investigation.
- **Forensic Utilities**: Investigate evidence using simulated terminal commands (`grep`, `file`, `stat`, `strings`, `xxd`), a hex viewer, memory process analyzer, and network packet inspector.
- **Chain of Custody**: Every action (viewing files, running commands, using hints) is tracked in an immutable session log visible at the end of the game.
- **Cross-Reference Connections**: Players can link multiple pieces of evidence together to uncover hidden narrative connections and earn bonus points.
- **Persistent Leaderboard**: Completed scenarios save to local storage, allowing players to track their progress, time spent, and aim for higher investigation tiers.

### Scenarios

| # | Title | Domain | Technique | Difficulty |
|---|-------|--------|-----------|------------|
| 01 | The Timestomper | Filesystem | MAC time manipulation (\$SI vs \$FN) | ★☆☆☆☆ |
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
git clone https://github.com/eliainnocenti/cover-your-tracks.git
cd cover-your-tracks

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173/`.

### Build for Production

```bash
npm run build
npm run preview  # Preview the production build locally
```

## Project Structure

```
app/
├── index.html           # Entry point
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── src/
    ├── main.jsx         # React root
    ├── App.jsx          # Game shell and phase router
    ├── styles/
    │   └── index.css    # Design system (CSS variables, CRT theme)
    ├── components/
    │   └── game/
    │       ├── ScenarioEngine.jsx         # State machine (useReducer + Context)
    │       ├── Landing.jsx                # Scenario selection screen
    │       ├── Leaderboard.jsx            # Local storage high scores
    │       ├── EvidenceNavigator.jsx      # File Explorer / Terminal / HEX / RAM / Network
    │       ├── InvestigatorNotebook.jsx   # Evidence tagging and flag submission
    │       ├── CrossReference.jsx         # Evidence connection linking mechanic
    │       ├── Quiz.jsx                   # Pre/Post quiz with explanations
    │       ├── ChainOfCustody.jsx         # Investigation audit trail log
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
| `connectionsFound` | Ability to correlate findings across domains |
| `sessionLog` | Chain of custody audit trail of player actions |

## License

This project is developed for educational purposes as part of the Computer Forensics and Cyber Crime Analysis course at Politecnico di Torino.

## Author

| Name | GitHub | LinkedIn | Email |
| ---- | ------ | -------- | ----- |
| Elia Innocenti | [![GitHub](https://img.shields.io/badge/GitHub-Profile-informational?logo=github)](https://github.com/eliainnocenti) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin)](https://www.linkedin.com/in/eliainnocenti/) | [![Email](https://img.shields.io/badge/Email-Send-blue?logo=gmail)](mailto:elia.innocenti@studenti.polito.it) |

---

*Developed as part of the Computer Forensics and Cyber Crime Analysis course at Politecnico di Torino.*
