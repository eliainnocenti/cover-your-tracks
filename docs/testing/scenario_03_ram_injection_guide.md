# Scenario 03 — Ghost in the Machine

## Full Testing and Solution Guide

> **Domain:** RAM / OS Forensics — Process Injection Detection  
> **Difficulty:** ★★★☆☆ (3/5)  
> **Estimated Time:** 20 minutes  
> **Max Possible Score:** 200 pts


## Table of Contents

1. [Scenario Overview](#1-scenario-overview)
2. [The Theory Behind It](#2-the-theory-behind-it)
3. [Pre-Quiz — Answers and Rationale](#3-pre-quiz--answers--rationale)
4. [RAM Dump Layout](#4-ram-dump-layout)
5. [Investigation Walkthrough](#5-investigation-walkthrough)
6. [Flags — What to Submit and Why](#6-flags--what-to-submit--why)
7. [Hints and Their Cost](#7-hints--their-cost)
8. [Scoring Breakdown](#8-scoring-breakdown)
9. [Views to Test](#9-views-to-test)
10. [Post-Quiz — Answers and Rationale](#10-post-quiz--answers--rationale)
11. [Debriefing Verification](#11-debriefing-verification)
12. [Common Mistakes and Edge Cases](#12-common-mistakes--edge-cases)


## 1. Scenario Overview

**Narrative:**  
A production server at Nexus Financial behaved erratically for 45 minutes. A memory dump was captured with LiME. The `pslist` output looks normal — standard Windows services. But the IR lead says to run `psscan` and compare. Find the ghost process hiding from the kernel.

**Learning Objective:**  
Understand the difference between `pslist` (walks the kernel's active process list) and `psscan` (carves EPROCESS structures from raw memory). Learn how DKOM rootkits unlink processes to hide them.


## 2. The Theory Behind It

### Windows Process Management — The ActiveProcessLinks Chain

Windows tracks every running process using a kernel data structure called **EPROCESS**. Each EPROCESS contains a doubly-linked list entry called **ActiveProcessLinks** that chains all processes together.

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ System   │◄───►│ smss.exe │◄───►│ csrss.exe│◄───►│ svchost  │
│ PID 4    │     │ PID 372  │     │ PID 444  │     │ PID 620  │
│ EPROCESS │     │ EPROCESS │     │ EPROCESS │     │ EPROCESS │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
   Flink/Blink     Flink/Blink     Flink/Blink     Flink/Blink
```

### What is EPROCESS?

**EPROCESS** is the kernel's representation of a process. It contains:
- **Process ID (PID)**
- **Security Token** (privileges)
- **Handle Table** (open handles to objects)
- **Memory Management** info (page directory, VAD tree)
- **ActiveProcessLinks** (Flink/Blink pointers to next/previous process)
- **ImageFileName** (process name)

### pslist vs psscan

| Method | How it works | Limitation |
|--------|-------------|-----------|
| **pslist** | Walks the `ActiveProcessLinks` doubly-linked list from the system process | Misses processes that have been **unlinked** from the list |
| **psscan** | Scans **all of physical memory** for `EPROCESS` pool tags (`Proc`) | Finds ALL EPROCESS structures, regardless of linking status |

### DKOM — Direct Kernel Object Manipulation

DKOM is a rootkit technique that **directly modifies kernel data structures** in memory.

**How process hiding works:**

```
Before DKOM:
  A ←→ B ←→ [MALWARE] ←→ C ←→ D

After DKOM (unlink malware's EPROCESS):
  A ←→ B ←→ C ←→ D

  [MALWARE] still exists in memory with valid Flink/Blink
  pointing to B and C, but B now points to C and C to B.
  
  The process STILL RUNS — the Windows scheduler uses a
  different structure (the dispatcher ready queue), not
  ActiveProcessLinks.
```

**Key insight:** The process is hidden from Task Manager, `pslist`, and `NtQuerySystemInformation()` — but `psscan` finds it because the EPROCESS pool tag still exists in physical memory.

### Process Injection (malfind)

Process injection is when malicious code is inserted into the address space of a legitimate process. Key indicators:

- **PAGE_EXECUTE_READWRITE (RWX)** memory protection — normal code pages are `PAGE_EXECUTE_READ` (RX). RWX means the region was allocated with both write AND execute permissions.
- **PE header (MZ signature)** in an RWX region — a PE executable loaded into writable memory is almost always injected code.
- **Normal `svchost.exe`** never has RWX regions containing PE headers.

### Pool Tags

Windows uses pool tags (`Proc`, `Thre`, `File`, etc.) to label kernel memory allocations. Volatility's `psscan` searches for the `Proc` tag in raw memory, then validates the surrounding data as an EPROCESS structure.


## 3. Pre-Quiz — Answers and Rationale

### Question 1
> **"What is the difference between Volatility's pslist and psscan plugins?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | pslist shows running processes; psscan shows terminated processes | ❌ (both can show running) |
| **1** | **pslist walks the kernel's ActiveProcessLinks list; psscan scans raw memory for EPROCESS structures** | **✅** |
| 2 | pslist shows user-mode processes; psscan shows kernel-mode processes | ❌ |
| 3 | They are identical but psscan is the newer version | ❌ |

**Why:** The fundamental difference is the **data source**: pslist follows kernel pointers (can be manipulated), psscan does brute-force scanning (cannot be hidden from).

### Question 2
> **"What is the EPROCESS structure in Windows?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | A user-space data structure that tracks DLL loads | ❌ (it's kernel-space) |
| **1** | **A kernel data structure representing a process, containing PID, token, and linked-list pointers** | **✅** |
| 2 | An encrypted process descriptor stored in the registry | ❌ |
| 3 | A structure used only by anti-virus software | ❌ |

**Why:** EPROCESS is the **kernel's core process representation**. It exists in kernel memory and contains all the metadata the kernel needs to manage the process.

### Question 3
> **"In Windows memory forensics, what does 'PAGE_EXECUTE_READWRITE' (RWX) permission on a memory region suggest?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The region stores encrypted data | ❌ |
| 1 | The region is a standard code segment loaded by the OS | ❌ |
| **2** | **The region may contain injected code, since normal code pages are read-execute only** | **✅** |
| 3 | The region is part of the Windows kernel | ❌ |

**Why:** Normal executable code is loaded with PAGE_EXECUTE_READ (RX). RWX regions allow code to be both written and executed — a strong indicator of runtime code injection.

### Question 4
> **"Why might an attacker name their malicious process 'svchost.exe'?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Because svchost.exe has higher privileges than other processes | ❌ |
| **1** | **Because the name is common on Windows systems, making the malicious process blend in** | **✅** |
| 2 | Because only processes named svchost.exe can access the network | ❌ |
| 3 | Because Windows will automatically restart any process named svchost.exe | ❌ |

**Why:** svchost.exe is a legitimate Windows service host with many instances running simultaneously. Naming malware 'svchost.exe' makes it difficult to spot among the legitimate copies.


## 4. RAM Dump Layout

### Full Process Table

This scenario has **NO filesystem** — it focuses entirely on the RAM dump and malfind views.

| PID | PPID | Process | pslist | psscan | Suspicious? |
|-----|------|---------|--------|--------|-------------|
| 4 | 0 | System | ✅ | ✅ | ❌ |
| 372 | 4 | smss.exe | ✅ | ✅ | ❌ |
| 444 | 372 | csrss.exe | ✅ | ✅ | ❌ |
| 480 | 372 | wininit.exe | ✅ | ✅ | ❌ |
| 508 | 480 | services.exe | ✅ | ✅ | ❌ |
| 520 | 480 | lsass.exe | ✅ | ✅ | ❌ |
| 620 | 508 | svchost.exe | ✅ | ✅ | ❌ |
| 688 | 508 | svchost.exe | ✅ | ✅ | ❌ |
| 784 | 508 | svchost.exe | ✅ | ✅ | ❌ |
| 860 | 508 | svchost.exe | ✅ | ✅ | ❌ |
| 952 | 508 | spoolsv.exe | ✅ | ✅ | ❌ |
| 1044 | 508 | sqlservr.exe | ✅ | ✅ | ❌ |
| 1200 | 508 | svchost.exe | ✅ | ✅ | ❌ |
| 1580 | 860 | WmiPrvSE.exe | ✅ | ✅ | ❌ |
| 2048 | 1044 | sqlwriter.exe | ✅ | ✅ | ❌ |
| 2200 | 508 | msdtc.exe | ✅ | ✅ | ❌ |
| **4812** | **3021** | **svchost.exe** | **❌ HIDDEN** | **✅** | **🚩 YES** |
| **3021** | **508** | **—** | **❌ HIDDEN** | **✅** | **🚩 YES** |

### Key Anomalies in the Process Table

**PID 4812 — Hidden svchost.exe:**
- **Not visible in pslist** → EPROCESS unlinked from ActiveProcessLinks
- **PPID 3021** → points to a process no longer in the active list
- **Name: svchost.exe** → common process name used for blending in
- **3 threads** → actively executing

**PID 3021 — Ghost Parent:**
- **Not visible in pslist** → also hidden/terminated
- **Name: —** → process has been terminated and partially overwritten
- **0 threads** → no longer executing
- **Pool tag still present** → psscan finds it

### Malfind Output

```
PID:        4812
Process:    svchost.exe
Address:    0x00400000
Protection: PAGE_EXECUTE_READWRITE
Size:       0x1000
Header:     4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00
```

The header bytes `4D 5A` = **"MZ"** — the magic signature of a Windows PE (Portable Executable) file. Finding a PE header in an **RWX memory region** of a process like svchost.exe is a **definitive indicator of code injection**.


## 5. Investigation Walkthrough

### Step 1: Switch to the RAM View

Click the **RAM** tab in the EvidenceNavigator. This displays the process table with columns: PID, PPID, PROCESS, OFFSET, THREADS, FLAGS.

### Step 2: Scan the Process List

Look for:
1. **Red-highlighted rows** — the UI marks `suspicious: true` processes in red
2. **Missing names** — PID 3021 has name `—`
3. **Anomalous PPID values** — PID 4812 has PPID 3021, which doesn't appear in the normal process list

**What you should see:**
- 16 normal processes (green/default color)
- 2 suspicious processes at the bottom (red)

### Step 3: Analyze PID 4812

**Red flags:**
1. **Named svchost.exe** — a common Windows service host; attackers choose this name to blend in
2. **PPID 3021** — this parent doesn't exist in the normal process list
3. **Only visible via psscan** — hidden from pslist means DKOM was used
4. **Only 3 threads** — legitimate svchost.exe instances typically have 6-20 threads

### Step 4: Analyze PID 3021 (Ghost Parent)

**Red flags:**
1. **Name is "—"** — terminated and partially overwritten in memory
2. **0 threads** — no longer executing
3. **PPID 508** — claims services.exe as parent (plausible but unverifiable)
4. **Only visible via psscan** — hidden/terminated

### Step 5: Identify the DKOM Technique

The fact that PID 4812 appears in `psscan` but NOT in `pslist` proves:
- Its EPROCESS structure exists in memory (psscan found the pool tag)
- Its ActiveProcessLinks have been manipulated (pslist can't find it)
- **This is DKOM — Direct Kernel Object Manipulation**

### Step 6: Check the malfind Evidence

The `malfind_output` section shows:
- **PAGE_EXECUTE_READWRITE** at address `0x00400000` in PID 4812
- **MZ header** (4D 5A) — a PE executable is loaded into a writable+executable memory region
- This confirms **code injection** into the hidden svchost.exe process

### Step 7: Tag Evidence

Tag the suspicious processes and the malfind results in your notebook.


## 6. Flags — What to Submit and Why

### Flag 1: Hidden Process (30 points)

**What to type:**
- `svchost.exe PID 4812 is hidden from pslist` ✅
- `svchost.exe PID 4812` ✅ (matches target)
- `hidden process` ✅ (matches finding)

**Why:** The core finding is that PID 4812 exists in memory but is invisible to standard enumeration.

### Flag 2: DKOM Technique (35 points)

**What to type:**
- `DKOM EPROCESS unlinking` ✅
- `DKOM` ✅ (matches target)
- `EPROCESS unlinking` ✅ (matches finding)

**Why:** Identifying the **technique** (DKOM) is more valuable than just noticing the hidden process. It shows the investigator understands *how* the hiding was achieved.

### Flag 3: Code Injection (35 points)

**What to type:**
- `RWX memory region with PE header injection` ✅
- `RWX memory region` ✅ (matches target)
- `PE header injection` ✅ (matches finding)

**Why:** The malfind evidence (MZ header in RWX memory) proves that the hidden process isn't just hiding — it's running **injected malicious code**.


## 7. Hints and Their Cost

| Tier | Cost | Text | What it reveals |
|------|------|------|----------------|
| 1 | −10 pts | "Compare the RAM process table carefully. Some processes might appear in one scan method but not another." | Points toward pslist vs psscan comparison |
| 2 | −20 pts | "Look for a process that exists in psscan output but is hidden from pslist. Check if its parent PID points to a terminated process." | Identifies PID 4812 and its orphan parent |
| 3 | −30 pts | "PID 4812 (svchost.exe) is hidden via DKOM. Its PPID 3021 is a ghost. Run malfind on 4812 — the RWX region with an MZ header proves code injection." | Complete solution |


## 8. Scoring Breakdown

| Component | Points |
|-----------|--------|
| Starting score | 100 |
| Flag 1 (hidden process) | +30 |
| Flag 2 (DKOM) | +35 |
| Flag 3 (PE injection) | +35 |
| Wrong submissions | −5 each |
| Hints | −10, −20, −30 |
| Post-quiz bonus | +0 to +20 |

**Perfect run:** 100 + 30 + 35 + 35 + 20 = **220 pts**


## 9. Views to Test

### RAM View
This is the **primary view** for this scenario. Verify:
- All 18 processes display correctly
- Suspicious processes (PID 4812 and PID 3021) are highlighted in red
- The `SUSPICIOUS` badge with AlertTriangle icon appears in the FLAGS column

### Explorer View
- Should show: **"No filesystem data in this scenario"** (empty panel)
- This scenario has no `filesystem` key, only `ram_dump` and `malfind_output`

### Terminal View
- Standard commands like `ls` should report "No filesystem loaded"
- `help` should still work

### Network View
- Should show: **"No network log in this scenario"**
- This scenario has no `network_log`

### HEX View
- Should show: **"Select a file in the Explorer first"**


## 10. Post-Quiz — Answers and Rationale

### Question 1
> **"What is DKOM (Direct Kernel Object Manipulation)?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | A technique that encrypts kernel memory to prevent forensic analysis | ❌ |
| **1** | **A rootkit technique that modifies kernel data structures (like process linked lists) to hide malicious activity** | **✅** |
| 2 | A Windows API for managing device driver objects | ❌ |
| 3 | A memory compression algorithm used by the Windows kernel | ❌ |

**Why:** DKOM is specifically about **directly modifying in-memory kernel objects** — such as unlinking EPROCESS from the ActiveProcessLinks list — to hide processes, drivers, or other objects.

### Question 2
> **"Why does Volatility's psscan find processes that pslist misses?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | psscan has higher privileges than pslist | ❌ |
| 1 | psscan uses the Windows API while pslist reads raw memory | ❌ (it's the opposite!) |
| **2** | **psscan scans raw memory for EPROCESS pool tags instead of walking the kernel's linked list** | **✅** |
| 3 | psscan only works on Linux memory dumps | ❌ |

**Why:** psscan does a brute-force scan of physical memory looking for the `Proc` pool tag. Since it never walks the ActiveProcessLinks chain, it's immune to DKOM unlinking.

### Question 3
> **"In this scenario, what proved PID 4812 was hidden via DKOM rather than simply terminated?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Its entry in the Windows registry was deleted | ❌ |
| **1** | **It appeared in psscan (raw memory scan) but not in pslist (linked list walk), while still having active threads** | **✅** |
| 2 | Its executable file was missing from disk | ❌ |
| 3 | The Windows Event Log showed it was killed by the kernel | ❌ |

**Why:** DKOM hides a process by unlinking its EPROCESS from the ActiveProcessLinks chain (making pslist miss it), but the process continues running. Finding it via psscan with active threads proves it's hidden, not terminated.

### Question 4
> **"What did the 'MZ' header (4D 5A) found in the RWX memory region of PID 4812 indicate?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The memory region contained compressed data | ❌ |
| **1** | **A Windows PE executable was loaded into writable+executable memory — a sign of code injection** | **✅** |
| 2 | The process was a legitimate Microsoft application | ❌ |
| 3 | The memory region was part of the Windows swap file | ❌ |

**Why:** 'MZ' (4D 5A) is the magic signature of a Windows PE (Portable Executable) file. Finding a PE header inside an RWX memory region means executable code was injected at runtime — it was not loaded normally by the OS.


## 11. Debriefing Verification

Verify the debriefing shows:
- **Title:** "How DKOM Rootkits Hide Processes"
- **Concept:** ActiveProcessLinks doubly-linked list, Flink/Blink pointer manipulation, scheduler uses different structure
- **Real-World Tools:** Volatility pslist/psscan/psxview/malfind, FuTo rootkit by Jamie Butler
- **Case Connection:** PID 4812 as svchost.exe, PPID 3021 terminated, RWX + MZ = injection
- **Further Reading:** psxview, DKOM techniques, EPROCESS internals, pool tags, malfind methodology


## 12. Common Mistakes and Edge Cases

### Testing Edge Cases

| Test | Expected Behavior |
|------|-------------------|
| Clicking Explorer tab | Should show "No filesystem data in this scenario" |
| Clicking Network tab | Should show "No network log in this scenario" |
| Submitting "svchost" (partial match) | Should match target "svchost.exe PID 4812" (contains "svchost") |
| Submitting "PID 4812" | Should match (contained in target string) |
| Submitting "rootkit" | Should match Flag 2 if "DKOM" not yet found (check if "rootkit" is in finding string — **it's NOT**, finding is "EPROCESS unlinking") |

### Common Student Mistakes

1. **Only finding the hidden process, not identifying the technique** — Noticing PID 4812 is hidden is Flag 1, but understanding it's DKOM (Flag 2) requires deeper analysis.
2. **Ignoring the malfind output** — The RWX + MZ evidence (Flag 3) requires understanding process injection, not just process hiding.
3. **Confusing svchost.exe instances** — There are 5 legitimate svchost.exe processes; students need to identify which one is suspicious based on PPID and visibility.
4. **Not checking PID 3021** — The ghost parent process is a clue that supports the DKOM finding.
5. **Trying filesystem commands** — Students may waste time trying `ls`, `stat`, etc. when this is a RAM-only scenario.

### Process Tree Validation

Students should mentally construct the expected Windows process tree:

```
System (4)
├── smss.exe (372)
│   ├── csrss.exe (444)
│   └── wininit.exe (480)
│       ├── services.exe (508)
│       │   ├── svchost.exe (620, 688, 784, 860, 1200)
│       │   ├── spoolsv.exe (952)
│       │   ├── sqlservr.exe (1044)
│       │   │   └── sqlwriter.exe (2048)
│       │   └── msdtc.exe (2200)
│       └── lsass.exe (520)
└── [Hidden by DKOM]
    ├── ??? (3021, terminated)
    └── svchost.exe (4812, PPID→3021)  ← ANOMALY
```

PID 4812's PPID points to PID 3021, which is terminated. In normal Windows operation, orphan processes are rare and suspicious.


## Quick Reference Card

```
┌───────────────────────────────────────────────────┐
│  SCENARIO 03 — GHOST IN THE MACHINE               │
│                                                   │
│  Flag 1: svchost.exe PID 4812 — hidden (30 pts)   │
│  Flag 2: DKOM — EPROCESS unlinking (35 pts)       │
│  Flag 3: RWX memory — PE header injection (35)    │
│                                                   │
│  Key View: RAM tab (primary)                      │
│  Hidden Processes: PID 4812, PID 3021             │
│  Technique: DKOM (ActiveProcessLinks unlink)      │
│  Evidence: malfind — MZ header in RWX at 0x400000 │
│                                                   │
│  Pre-Quiz: 1→B, 2→B, 3→C, 4→B                             │
│  Post-Quiz: 1→B, 2→C, 3→B, 4→B                            │
│                                                   │
│  NO filesystem, NO network log                    │
└───────────────────────────────────────────────────┘
```
