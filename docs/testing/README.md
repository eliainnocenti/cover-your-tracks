# 🕵️ Cover Your Tracks — Complete Testing and Solution Guide

> **Forensics Serious Game — Full Walkthrough for All 6 Scenarios**


## Overview

This directory contains one comprehensive guide per scenario. Each guide covers:

- **Theory** — The forensic concepts and techniques behind the scenario
- **Pre-Quiz answers** — Correct options with full explanations
- **Filesystem / RAM / Network layout** — Complete evidence map
- **Step-by-step walkthrough** — Exactly what to inspect and why
- **Flag solutions** — What to type, matching logic, and point values
- **Hints and scoring** — Cost breakdown and perfect/worst-case calculations
- **Terminal commands** — Commands to test and expected outputs
- **Post-Quiz answers** — Correct options with full explanations
- **Edge cases** — Common mistakes and boundary conditions to test


## Scenario Guides

| # | Guide | Domain | Difficulty | Flags | Key Technique |
|---|-------|--------|-----------|-------|---------------|
| 01 | [The Timestomper](scenario_01_timestomper_guide.md) | Filesystem | ★☆☆☆☆ | 3 | NTFS \$SI vs \$FN timestamp manipulation |
| 02 | [Ghosts in the Sectors](scenario_02_slackspace_guide.md) | Filesystem | ★★☆☆☆ | 3 | Slack space data hiding and file carving |
| 03 | [Ghost in the Machine](scenario_03_ram_injection_guide.md) | RAM/OS | ★★★☆☆ | 3 | DKOM process hiding and code injection |
| 04 | [The Whispering DNS](scenario_04_dns_tunnel_guide.md) | Network | ★★★☆☆ | 3 | DNS tunneling data exfiltration |
| 05 | [Hidden in Plain Sight](scenario_05_steganography_guide.md) | Steganography | ★★★★☆ | 3 | LSB steganography detection |
| 06 | [The Last Stand](scenario_06_boss_level_guide.md) | Combined | ★★★★★ | 4 | Log wiping + DKOM + ICMP tunneling |


## Game Mechanics Quick Reference

### Scoring Engine (from `ScenarioEngine.jsx`)

| Event | Effect |
|-------|--------|
| Starting score | **100 pts** |
| Flag found | **+points** (varies per flag) |
| Cross-Reference | **+points** (varies per connection) |
| Wrong submission | **−5 pts** (min 0) |
| Hint used | **−cost** (10/20/30 per tier) |
| Post-quiz bonus | **+Math.round(postQuizScore × 0.2)** (max +20) |

### Flag Matching Logic (from `InvestigatorNotebook.jsx`)

```javascript
const match = scenario.flags.find(f => {
  if (alreadyFound) return false
  return (
    input.includes(f.target.toLowerCase()) ||
    input.includes(f.finding.toLowerCase()) ||
    input.includes(f.id)
  )
})
```

Your text submission is **lowercased** and checked if it **contains** the flag's `target`, `finding`, or `id`.

### Cross-Reference Logic (from `CrossReference.jsx`)

When a player selects 2 tagged evidence items, the system checks if they match a known connection defined in the scenario data. Matching is bi-directional and checks if the tagged evidence names contain the strings defined in `evidence1` and `evidence2` (case-insensitive).

### Game Phases

```
landing → pre_quiz → investigation → post_quiz → debrief → complete
```

Phase auto-advances to `post_quiz` when all flags are found.


## Quick Answer Key

### Pre-Quiz Answers

| Scenario | Q1 | Q2 | Q3 | Q4 |
|----------|----|----|----|----|
| 01 — Timestomper | B (index 1) | B (index 1) | D (index 3) | B (index 1) |
| 02 — Slack Space | B (index 1) | C (index 2) | C (index 2) | C (index 2) |
| 03 — RAM Injection | B (index 1) | B (index 1) | C (index 2) | B (index 1) |
| 04 — DNS Tunnel | A (index 0) | B (index 1) | B (index 1) | C (index 2) |
| 05 — Steganography | B (index 1) | B (index 1) | C (index 2) | B (index 1) |
| 06 — Boss Level | C (index 2) | B (index 1) | B (index 1) | B (index 1) |

### Post-Quiz Answers

| Scenario | Q1 | Q2 | Q3 | Q4 |
|----------|----|----|----|----|
| 01 — Timestomper | B (index 1) | C (index 2) | B (index 1) | C (index 2) |
| 02 — Slack Space | B (index 1) | B (index 1) | B (index 1) | B (index 1) |
| 03 — RAM Injection | B (index 1) | C (index 2) | B (index 1) | B (index 1) |
| 04 — DNS Tunnel | B (index 1) | B (index 1) | B (index 1) | C (index 2) |
| 05 — Steganography | B (index 1) | B (index 1) | B (index 1) | B (index 1) |
| 06 — Boss Level | C (index 2) | B (index 1) | B (index 1) | B (index 1) |

### All Flags Summary

| Scenario | Flag | Target | Points |
|----------|------|--------|--------|
| 01 | flag_01 | Q2_Report_FINAL.docx — timestomping | 30 |
| 01 | flag_02 | HR_Termination_Draft_v3.docx — timestomping | 30 |
| 01 | flag_03 | timestomp_log.tmp — tool_artifact | 40 |
| 02 | s2_flag_01 | file.pdf — slack space | 30 |
| 02 | s2_flag_02 | CSV fragment — salary data | 35 |
| 02 | s2_flag_03 | salary_export.csv — 0xE5 deletion | 35 |
| 03 | s3_flag_01 | svchost.exe PID 4812 — hidden process | 30 |
| 03 | s3_flag_02 | DKOM — EPROCESS unlinking | 35 |
| 03 | s3_flag_03 | RWX memory region — PE header injection | 35 |
| 04 | s4_flag_01 | exfil-c2.net — suspicious domain | 30 |
| 04 | s4_flag_02 | DNS tunneling — data exfiltration | 35 |
| 04 | s4_flag_03 | passwd file — /etc/passwd | 35 |
| 05 | s5_flag_01 | cat_03.png — anomalous image | 30 |
| 05 | s5_flag_02 | LSB steganography — steganography | 35 |
| 05 | s5_flag_03 | zip archive — embedded payload | 35 |
| 06 | s6_flag_01 | Security.evtx — log wiping | 25 |
| 06 | s6_flag_02 | winlogon_helper.exe — rootkit | 30 |
| 06 | s6_flag_03 | ICMP to 185.220.101.47 — ICMP exfiltration | 30 |
| 06 | s6_flag_04 | winlogon_helper — typosquatting | 15 |

### Views Used Per Scenario

| Scenario | Explorer | Terminal | HEX | RAM | Network |
|----------|----------|----------|-----|-----|---------|
| 01 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 02 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 03 | ❌ | ⚠️ limited | ❌ | ✅ | ❌ |
| 04 | ❌ | ⚠️ limited | ❌ | ❌ | ✅ |
| 05 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 06 | ✅ | ✅ | ✅ | ✅ | ✅ |
