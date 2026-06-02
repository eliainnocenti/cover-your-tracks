# Scenario 06 — The Last Stand (Boss Level)

## Full Testing and Solution Guide

> **Domain:** Combined — Multi-Vector Anti-Forensics  
> **Difficulty:** ★★★★★ (5/5)  
> **Max Possible Score:** 265 pts (4 flags + 3 connections + bonus)


## Table of Contents

1. [Scenario Overview](#1-scenario-overview)
2. [The Theory Behind It](#2-the-theory-behind-it)
3. [Pre-Quiz — Answers and Rationale](#3-pre-quiz--answers--rationale)
4. [Evidence Layout](#4-evidence-layout)
5. [Investigation Walkthrough](#5-investigation-walkthrough)
6. [Cross-Reference Connections](#6-cross-reference-connections)
7. [Flags — What to Submit and Why](#7-flags--what-to-submit--why)
8. [Hints and Their Cost](#8-hints--their-cost)
9. [Scoring Breakdown](#9-scoring-breakdown)
10. [Views to Test](#10-views-to-test)
11. [Post-Quiz — Answers and Rationale](#11-post-quiz--answers--rationale)


## 1. Scenario Overview

**Narrative:**  
Apex Technologies suffered a breach of unknown duration. The attacker was meticulous — anomalies exist across every layer: truncated event logs, extra processes in the memory dump, and unusual ICMP traffic. Three attack vectors. Three layers of anti-forensics.

**Learning Objective:**  
Combine filesystem, memory, and network forensics to analyze a multi-vector attack. Detect log wiping, DKOM rootkit activity with typosquatting, and ICMP tunneling exfiltration.


## 2. The Theory Behind It

### Layer 1 — Log Wiping

Windows Event Logs (`.evtx`) retain events based on configured policy (default ~90 days or 20 MB). Attackers wipe logs using:
- `wevtutil cl Security` — clears the Security log
- Direct `.evtx` file manipulation while the service is stopped
- Tools like **Invoke-Phant0m** (kills Event Log service threads)

**Detection indicators:**
- File size far smaller than expected for the retention period
- Gaps in Event ID sequence
- Modification timestamp during non-business hours
- Presence of Event ID 1102 (audit log cleared)

### Layer 2 — DKOM Rootkit with Typosquatting

Same DKOM technique as Scenario 03 (EPROCESS unlinking), but with an added twist: **typosquatting**.

**Typosquatting in processes:** Naming a malicious process similarly to a legitimate one:
- `winlogon.exe` → legitimate Windows logon process
- `winlogon_helper.exe` → malicious (adds `_helper` suffix)

### Layer 3 — ICMP Tunneling

**ICMP (Internet Control Message Protocol)** is used for diagnostics (ping). Normal ICMP echo payloads are **32 bytes**. Attackers embed exfiltrated data in oversized payloads.

**Key indicators:**
- Payload size >> 32 bytes (this scenario: **1,400 bytes**)
- Destination is a known **Tor exit node** (anonymization)
- Payloads contain **printable ASCII** (not random padding)
- Repeated bursts to the same destination


## 3. Pre-Quiz — Answers and Rationale

### Question 1
> "How long does Windows retain security event logs by default?"

| # | Option | Correct? |
|---|--------|----------|
| 0 | 7 days | ❌ |
| 1 | 30 days | ❌ |
| **2** | **90 days (or until the log file reaches its maximum size)** | **✅** |
| 3 | Indefinitely | ❌ |

### Question 2
> "What is ICMP primarily used for?"

| # | Option | Correct? |
|---|--------|----------|
| 0 | Transferring files between servers | ❌ |
| **1** | **Sending diagnostic messages like ping and error reports** | **✅** |
| 2 | Encrypting network traffic | ❌ |
| 3 | Managing DNS records | ❌ |


## 4. Evidence Layout

### Filesystem

```
C:\
├── Windows/System32/winevt/
│   └── Security.evtx          ← 🚩 TRUNCATED (Flag 1)
└── Users/admin_svc/AppData/
    └── wevtutil_clear.bat     ← 🔍 Corroborating (log-clearing script)
```

**Security.evtx anomalies:**
- Size: **512 KB** (expected ~18 MB for 90 days)
- Only **3 days** of logs remain
- Modified at **03:14 AM** (outside business hours)
- **4-hour gap** between Event 4624 (logon at 23:02) and Event 4647 (logoff at 03:08)

**wevtutil_clear.bat content:**
```batch
@echo off
wevtutil cl Security
wevtutil cl System
wevtutil cl Application
echo Logs cleared at %DATE% %TIME% >> clear.log
del /f /q "%~f0"
REM Self-deleting script (but timestamps remain)
```

### RAM Dump (24 processes, 2 hidden)

| PID | PPID | Process | pslist | psscan | Notes |
|-----|------|---------|--------|--------|-------|
| 4–2600 | — | 20 normal processes | ✅ | ✅ | Standard Windows services |
| 2800 | 1400 | explorer.exe | ✅ | ✅ | Normal |
| 3020 | 2800 | chrome.exe | ✅ | ✅ | Normal |
| 3200 | 2800 | notepad.exe | ✅ | ✅ | Normal |
| **3580** | **0** | **winlogon_helper.exe** | **❌** | **✅** | **🚩 DKOM hidden, typosquatting** |
| **3744** | **0** | **cmd.exe** | **❌** | **✅** | **🚩 DKOM hidden, SYSTEM shell** |

**PID 3580 red flags:**
- Name mimics `winlogon.exe` with `_helper` suffix (typosquatting)
- PPID 0 is invalid for user processes
- Running as SYSTEM
- Hidden from pslist via DKOM

**PID 3744 red flags:**
- `cmd.exe` running as SYSTEM with no visible parent
- Likely spawned by the rootkit for command execution

### Network Log (ICMP tunneling)

| Time | Src | Dst | Protocol | Info |
|------|-----|-----|----------|------|
| 02:15:01 | 10.1.1.50 | **185.220.101.47** | ICMP | Echo request, **payload=1400 bytes** |
| 02:15:01 | 185.220.101.47 | 10.1.1.50 | ICMP | Echo reply, payload=1400 bytes |
| 02:15:02–08 | 10.1.1.50 | 185.220.101.47 | ICMP | Multiple 1400-byte requests with printable ASCII |
| 02:15:03 | 10.1.1.50 | 8.8.8.8 | DNS | Normal query (decoy) |
| 02:15:07 | 10.1.1.50 | 10.1.1.1 | ARP | Normal ARP |
| 02:15:12 | 10.1.1.50 | 10.1.1.20 | TCP | Normal HTTPS |

**ICMP anomalies:**
- Normal ping payload: **32 bytes** → these are **1,400 bytes** (43× larger)
- Destination **185.220.101.47** is a **known Tor exit node**
- Payloads contain **printable ASCII** (not random padding)
- Multiple requests in rapid succession (exfiltration burst)

### Question 3
> **"In a Windows environment, what does a PPID of 0 indicate for a user-mode process?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The process was started by the network service | ❌ |
| **1** | **It is an invalid/anomalous state, as user-mode processes should have a valid parent like explorer.exe or services.exe** | **✅** |
| 2 | The process is a legitimate system idle thread | ❌ |
| 3 | The process is running in safe mode | ❌ |

**Why:** All normal user-mode processes have a parent process ID (PPID) pointing to the process that launched them. A PPID of 0 for a process like 'winlogon_helper.exe' is a strong indicator of malicious tampering or rootkit activity.

### Question 4
> **"What is 'typosquatting' in the context of process execution?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Executing a program with incorrect command-line arguments | ❌ |
| **1** | **Naming malicious processes very similarly to legitimate system processes to avoid visual detection** | **✅** |
| 2 | Crashing a program by overflowing its text buffers | ❌ |
| 3 | Modifying the system font to hide text in the terminal | ❌ |

**Why:** Typosquatting relies on human error or quick visual scanning. Naming a rootkit 'winlogon_helper.exe' or 'svch0st.exe' allows it to blend in with legitimate system processes like 'winlogon.exe' or 'svchost.exe' in task managers.
## 5. Investigation Walkthrough

### Layer 1: Filesystem — Detect Log Wiping & Gate

1. **Observe the Lock:** Navigate to `C:\Windows\System32\winevt\Security.evtx`. Because of anti-spoiler gating, its Standard Information timestamps and content preview are **locked** under an `[!] ADVANCED FORENSIC ANALYSIS REQUIRED` banner.
2. **Execute Terminal Audit:** Switch to the **Terminal** tab. To audit the event log binary structure and extract readable elements:
   ```bash
   strings Security.evtx
   ```
   (Alternatively, run `file Security.evtx` or `xxd Security.evtx`).
3. **Verify in GUI:** Return to the **Explorer** tab. Select `Security.evtx`. The file details are now fully unlocked. Observe:
   - Size is only 512 KB (should be ~18 MB for 90 days).
   - Modified at 03:14 AM — highly suspicious off-hours activity.
   - **Content preview:** Only 3 days of logs, with a massive 4-hour gap from 23:02 to 03:08.
4. Navigate to `Users\admin_svc\AppData\wevtutil_clear.bat` in the explorer, read the content (a script that clears event logs and self-deletes), and **Tag evidence** on both `Security.evtx` and `wevtutil_clear.bat`.

### Layer 2: RAM — Find the Hidden Rootkit

1. **Observe the Lock:** Switch to the **RAM** tab. Note that all processes display standard default layouts, and selecting any of them displays the analysis required lock card.
2. **Execute Memory Forensics:** Switch to the **Terminal** tab. Execute volatility plugins to list and scan physical allocations:
   ```bash
   volatility psscan
   ```
   Observe the list. Psscan flags that it has discovered two processes—`winlogon_helper.exe` (PID 3580) and `cmd.exe` (PID 3744)—that are completely hidden from the standard kernel list.
3. **Verify in GUI:** Return to the **RAM** tab and toggle the view mode to **`psscan`**:
   - Count processes: psscan shows 24 processes while pslist only shows 22.
   - Find **PID 3580** (`winlogon_helper.exe`): It is highlighted in red, showing the `pslist: NOT FOUND` unlinked anomaly alert. Notice the name typosquats the legitimate `winlogon.exe` and has an invalid PPID of 0.
   - Find **PID 3744** (`cmd.exe`): It is a hidden, SYSTEM-level shell with no parent.
4. **Tag evidence** on both `winlogon_helper.exe` and `cmd.exe`.

### Layer 3: Network — Identify ICMP Exfiltration

1. **Observe the Lock:** Switch to the **Network** tab. Click on any packet. Note that packet details, flags (`⚠ SUSPICIOUS`), and exfiltrated payloads are locked under the advanced analysis gate.
2. **Execute Network Auditing:** Switch to the **Terminal** tab and perform stream filtering and registry IOC checks:
   - Run `tshark` to isolate ICMP packets:
     ```bash
     tshark -f icmp
     ```
     Observe the output showing multiple oversized 1,400-byte ICMP packets going to `185.220.101.47`.
   - Run a WHOIS registry lookup on the suspicious destination IP:
     ```bash
     whois 185.220.101.47
     ```
     The output alerts you that this IP corresponds to a known **Tor exit node**!
3. **Verify in GUI:** Return to the **Network** tab. You will find that all packets are now unlocked. Select any ICMP packet and observe:
   - Dest: **185.220.101.47**
   - Payload: **1,400 bytes** (normal ping is 32 bytes).
   - Flags: **`⚠ SUSPICIOUS`** is unlocked.
4. **Tag evidence** on the oversized ICMP packet.

### Reconstruct the Kill Chain

| Time | Event | Layer |
|------|-------|-------|
| 02:15:01–08 | ICMP exfiltration to Tor node | Network |
| 23:02 | admin_svc logs in | Filesystem |
| 23:02–03:08 | 4-hour operational window (hidden by log gap) | Combined |
| 03:08 | admin_svc logs off | Filesystem |
| 03:10 | wevtutil_clear.bat created | Filesystem |
| 03:14 | Security logs cleared | Filesystem |
| Persistent | winlogon_helper.exe + cmd.exe hidden via DKOM | RAM |


## 6. Cross-Reference Connections

This scenario features cross-reference links where players can combine evidence across the three domains:

### Connection 1: Log Wiping Timeline (15 points)
- **Evidence 1:** `wevtutil_clear.bat`
- **Evidence 2:** `Security.evtx`
- **Description:** Links the batch script's execution time (03:14 AM) with the exact last-modified timestamp of the truncated event log file.
- **Matching Behavior:** Matches display name `wevtutil_clear.bat` against `Security.evtx` case-insensitively.

### Connection 2: Exfiltration Source (15 points)
- **Evidence 1:** `winlogon_helper.exe`
- **Evidence 2:** `185.220.101.47` (Any tagged ICMP packet containing this Tor exit node destination IP)
- **Description:** Connects the DKOM-hidden rootkit process to the ICMP tunneling exfiltration traffic (both ran as SYSTEM during the same active window).
- **Matching Behavior:** The process is tagged in the UI as `"winlogon_helper.exe (PID 3580)"`, which includes `"winlogon_helper.exe"`. The exfiltration network packet is tagged with a display name containing the Tor IP `"185.220.101.47"`. The connection engine successfully matches these using case-insensitive substring matching.

### Connection 3: The Blind Spot (15 points)
- **Evidence 1:** `Security.evtx`
- **Evidence 2:** `185.220.101.47` (Any tagged ICMP packet containing this Tor exit node destination IP)
- **Description:** Correlates the 4-hour event log gap (23:02–03:08) with the exact timeframe of the ICMP exfiltration (02:15).
- **Matching Behavior:** Matches the tagged event log `"Security.evtx"` against any tagged network packet containing `"185.220.101.47"` case-insensitively.

## 7. Flags — What to Submit and Why

### Flag 1: Log Wiping (25 points)

**What to type:**
- `Security.evtx has been truncated — log wiping` ✅
- `Security.evtx` ✅ (matches target)
- `log wiping` ✅ (matches finding)

### Flag 2: Rootkit / Hidden Process (30 points)

**What to type:**
- `winlogon_helper.exe is hidden via DKOM rootkit` ✅
- `winlogon_helper.exe` ✅ (matches target)
- `rootkit` ✅ (matches finding)

### Flag 3: ICMP Exfiltration (30 points)

**What to type:**
- `ICMP tunneling to 185.220.101.47 Tor exit node` ✅
- `ICMP to 185.220.101.47` ✅ (matches target)
- `ICMP exfiltration` ✅ (matches finding)

### Flag 4: BONUS — Typosquatting (15 points)

**What to type:**
- `winlogon_helper typosquatting winlogon.exe` ✅
- `winlogon_helper` ✅ (matches target)
- `typosquatting` ✅ (matches finding)

> **Note:** This is a **bonus flag** — students who identify the specific naming deception get extra points.


## 8. Hints and Their Cost

| Tier | Cost | Text |
|------|------|------|
| 1 | -10 | "Start with the filesystem: check the event log file. How many days of logs should there be vs. how many are actually there?" |
| 2 | -20 | "Layer 2 — RAM: pslist shows 22 processes, but psscan shows 24. Find the two hidden ones. One has a name very similar to a real Windows process." |
| 3 | -30 | "Layer 3 — Network: Look at the ICMP traffic. Normal ping payloads are 32 bytes. These are 1400 bytes each, going to a known Tor exit node." |


## 9. Scoring Breakdown

| Component | Points |
|-----------|--------|
| Starting score | 100 |
| Flag 1 (log wiping) | +25 |
| Flag 2 (rootkit) | +30 |
| Flag 3 (ICMP exfil) | +30 |
| Flag 4 (typosquatting bonus) | +15 |
| Connection 1 (Script ↔ Log) | +15 |
| Connection 2 (Rootkit ↔ ICMP) | +15 |
| Connection 3 (Log gap ↔ ICMP) | +15 |
| Wrong submissions | -5 each |
| Hints | -10, -20, -30 |
| Post-quiz bonus | +0 to +20 |

**Perfect run:** 100 + 25 + 30 + 30 + 15 + 15 + 15 + 15 + 20 = **265 pts**


## 10. Views to Test

This is the only scenario that uses **ALL THREE data sources** (filesystem + RAM + network). Verify:
- **Explorer tab:** Shows C:\ tree with Security.evtx and wevtutil_clear.bat
- **RAM tab:** Shows 24 processes with 2 suspicious (red highlighted)
- **Network tab:** Shows 13 packets with ICMP packets highlighted in amber
- **Terminal:** `ls`, `stat`, `cat` commands should work on filesystem files
- **HEX:** Should work when a file is selected in Explorer


## 11. Post-Quiz — Answers and Rationale

### Question 1
> "How can an attacker truncate Windows Event Logs without triggering Event ID 1102 (audit log cleared)?"

| # | Option | Correct? |
|---|--------|----------|
| 0 | They cannot — 1102 is always generated | ❌ |
| 1 | By using wevtutil cl with the /q flag | ❌ |
| **2** | **By directly manipulating the .evtx file on disk while the service is stopped, or by corrupting the log file structure** | **✅** |
| 3 | By deleting Security.evtx and restarting the service | ❌ |

### Question 2
> "What makes ICMP tunneling effective for covert exfiltration?"

| # | Option | Correct? |
|---|--------|----------|
| 0 | ICMP is encrypted by default | ❌ |
| **1** | **ICMP traffic is rarely inspected by firewalls and IDS, and the protocol allows arbitrary payload data in echo requests** | **✅** |
| 2 | ICMP has no maximum payload size limit | ❌ |
| 3 | ICMP packets cannot be captured by sniffers | ❌ |

### Question 3
> **"How did the three attack layers in this scenario work together to maximize the attacker's operational security?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Each layer encrypted a different part of the stolen data | ❌ |
| **1** | **The rootkit hid the exfiltration process, ICMP tunneled the data past the firewall, and log wiping erased the evidence trail** | **✅** |
| 2 | The layers were independent and did not interact | ❌ |
| 3 | Each layer targeted a different victim machine on the network | ❌ |

**Why:** The DKOM rootkit hid the malicious processes from system tools, ICMP tunneling bypassed network monitoring by using a rarely-inspected protocol, and log wiping removed the audit trail — each layer covering for the others.

### Question 4
> **"What evidence proved the event logs had been deliberately truncated rather than simply rolled over by normal retention?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The log file was encrypted | ❌ |
| **1** | **The file was only 512 KB (expected ~18 MB for 90-day retention), was modified at 3:14 AM, and a log-clearing batch script was found** | **✅** |
| 2 | The log file had a different file extension | ❌ |
| 3 | Windows reported an error when opening the log file | ❌ |

**Why:** Three corroborating indicators: the file was 97% smaller than expected, was modified during off-hours (03:14 AM), and a self-deleting batch script (wevtutil_clear.bat) containing 'wevtutil cl Security' was found in the user's AppData.


## Quick Reference Card

```
┌────────────────────────────────────────────────────┐
│  SCENARIO 06 — THE LAST STAND (BOSS LEVEL)         │
│                                                    │
│  Flag 1: Security.evtx — log wiping (25 pts)       │
│  Flag 2: winlogon_helper.exe — rootkit (30 pts)    │
│  Flag 3: ICMP to 185.220.101.47 — exfil (30 pts)   │
│  Flag 4: winlogon_helper — typosquatting (15 pts)  │
│                                                    │
│  Connections (15 pts each):                        │
│  - wevtutil_clear.bat ↔ Security.evtx              │
│  - winlogon_helper.exe ↔ ICMP exfil traffic        │
│  - Security.evtx ↔ ICMP exfil traffic              │
│                                                    │
│  Three Layers: Filesystem + RAM + Network          │
│  Kill Chain: Exfil → Ops → Log wipe → Persist      │
│                                                    │
│  Pre-Quiz: 1→C, 2→B, 3→B, 4→B                      │
│  Post-Quiz: 1→C, 2→B, 3→B, 4→B                     │
│                                                    │
│  ALL views used (Explorer, RAM, Network)           │
└────────────────────────────────────────────────────┘
```
