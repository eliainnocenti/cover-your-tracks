# Scenario 02 — Ghosts in the Sectors

## Full Testing and Solution Guide

> **Domain:** File System Forensics — Slack Space Exploitation  
> **Difficulty:** ★★☆☆☆ (2/5)
> **Max Possible Score:** 200 pts


## Table of Contents

1. [Scenario Overview](#1-scenario-overview)
2. [The Theory Behind It](#2-the-theory-behind-it)
3. [Pre-Quiz — Answers and Rationale](#3-pre-quiz--answers--rationale)
4. [Filesystem Layout](#4-filesystem-layout)
5. [Investigation Walkthrough](#5-investigation-walkthrough)
6. [Flags — What to Submit and Why](#6-flags--what-to-submit--why)
7. [Hints and Their Cost](#7-hints--their-cost)
8. [Scoring Breakdown](#8-scoring-breakdown)
9. [Terminal Commands to Test](#9-terminal-commands-to-test)
10. [Post-Quiz — Answers and Rationale](#10-post-quiz--answers--rationale)
11. [Debriefing Verification](#11-debriefing-verification)


## 1. Scenario Overview

**Narrative:**  
An employee at Meridian Corp (ajiang) is suspected of exfiltrating trade secrets before jumping to a competitor. The filesystem looks clean, but some file sizes don't match their cluster allocations. You must investigate the slack space and find what's hiding between the sectors.

**Learning Objective:**  
Understand how slack space works in FAT/NTFS filesystems, how data can persist in unallocated cluster space after a file is written, and how forensic tools like `foremost` perform file carving to recover hidden content.


## 2. The Theory Behind It

### What is Slack Space?

Slack space is the **difference between a file's logical size and the physical space allocated to it on disk**. It exists because filesystems allocate storage in fixed-size units called **clusters**.

### How Cluster Allocation Works

```
Cluster size: 4,096 bytes (4 KB) — typical for NTFS

File size: 2,400 bytes
Clusters allocated: 1 cluster = 4,096 bytes
Slack space: 4,096 - 2,400 = 1,696 bytes
```

The OS only writes the file's 2,400 bytes. The remaining 1,696 bytes **retain whatever data was previously stored in that cluster** — typically from a deleted file.

### Two Types of Slack

1. **RAM Slack** (sector slack): The gap between the file's end and the end of the current disk sector (512 bytes). Historically padded with zeros by some OS versions.
2. **File Slack** (drive slack): The gap between the end of the last used sector and the end of the last allocated cluster. This retains **old data** and is the primary forensic target.

### Why Data Persists

When a file is **deleted** in FAT/NTFS:
- The directory entry is marked as deleted (first byte → `0xE5` in FAT)
- The cluster chain is marked as "available"
- **The actual data on disk is NOT overwritten**

When a **new, smaller file** is written to those clusters:
- Only the bytes for the new file are written
- The remaining bytes (slack) still contain the old data

### Deliberate Slack Space Abuse

Attackers can also **intentionally hide data** in slack space using tools like `slacker`. Since most file viewers only show the logical file content, slack-space data is invisible to casual inspection.

### File Carving

**File carving** is the process of scanning raw disk data (or slack regions) for known file signatures (magic bytes) to reconstruct files, even when filesystem metadata has been deleted. Tools:
- `foremost` — scans for file headers/footers
- `scalpel` — configurable carving tool
- `PhotoRec` — photo/document recovery
- EnCase / FTK — commercial tools with built-in carving

### The 0xE5 Deletion Marker (FAT)

In FAT file systems, when a file is deleted:
- The **first byte of the filename** in the directory entry is replaced with `0xE5`
- The rest of the directory entry (including cluster pointers and timestamps) remains intact
- This is why forensic tools can often recover the original filename (except the first character)


## 3. Pre-Quiz — Answers and Rationale

### Question 1
> **"What is 'slack space' in a filesystem?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Unused space at the end of a disk partition | ❌ (that's "unallocated space") |
| **1** | **The difference between a file's logical size and the space actually allocated to it on disk** | **✅** |
| 2 | A reserved area for the operating system swap file | ❌ |
| 3 | Empty space between directory entries in the MFT | ❌ |

**Why:** Slack space is specifically the gap within an allocated cluster, between where the file's data ends and where the cluster ends.

### Question 2
> **"In a FAT directory entry, what does the byte value 0xE5 at the start of a filename indicate?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The file is encrypted | ❌ |
| 1 | The file is a system file | ❌ |
| **2** | **The file has been deleted (but data may still be on disk)** | **✅** |
| 3 | The file is compressed | ❌ |

**Why:** `0xE5` is the FAT deletion marker. It replaces the first byte of the filename, but the actual data clusters remain intact until overwritten by a new file.

### Question 3
> **"If a 3,000-byte file is stored on a filesystem with 4,096-byte clusters, how many bytes of slack space exist?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | 0 bytes | ❌ |
| 1 | 1,000 bytes | ❌ |
| **2** | **1,096 bytes** | **✅** |
| 3 | 4,096 bytes | ❌ |

**Why:** Slack space = cluster size - file size = 4,096 - 3,000 = 1,096 bytes. This space may contain remnants of previously stored data.

### Question 4
> **"What happens to the actual data on disk when a file is deleted in FAT or NTFS?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The data is immediately overwritten with zeros | ❌ |
| 1 | The data is encrypted and marked as unreadable | ❌ |
| **2** | **The data remains on disk until another file overwrites those clusters** | **✅** |
| 3 | The data is moved to a hidden recovery partition | ❌ |

**Why:** Deleting a file only modifies the directory entry and marks the clusters as available. The actual data bytes remain on disk until they are overwritten by new data.


## 4. Filesystem Layout

```
D:\
├── Projects/
│   ├── file.pdf              ← 🚩 2,400B in 4,096B cluster (1,696B slack!) (Flag 1)
│   ├── meeting_notes.docx    ← ✅ Normal (2,180B slack but no hidden data)
│   └── budget_2024.xlsx      ← ✅ Normal (2,364B slack but no hidden data)
├── $Recycle.Bin/
│   └── å5alary_export.csv   ← 🚩 Deleted file (0xE5 marker) (Flag 3)
└── forensics_output/
    └── foremost_output.txt   ← 🔍 Carving results showing the hidden CSV (Flag 2)
```

### Key Measurements

| File | Logical Size | Allocated Size | Cluster Size | Slack |
|------|-------------|---------------|-------------|-------|
| file.pdf | 2,400 B | 4,096 B | 4,096 B | **1,696 B** |
| meeting_notes.docx | 18,300 B | 20,480 B | 4,096 B | 2,180 B |
| budget_2024.xlsx | 34,500 B | 36,864 B | 4,096 B | 2,364 B |

Note: All three files have slack space, but only `file.pdf` has **meaningful hidden data** in its slack. The other two are red herrings with normal slack residue.


## 5. Investigation Walkthrough

### Step 1: Notice the File Size Discrepancy & Gate

In the Explorer, click on `file.pdf` in the Projects directory.

**Key observations in the metadata panel:**
- **Advanced Forensic Analysis Required:** Because of the anti-spoiler gameplay gating, deep sector structures and slack space block details are initially locked. You will see a warning asking you to parse the file using terminal commands.
- **Vague Clue:** The warning mentions the cluster allocation discrepancy between physical and logical sizes, asking you which terminal tool analyzes unallocated block regions.

### Step 2: Run `blkls` in the Virtual Terminal

To verify the deep sector structures and unlock the slack space metrics in the GUI:
1. Switch to the **Terminal** tab.
2. Run the block listing command:
   ```bash
   blkls file.pdf
   ```
3. Observe the output detailing the logical vs physical allocations and indicating carved block anomalies.
4. Switch back to the **Explorer** tab and select `file.pdf`. The **Cluster Allocation** block is now unlocked, confirming `1,696 bytes of slack space`.

### Step 3: Compare with Other Files

If you inspect `meeting_notes.docx` or `budget_2024.xlsx` in the file explorer, you can also run `blkls meeting_notes.docx` and `blkls budget_2024.xlsx` in the terminal. While they have physical slack space, their metrics reveal standard padding with no carved anomaly alerts or content payloads.

The key differentiator is `file.pdf`'s anomalous carved slack payload.

### Step 3: Examine the Forensics Output

Navigate to: `D:\ → forensics_output → foremost_output.txt`

**Content preview:**
```
foremost v1.5.7 — Carving Results
Input: D:\Projects\file.pdf (slack space region, offset 2400-4096)

Carved artifacts:
  1. CSV fragment (1,696 bytes) at offset 0x960
     Content: salary/compensation data
     Header: "Employee,Department,Base Salary,Bonus,Total"
     Rows: 14 employee records

Conclusion: Slack space of file.pdf contains remnants of a previously
deleted CSV file with sensitive compensation data.
```

**This reveals:**
- The slack space contains a **CSV fragment** with salary data
- The header shows employee compensation information
- This is evidence of **data exfiltration staging** — the employee had sensitive salary data on this drive

### Step 4: Check the Recycle Bin

Navigate to: `D:\ → $Recycle.Bin`

**Key evidence:**
- Filename: `å5alary_export.csv` — the `å` represents `0xE5`, the FAT deletion marker
- Original filename was: `salary_export.csv`
- File size: 0 (directory entry only, data unlinked)
- Magic bytes: `E5` (the deletion marker itself)
- Created/Modified: 2024-10-19 22:14:33 (late at night — suspicious)

**Content preview (recovered data):**
```
[DELETED FILE] Directory entry prefix: 0xE5
FAT cluster chain: UNLINKED but data at clusters 8820-8823 still intact

Recovered fragment (foremost):
"Employee,Department,Base Salary,Bonus,Total"
"A. Jiang,R&D,145000,28000,173000"
"M. Torres,Engineering,138000,22000,160000"
"R. Patel,Product,155000,35000,190000"
```

**The connection:** The CSV fragment in file.pdf's slack space matches the header of the deleted `salary_export.csv`. The employee:
1. Exported salary data to a CSV file
2. Wrote `file.pdf` (or another file) over the same clusters, leaving CSV fragments in the slack
3. Deleted the original CSV — but the directory entry and cluster data persist

### Step 5: Build the Timeline

| Time | Event |
|------|-------|
| 2024-10-19 22:14 | `salary_export.csv` created (late night) |
| 2024-10-19 22:15 | `salary_export.csv` deleted (within 1 minute!) |
| 2024-10-20 09:01 | `file.pdf` last accessed |
| 2024-10-21 14:00 | Forensics analysis run (`foremost_output.txt` created) |


## 6. Flags — What to Submit and Why

### Flag 1: file.pdf slack space (30 points)

**What to type:**
- `file.pdf has suspicious slack space` ✅
- `file.pdf` ✅ (matches target)
- `slack space` ✅ (matches finding)

**Why:** The file has a 1,696-byte slack region containing hidden salary data — the primary anomaly to detect.

### Flag 2: CSV fragment / salary data (35 points)

**What to type:**
- `CSV fragment with salary data` ✅
- `CSV fragment` ✅ (matches target)
- `salary data` ✅ (matches finding)

**Why:** Identifying **what's hidden** (salary/compensation data) is more valuable than just noticing the slack anomaly. This proves the data exfiltration motive.

### Flag 3: salary_export.csv deletion (35 points)

**Target:** `å5alary_export.csv` (representing the deleted file with the FAT `0xE5` prefix marker)  
**Technique:** `0xE5 Deletion`

**In-Game Notebook Submission details:**
- **Evidence selection:** Select **`$Recycle.Bin/å5alary_export.csv`** from your tagged evidence dropdown list.
- **Finding/Technique:** Select **`0xE5 Deletion`** (or type `0xE5 deletion` / `salary_export.csv` if writing in).
- **Automatic Character Normalization:** The investigator notebook logic dynamically normalizes target file names during submission. It strips any leading FAT `0xE5` character markers (`å` or `å5`), meaning that submitting the raw name `å5alary_export.csv` successfully matches the internal target `salary_export.csv` without frustrating target mismatches.

**Why:** The deleted directory entry with the `0xE5` prefix confirms deliberate deletion of the sensitive file. Combined with the slack space evidence, it proves the data existed on this drive.


## 7. Hints and Their Cost

| Tier | Cost | Text | What it reveals |
|------|------|------|----------------|
| 1 | -10 pts | "Look at the file sizes vs. their allocated cluster sizes. When a file doesn't fill its last cluster, what's in the remaining space?" | Points toward slack space concept |
| 2 | -20 pts | "One file in the Projects folder has a suspiciously large gap between its logical size and its allocated size. Check the slack space of file.pdf." | Identifies file.pdf as the target |
| 3 | -30 pts | "The slack space contains a CSV fragment. Now check the Recycle Bin — notice the filename starting with 0xE5? That's a deleted file marker. The two are connected." | Connects slack data to deleted file |


## 8. Scoring Breakdown

| Component | Points |
|-----------|--------|
| Starting score | 100 |
| Flag 1 (file.pdf slack) | +30 |
| Flag 2 (CSV fragment) | +35 |
| Flag 3 (salary_export.csv) | +35 |
| Wrong submissions | -5 each |
| Hints | -10, -20, -30 |
| Post-quiz bonus | +0 to +20 |

**Perfect run:** 100 + 30 + 35 + 35 + 20 = **220 pts**


## 9. Terminal Commands to Test

These commands work in the in-game terminal and should be tested:

> [!IMPORTANT]
> **Terminal Pathing Constraint:**
> The simplified in-game terminal does **not** resolve absolute paths (e.g. `/Users/...`) or multi-segment relative paths from the root (e.g. `stat Projects/file.pdf`). 
> Before running any file inspection command (like `stat`, `cat`, `xxd`, `istat`), you must first **`cd`** into the directory containing that file.

### General Navigation and Help
```bash
help     # Displays the full command list
ls       # Lists the root directory contents (Projects, $Recycle.Bin, forensics_output)
```

### Testing Projects Directory
First, navigate to the projects directory:
```bash
cd Projects
```

#### `stat file.pdf`
**Expected:** File info with size 2,400 bytes. Timestamps should be normal (no warning).

#### `stat meeting_notes.docx`
**Expected:** Normal output, no anomalies.

#### `xxd file.pdf`
**Expected:** Hex dump with magic bytes `25504446` highlighted (`%PDF` — the PDF magic number).

#### `istat 44102` (inode for file.pdf)
**Expected:** $SI and $FN timestamps displayed. No anomaly since the file itself isn't timestomped.

---

### Testing Forensics Output Directory
First, navigate to the forensics output directory:
```bash
cd /         # Go back to root
cd forensics_output
```

#### `cat foremost_output.txt`
**Expected:** Should display the carving results showing the CSV fragment.

---

### Testing Recycle Bin (Deleted File)
First, navigate to the Recycle Bin directory:
```bash
cd /         # Go back to root
cd $Recycle.Bin
```

#### `cat å5alary_export.csv`
**Expected:** Should show the deleted file's recovered content.

#### `istat 44200` (inode for deleted salary_export.csv)
**Expected:** Metadata for the deleted file, including the late-night timestamps.


## 10. Post-Quiz — Answers and Rationale

### Question 1
> **"Why can data persist in slack space even after a new file is written?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The filesystem encrypts old data before overwriting | ❌ |
| **1** | **The OS only writes the bytes needed for the new file, leaving the remainder of the cluster untouched** | **✅** |
| 2 | Slack space is in a protected partition that cannot be overwritten | ❌ |
| 3 | The MFT prevents cluster reuse for 30 days | ❌ |

**Why:** The operating system is efficient — it only writes exactly the bytes needed for the file. It does **not** zero out the remaining cluster space. The old data persists as slack until explicitly overwritten by another file that happens to use those exact bytes.

### Question 2
> **"What forensic technique is used to recover files or fragments from unallocated disk space?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Timestomping | ❌ (that's anti-forensics, not recovery) |
| **1** | **File carving (e.g., using foremost or scalpel)** | **✅** |
| 2 | Registry analysis | ❌ |
| 3 | Memory dump analysis | ❌ |

**Why:** File carving scans raw bytes for known file signatures (magic bytes / headers / footers) to reconstruct file fragments. It works independently of the filesystem metadata.

### Question 3
> **"In this scenario, how was the deleted salary_export.csv identified in the filesystem?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | It appeared in the Recycle Bin with its full original name | ❌ |
| **1** | **Its directory entry had the first byte replaced with 0xE5, the FAT deletion marker** | **✅** |
| 2 | It was listed in the Windows event logs as a deleted file | ❌ |
| 3 | The MFT entry was completely removed from disk | ❌ |

**Why:** In FAT, the first byte of a deleted file's directory entry is replaced with `0xE5`. The rest of the entry (including timestamps and cluster chain) remains intact, allowing forensic recovery.

### Question 4
> **"What connected the slack space data in file.pdf to the deleted salary_export.csv?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | They had the same file hash | ❌ |
| **1** | **The foremost carving output showed the CSV fragment matched the deleted file's header structure** | **✅** |
| 2 | They were in the same directory | ❌ |
| 3 | The slack space contained a pointer to the deleted file's inode | ❌ |

**Why:** The `foremost` tool carved a CSV fragment from `file.pdf`'s slack space whose header ('Employee,Department,Base Salary...') matched the structure of the deleted `salary_export.csv` — proving the same data existed in both locations.


## 11. Debriefing Verification

Verify the debriefing shows:
- **Title:** "How Slack Space Hides Data"
- **Concept:** Cluster allocation, slack definition, why old data persists
- **Real-World Tools:** Sleuth Kit `blkls`, `foremost`, EnCase, FTK, `slacker`
- **Case Connection:** Employee deleted CSV, smaller PDF written over same clusters, slack retained fragments, 0xE5 confirmed deletion
- **Further Reading:** NTFS cluster allocation, FAT directory entries, foremost/scalpel file carving


## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│  SCENARIO 02 — GHOSTS IN THE SECTORS            │
│                                                 │
│  Flag 1: file.pdf — slack space (30 pts)        │
│  Flag 2: CSV fragment — salary data (35 pts)    │
│  Flag 3: salary_export.csv — 0xE5 deletion (35) │
│                                                 │
│  Key Evidence: file.pdf has 1,696B slack        │
│  Smoking Gun: CSV salary data in slack space    │
│  Deleted File: salary_export.csv (0xE5 prefix)  │
│                                                 │
│  Pre-Quiz: 1→B, 2→C, 3→C, 4→C                   │
│  Post-Quiz: 1→B, 2→B, 3→B, 4→B                  │
└─────────────────────────────────────────────────┘
```
