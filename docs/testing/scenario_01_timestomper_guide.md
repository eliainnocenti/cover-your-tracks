# Scenario 01 — The Timestomper

## Full Testing and Solution Guide

> **Domain:** File System Forensics — MAC Time Manipulation  
> **Difficulty:** ★☆☆☆☆ (1/5)  
> **Estimated Time:** 15 minutes  
> **Max Possible Score:** 200 pts (100 base + 100 from flags + post-quiz bonus)


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
12. [Common Mistakes and Edge Cases](#12-common-mistakes--edge-cases)


## 1. Scenario Overview

**Narrative:**  
A corporate whistleblower claims a disgruntled sysadmin (kmartin) tampered with critical HR documents and financial reports to cover their tracks before resigning. You're analyzing the imaged workstation to find tampered files and prove timestamps were falsified.

**Learning Objective:**  
Understand how timestomping works by comparing `$STANDARD_INFORMATION` vs `$FILE_NAME` attributes in the NTFS Master File Table (MFT). Recognize that anti-forensic tools modify \$SI timestamps but often leave \$FN timestamps untouched.


## 2. The Theory Behind It

### What is Timestomping?

Timestomping is the deliberate modification of a file's **MAC timestamps** (Modified, Accessed, Created) to mislead forensic investigators about the true timeline of events.

### NTFS Dual Timestamp Architecture

NTFS stores **two independent sets of timestamps** for every file:

| Attribute | Full Name | Purpose | API Accessible? |
|-----------|-----------|---------|-----------------|
| **\$SI** | `$STANDARD_INFORMATION` | Timestamps shown in Windows Explorer and most tools | ✅ Yes — via `SetFileTime()` |
| **\$FN** | `$FILE_NAME` | Timestamps maintained by the NTFS kernel driver | ❌ No — only the NTFS driver updates these |

### Why \$FN timestamps survive timestomping

- `$SI` timestamps are modified through **user-space Windows APIs** (`SetFileTime`, `NtSetInformationFile`).
- `$FN` timestamps are updated **only by the NTFS kernel driver** itself when it performs directory operations.
- Tools like `Timestomp.exe` (Metasploit), `NTimeStomp`, and similar utilities call user-space APIs — they modify `$SI` but **cannot reach `$FN`**.
- Therefore, **a mismatch between \$SI and \$FN is a forensic red flag**.

### What are the four timestamps?

Each attribute (\$SI and \$FN) stores four timestamps:
1. **Created** — when the file was first created
2. **Modified** — when the file content was last changed
3. **Accessed** — when the file was last read
4. **MFT Changed** — when the MFT entry itself was last modified (metadata changes)

### The "all-identical" fingerprint

When a timestomping tool runs, it typically sets **all four** \$SI timestamps to the same value in a single API call. In normal file usage, it is **virtually impossible** for all four timestamps to be identical down to the second, because:
- Creation precedes modification
- Access and MFT changes happen at different times during the file's lifecycle

> **Note:** While identical timestamps are a classic timestomping fingerprint, they can occasionally happen during legitimate system processes like file extraction from a ZIP archive. This is why corroborating evidence (like high document revision counts, event logs, or tool artifacts) is necessary.


## 3. Pre-Quiz — Answers and Rationale

### Question 1
> **"In NTFS, which metadata attribute stores the timestamps visible in Windows Explorer?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | `$FILE_NAME ($FN)` | ❌ |
| **1** | **`$STANDARD_INFORMATION ($SI)`** | **✅** |
| 2 | `$DATA` | ❌ |
| 3 | `$OBJECT_ID` | ❌ |

**Why:** Windows Explorer and most forensic tools read timestamps from `$STANDARD_INFORMATION` by default. This is also why timestomping targets \$SI — it's what most people see.

### Question 2
> **"What is 'timestomping'?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Encrypting file timestamps with AES | ❌ |
| **1** | **Modifying MAC times to hide when a file was really created or accessed** | **✅** |
| 2 | Deleting the MFT entry for a file | ❌ |
| 3 | Compressing timestamps to save disk space | ❌ |

**Why:** Timestomping is specifically about **falsifying** timestamps, not encrypting, deleting, or compressing them.


## 4. Filesystem Layout

```
C:\
├── Users/
│   └── kmartin/
│       ├── Documents/
│       │   ├── Q2_Report_FINAL.docx          ← 🚩 TAMPERED (Flag 1)
│       │   ├── personal_notes.txt            ← ✅ Clean
│       │   └── HR_Termination_Draft_v3.docx  ← 🚩 TAMPERED (Flag 2)
│       └── AppData/
│           └── Roaming/
│               └── timestomp_log.tmp         ← 🚩 SMOKING GUN (Flag 3)
└── Windows/
    └── System32/
        └── winevt/
            └── Security.evtx                 ← ✅ Clean (but corroborating)
```


## 5. Investigation Walkthrough

### Step 1: Navigate the File Explorer

1. Open the **Explorer** tab (default view).
2. Expand the directory tree: `C:\ → Users → kmartin → Documents`.
3. Click on each file to inspect its metadata in the detail panel.

### Step 2: Inspect `Q2_Report_FINAL.docx`

**What to look for:**

| Field | \$SI Value | \$FN Value |
|-------|-----------|-----------|
| Created | 2024-11-14 09:22:11 | **2024-09-03 14:47:32** |
| Modified | 2024-11-14 09:22:11 | **2024-10-21 16:05:44** |
| Accessed | 2024-11-14 09:22:11 | **2024-11-12 08:30:19** |
| MFT Changed | 2024-11-14 09:22:11 | **2024-11-12 08:30:19** |

**Red Flags:**
- ⚠️ All four \$SI timestamps are **identical to the second** → classic timestomping fingerprint
- ⚠️ The \$SI "Created" date (Nov 14) is **after** the \$FN "Created" date (Sep 3) → impossible in normal operations
- ⚠️ The document's internal metadata says "Created 2024-09-03, last printed 2024-11-11" — which matches \$FN, not \$SI
- ⚠️ Revision count is 14 with 4h22m editing time — inconsistent with all-same timestamps

**The UI should display:** A red warning banner saying *"⚠ ALL FOUR IDENTICAL — possible timestomping"*

**Action:** Click **"Tag Evidence"** on this file.

### Step 3: Check `personal_notes.txt` (control file)

| Field | $SI Value | $FN Value |
|-------|-----------|-----------|
| Created | 2024-10-01 11:00:00 | 2024-10-01 11:00:00 |
| Modified | 2024-11-10 17:45:22 | 2024-11-10 17:45:22 |
| Accessed | 2024-11-10 17:45:22 | 2024-11-10 17:45:22 |
| MFT Changed | 2024-11-10 17:48:05 | 2024-11-10 17:48:05 |

**Result:** \$SI and \$FN match → file is **not tampered**. No red flag should appear. This file exists as a **control** — to show what a normal file looks like by comparison.

### Step 4: Inspect `HR_Termination_Draft_v3.docx`

| Field | $SI Value | $FN Value |
|-------|-----------|-----------|
| Created | 2024-11-14 09:22:11 | **2024-10-28 10:12:05** |
| Modified | 2024-11-14 09:22:11 | **2024-11-13 19:58:31** |
| Accessed | 2024-11-14 09:22:11 | **2024-11-13 19:58:31** |
| MFT Changed | 2024-11-14 09:22:11 | **2024-11-13 19:58:31** |

**Red Flags:**
- ⚠️ Same all-identical \$SI pattern as Q2_Report
- ⚠️ Same \$SI timestamp value as Q2_Report → **both files were stomped with the same tool run**
- ⚠️ \$SI says file was created on Nov 14, but \$FN says Oct 28 → creation date moved forward
- ⚠️ The content is "CONFIDENTIAL — HR Action Plan" about kmartin's own termination — motive!

**Action:** Click **"Tag Evidence"** on this file.

### Step 5: Find the Smoking Gun — `timestomp_log.tmp`

Navigate to: `C:\ → Users → kmartin → AppData → Roaming`

**Key evidence in content preview:**
```
[BINARY] TIMESTOMP v2.0 execution log
Target: C:\Users\kmartin\Documents\Q2_Report_FINAL.docx -> SET 2024-11-14 09:22:11
Target: C:\Users\kmartin\Documents\HR_Termination_Draft_v3.docx -> SET 2024-11-14 09:22:11
Status: COMPLETE
```

**Why this matters:**
- This is a **leftover artifact** from the timestomping tool itself
- It directly names **both** tampered files
- It shows the **exact timestamp** that was applied (2024-11-14 09:22:11 — matching the \$SI values)
- The tool ran at 09:18-09:22 on Nov 14 (per its own \$SI/\$FN timestamps, which are legitimate and consistent)

**Action:** Click **"Tag Evidence"** on this file.

### Step 6: Corroborate with Event Logs

Navigate to: `C:\ → Windows → System32 → winevt → Security.evtx`

**Content preview shows:**
```
Event 4624 - Logon: kmartin logged in at 2024-11-14 09:14:02 (Interactive)
Event 4663 - File accessed: Q2_Report_FINAL.docx at 2024-11-14 09:19:55
Event 4663 - File accessed: HR_Termination_Draft_v3.docx at 2024-11-14 09:21:03
Event 4647 - Logoff: kmartin at 2024-11-14 09:28:11
```

**Timeline reconstruction:**
- 09:14 — kmartin logs in
- 09:18 — timestomping tool starts (per `timestomp_log.tmp` creation time)
- 09:19 — Q2_Report accessed (file opened by tool)
- 09:21 — HR_Termination accessed (file opened by tool)
- 09:22 — timestomping complete, all \$SI timestamps set to 09:22:11
- 09:28 — kmartin logs off


## 6. Flags — What to Submit and Why

The new submission UI requires a structured match. Students must select the tagged file from their notebook dropdown and match it with the correct technique from the master list.

### Flag 1: Q2_Report_FINAL.docx (30 points)

**Target:** `Q2_Report_FINAL.docx`  
**Technique:** Timestomping

### Flag 2: HR_Termination_Draft_v3.docx (30 points)

**Target:** `HR_Termination_Draft_v3.docx`  
**Technique:** Timestomping

### Flag 3: timestomp_log.tmp (40 points — highest!)

**Target:** `timestomp_log.tmp`  
**Technique:** Tool Artifact

**Why this is worth the most:**
Finding the actual tool log is the strongest evidence. The tampered timestamps are circumstantial — the tool log is a **smoking gun** that proves deliberate intent.


## 7. Hints and Their Cost

| Tier | Cost | Text | What it reveals |
|------|------|------|----------------|
| 1 | −10 pts | "In NTFS, every file has two timestamp records. Most tools only show you one. Try comparing them." | Points toward \$SI vs \$FN comparison |
| 2 | −20 pts | "Look at the Documents folder. Notice anything unusual about when the files were supposedly last modified?" | Narrows focus to Documents folder |
| 3 | −30 pts | "When all four MAC timestamps of a file are identical down to the second, that is almost always the fingerprint of a timestomping tool. Now find the tool itself." | Explains the all-identical pattern and tells you to find the tool |

**Total hint cost: −60 pts** (if all three used)


## 8. Scoring Breakdown

| Component | Points | Notes |
|-----------|--------|-------|
| Starting score | 100 | Base |
| Flag 1 (Q2_Report) | +30 | |
| Flag 2 (HR_Termination) | +30 | |
| Flag 3 (timestomp_log) | +40 | |
| Wrong submissions | −5 each | `Math.max(0, score - 5)` |
| Hint Tier 1 | −10 | |
| Hint Tier 2 | −20 | |
| Hint Tier 3 | −30 | |
| Post-quiz bonus | +0 to +20 | `Math.round(postQuizScore * 0.2)` |

**Perfect run (no hints, no wrong answers, 100% post-quiz):**  
100 + 30 + 30 + 40 + 20 = **220 pts**

**Worst case (all hints, many wrong answers, 0% post-quiz):**  
100 − 60 − (n×5) + 30 + 30 + 40 + 0 = **140 − 5n pts**


## 9. Terminal Commands to Test

These commands work in the in-game terminal and should be tested:

### `help`
Should display the full command list.

### `ls`
Should list the root directory contents (Users, Windows).

### `stat Q2_Report_FINAL.docx`
**Expected output includes:**
```
  File: Q2_Report_FINAL.docx
  Size: 48,200 bytes
  Modify: 2024-11-14 09:22:11
  Access: 2024-11-14 09:22:11
  Change: 2024-11-14 09:22:11
  Birth:  2024-11-14 09:22:11
[!] WARNING: All SI timestamps identical — possible timestomping detected
```
The warning appears because the code checks `siVals.every(v => v === siVals[0])`.

### `stat personal_notes.txt`
**Expected:** Normal output, **no warning** (timestamps differ).

### `stat HR_Termination_Draft_v3.docx`
**Expected:** Same all-identical warning as Q2_Report.

### `istat 78234` (inode for Q2_Report)
**Expected output includes both \$SI and \$FN blocks:**
```
$STANDARD_INFORMATION Attribute Values:
  Created:      2024-11-14 09:22:11
  File Modified:2024-11-14 09:22:11
  ...
$FILE_NAME Attribute Values:
  Created:      2024-09-03 14:47:32
  File Modified:2024-10-21 16:05:44
  ...
[!] $SI and $FN create times differ — forensic anomaly
```

### `istat 78301` (inode for HR_Termination)
**Expected:** Similar \$SI/\$FN mismatch warning.

### `istat 78290` (inode for personal_notes.txt)
**Expected:** No anomaly warning (timestamps match).

### `istat 78455` (inode for timestomp_log.tmp)
**Expected:** Normal output, no anomaly warning (timestamps match). This file has legitimate timestamps from when the tool was executed.

### `istat 120` (inode for Security.evtx)
**Expected:** Normal output, no anomaly warning.

### `cat timestomp_log.tmp`
**Expected:** Should display the TIMESTOMP v2.0 execution log content.

### `strings timestomp_log.tmp`
**Expected:** Should display timestomping tool signatures.

### `cat Security.evtx`
**Expected:** Event log entries showing the login/access timeline.

### `xxd Q2_Report_FINAL.docx`
**Expected:** Hex dump showing magic bytes `504B0304` (ZIP/DOCX container).

### `hash Q2_Report_FINAL.docx`
**Expected:** MD5 and SHA-256 hashes (deterministic but fake).

### Error cases to test:
- `stat nonexistent.txt` → "cannot stat: No such file"
- `istat 99999` → "inode not found"
- `cat` (no argument) → "Usage: cat <filename>"
- `unknowncmd` → "command not found"


## 10. Post-Quiz — Answers and Rationale

### Question 1
> **"Which NTFS attribute is most resistant to timestomping tools and why?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | `$DATA`, because it stores the actual file content | ❌ |
| **1** | **`$FILE_NAME`, because it is updated by the NTFS kernel driver rather than user-space APIs** | **✅** |
| 2 | `$STANDARD_INFORMATION`, because it requires admin privileges to modify | ❌ |
| 3 | `$OBJECT_ID`, because it is write-protected by default | ❌ |

**Why:** `$FN` timestamps are maintained by the **kernel-mode NTFS driver**, not by user-space API calls. Since timestomping tools use user-space APIs like `SetFileTime()`, they can only modify `$SI`.

### Question 2
> **"What is a reliable indicator that timestomping has occurred?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The file size is larger than expected | ❌ |
| 1 | The file extension does not match its magic bytes | ❌ |
| **2** | **All four $SI timestamps are identical down to the second** | **✅** |
| 3 | The file has no owner assigned | ❌ |

**Why:** When a timestomping tool sets all four timestamps in a single operation, they all get the same value. In normal file operations, Created, Modified, Accessed, and MFT Changed would all differ.


## 11. Debriefing Verification

After completing the post-quiz, verify the debriefing screen shows:

- **Title:** "How Timestomping Works"
- **Concept:** Explains \$SI vs \$FN, why \$FN survives, and the mismatch indicator
- **Real-World Tools:** Autopsy, FTK Imager, Sleuth Kit `istat`
- **Case Connection:** Mentions the all-same-second pattern, \$FN + Event Log corroboration, and the `.tmp` tool artifact
- **Further Reading:** NTFS MFT, Sleuth Kit istat, Event 4663/4664, Metasploit timestomp


## 12. Common Mistakes and Edge Cases

### Testing Edge Cases

| Test | Expected Behavior |
|------|-------------------|
| Submit same flag twice | Should be ignored (deduplicated) |
| Submit flag after all flags found | Phase should already be `post_quiz` |
| Use all hints then find all flags | Score = 100 − 60 + 100 = 140 + post-quiz bonus |

### Common Student Mistakes

1. **Ignoring `personal_notes.txt`** — Students should verify it as a control; it proves the anomaly is specific to certain files, not a system-wide issue.
2. **Not checking AppData** — The timestomp_log.tmp is hidden in `AppData/Roaming`, which students may not think to explore.
3. **Confusing \$SI and \$FN** — The pre-quiz tests this knowledge, but students may still mix them up during investigation.
4. **Missing the Event Log correlation** — The Security.evtx file corroborates the timeline but is not a flag itself.


## Quick Reference Card

```
┌───────────────────────────────────────────────────────────┐
│  SCENARIO 01 — THE TIMESTOMPER                            │
│                                                           │
│  Flag 1: Q2_Report_FINAL.docx — timestomping (30)         │
│  Flag 2: HR_Termination_Draft_v3.docx — timestomping (30) │
│  Flag 3: timestomp_log.tmp — tool_artifact (40)           │
│                                                           │
│  Key Evidence: All $SI timestamps = 09:22:11              │
│  Smoking Gun: timestomp_log.tmp in AppData                │
│  Control File: personal_notes.txt (clean)                 │
│                                                           │
│  Pre-Quiz: 1→B, 2→B                                       │
│  Post-Quiz: 1→B, 2→C                                      │
└───────────────────────────────────────────────────────────┘
```
