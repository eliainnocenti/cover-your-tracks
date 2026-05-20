# Scenario 05 — Hidden in Plain Sight

## Full Testing and Solution Guide

> **Domain:** Steganography — LSB Detection  
> **Difficulty:** ★★★★☆ (4/5)  
> **Estimated Time:** 25 minutes  
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
12. [Common Mistakes and Edge Cases](#12-common-mistakes--edge-cases)


## 1. Scenario Overview

**Narrative:**  
An insider at Prism Design Inc. (dchen) is suspected of leaking product designs. The DLP system caught nothing — no suspicious attachments, no cloud uploads. But a sharp-eyed analyst noticed three "cat photos" sent to an external email address the night before a competitor unveiled a suspiciously similar product. All three PNGs look innocent. Find the one hiding something.

**Learning Objective:**  
Understand LSB (Least Significant Bit) steganography — how data can be hidden in the least significant bits of pixel color values without visually altering an image. Learn to identify steganographic images through statistical analysis, file size anomalies, and EXIF metadata inconsistencies.


## 2. The Theory Behind It

### Digital Image Color Representation

A standard 24-bit color image uses three channels per pixel:

```
Pixel = [Red, Green, Blue]
Each channel = 8 bits (0-255)
Total per pixel = 24 bits

Example pixel:
  R = 11001010 (202)
  G = 10110111 (183)
  B = 01100100 (100)
```

### What is the Least Significant Bit (LSB)?

The LSB is the **rightmost bit** in each byte. Changing it alters the value by only 1:

```
Original: 11001010 = 202
Modified: 11001011 = 203  (LSB changed from 0 to 1)

Color difference: 202 vs 203 out of 256 = 0.39%
→ Imperceptible to the human eye
```

### LSB Steganography — How It Works

1. **Take the cover image** (the innocent-looking cat photo)
2. **Convert the secret data** into a stream of bits
3. **Replace the LSB of each color channel** with one bit of secret data

```
Original pixel:   R=11001010  G=10110111  B=01100100
Secret data bits:        1         0         1

Stego pixel:      R=11001011  G=10110110  B=01100101
                         ↑          ↑          ↑
                     LSB changed  LSB changed  LSB changed
```

### Capacity Calculation

For a 1920×1080 image:
```
Pixels:    1920 × 1080 = 2,073,600
Channels:  3 (R, G, B)
Available bits: 2,073,600 × 3 = 6,220,800 bits
Capacity:  6,220,800 / 8 = 777,600 bytes ≈ 760 KB
```

You can hide up to **~760 KB** in a single 1920×1080 image. The ~38 KB zip file in this scenario uses less than 5% of available capacity.

### Statistical Detection — Chi-Square Analysis

Natural images have **randomly distributed LSBs** because real-world colors are continuous and noise is random. When you replace LSBs with structured data (like a zip file), the distribution changes.

| Metric | Natural Image | Steganographic Image |
|--------|--------------|---------------------|
| **Chi-square value** | ~0.85–1.0 | **< 0.7** |
| **LSB entropy** | ~6.5–7.2 | **~7.9–8.0** (near maximum) |

**Why?**
- Natural LSBs have some correlation with neighboring pixels (gradients, textures)
- Embedded data (especially compressed data like ZIP) is essentially random
- Random data has maximum entropy (8.0 for 8-bit values)
- Chi-square tests detect when the LSB distribution deviates from expected patterns

### EXIF Metadata as a Forensic Clue

EXIF (Exchangeable Image File Format) stores metadata about how an image was taken:
- Camera model
- Date/time
- GPS coordinates
- Exposure settings

**Why stripping EXIF is suspicious:**
1. Most steganography tools strip EXIF during the embedding process
2. If similar images from the same device have EXIF but one doesn't, that's an inconsistency
3. Stripping EXIF also removes timestamps that could help trace when the image was modified


## 3. Pre-Quiz — Answers and Rationale

### Question 1
> **"What is LSB steganography?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Encrypting an image file with a password | ❌ (encryption ≠ steganography) |
| **1** | **Hiding data by modifying the least significant bits of pixel color values** | **✅** |
| 2 | Compressing image metadata to reduce file size | ❌ |
| 3 | Embedding a watermark in the image header | ❌ (watermarking is different) |

**Why:** LSB steganography specifically replaces the least significant bit of each color channel byte with secret data bits. The visual change is imperceptible because the LSB contributes the least to perceived color.

### Question 2
> **"How does pixel color depth work in a standard 24-bit PNG image?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Each pixel has one 24-bit value for brightness | ❌ |
| **1** | **Each pixel has three 8-bit channels (R, G, B), with each channel ranging from 0 to 255** | **✅** |
| 2 | Each pixel stores 24 separate color entries | ❌ |
| 3 | Color depth only applies to JPEG, not PNG | ❌ |

**Why:** In a 24-bit PNG, each pixel has three color channels (Red, Green, Blue), each represented by 8 bits (0-255). This means each pixel carries 24 bits of color data — and an LSB steganography tool can hide 3 bits of secret data per pixel (one bit per channel).

### Question 3
> **"Approximately how much data can be hidden in a 1920×1080 image using single-bit LSB steganography across all three color channels?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | About 8 KB | ❌ |
| 1 | About 80 KB | ❌ |
| **2** | **About 760 KB** | **✅** |
| 3 | About 6 MB | ❌ |

**Why:** A 1920×1080 image has 2,073,600 pixels × 3 channels = 6,220,800 available LSBs. At 1 bit each: 6,220,800 / 8 = 777,600 bytes ≈ 760 KB.

### Question 4
> **"What is EXIF metadata in a digital image?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The raw pixel data stored in the file | ❌ |
| **1** | **Embedded information about the camera, date, GPS location, and capture settings** | **✅** |
| 2 | A digital signature proving the image has not been modified | ❌ |
| 3 | The compression algorithm used to reduce file size | ❌ |

**Why:** EXIF (Exchangeable Image File Format) metadata records information like camera model, capture date/time, GPS coordinates, and exposure settings. Its absence or inconsistency can be a forensic clue.


## 4. Filesystem Layout

```
Evidence\
├── Outbox/
│   ├── cat_01.png    ← ✅ Clean (control image)
│   ├── cat_02.png    ← ✅ Clean (control image)
│   └── cat_03.png    ← 🚩 STEGANOGRAPHIC IMAGE (Flags 1, 2, 3)
└── Tools/
    └── steghide_history.log  ← 🔍 Smoking gun (tool usage proof)
```

### Image Comparison Table

| Property | cat_01.png | cat_02.png | cat_03.png |
|----------|-----------|-----------|-----------|
| Resolution | 1920×1080 | 1920×1080 | 1920×1080 |
| **File size** | 245,780 B | 251,200 B | **286,450 B** ⚠️ |
| Magic bytes | 89504E47 (✅ PNG) | 89504E47 (✅ PNG) | 89504E47 (✅ PNG) |
| **EXIF camera** | iPhone 15 Pro | iPhone 15 Pro | **null** ⚠️ |
| **EXIF date** | 2024-11-01 18:22:08 | 2024-11-02 12:45:30 | **null** ⚠️ |
| **EXIF GPS** | 37.7749, -122.4194 | 37.7749, -122.4194 | **null** ⚠️ |
| **EXIF stripped** | false | false | **true** ⚠️ |
| **LSB chi-square** | 0.92 (natural) | 0.89 (natural) | **0.48** (ANOMALOUS) ⚠️ |
| **LSB entropy** | 7.12 | 7.08 | **7.98** ⚠️ |
| SI modified | 2024-11-01 18:22:10 | 2024-11-02 12:45:33 | **2024-11-05 20:48:12** ⚠️ |
| Tampered | false | false | **true** |

### The Three Clues for cat_03.png

1. **File size anomaly:** 286,450 B vs average ~248,490 B for the other two → **14% larger**
2. **EXIF stripped:** The other two have full EXIF (camera, date, GPS) but cat_03 has **none**
3. **LSB statistics:** Chi-square of **0.48** (far below the ~0.9 expected for natural images)


## 5. Investigation Walkthrough

### Step 1: Compare File Sizes

In the Explorer, navigate to `Evidence\ → Outbox` and click on each image.

**Observation:** cat_01 and cat_02 are ~246-251 KB, but cat_03 is 286 KB — **14% larger** for the same 1920×1080 resolution.

**Why this matters:** If all three images are from the same camera with similar content (cat photos), they should be approximately the same size. A significantly larger file size suggests additional data has been embedded.

### Step 2: Check EXIF Metadata

Click on each image and compare the EXIF fields:

| Image | Camera | Date | GPS |
|-------|--------|------|-----|
| cat_01 | iPhone 15 Pro | 2024-11-01 18:22:08 | San Francisco |
| cat_02 | iPhone 15 Pro | 2024-11-02 12:45:30 | San Francisco |
| cat_03 | ***** STRIPPED ***** | null | null |

**Red flag:** cat_01 and cat_02 retain full EXIF from the same iPhone. cat_03 has its EXIF **completely stripped**. This is inconsistent.

**Why strip EXIF?**
- Some steganography tools automatically strip EXIF during embedding
- The suspect may have manually stripped it to prevent metadata analysis
- The timing is suspicious: cat_03 was modified on **Nov 5 at 20:48** — the night before the competitor's reveal

### Step 3: Analyze LSB Statistics

The metadata panel shows LSB analysis results:

| Image | Chi-square | Entropy | Interpretation |
|-------|-----------|---------|----------------|
| cat_01 | 0.92 | 7.12 | Natural |
| cat_02 | 0.89 | 7.08 | Natural |
| cat_03 | **0.48** | **7.98** | **ANOMALOUS** |

**Chi-square interpretation:**
- ~0.9 = natural image (random LSB distribution matching expected patterns)
- 0.48 = statistically anomalous (structured data in LSBs disrupts the natural pattern)

**Entropy interpretation:**
- 7.0-7.2 = natural image LSBs (some correlation with image content)
- 7.98 = near maximum entropy (8.0) → the LSBs contain compressed/random data

### Step 4: Read the Content Preview

cat_03.png's content preview includes:
```
zsteg output:
  b1,rgb,lsb,xy: file: Zip archive data, at least v2.0 to extract
  Embedded payload: product_designs_v4.zip (approx 38KB)
  Archive contents: CAD files, specification PDFs
```

**This reveals:**
- `zsteg` detected a **Zip archive** embedded via LSB in RGB channels
- The payload is `product_designs_v4.zip` — the stolen product designs
- It contains CAD files and specification PDFs — exactly what the competitor would need

### Step 5: Find the Smoking Gun — steghide_history.log

Navigate to: `Evidence\ → Tools → steghide_history.log`

**Content preview:**
```
Steghide v0.5.1 — Execution Log
[2024-11-05 20:47:33] Embedding file: product_designs_v4.zip
[2024-11-05 20:47:33] Cover image: cat_03.png
[2024-11-05 20:47:33] Algorithm: LSB replacement, RGB channels
[2024-11-05 20:48:10] Embedding complete. Output size: 286,450 bytes
[2024-11-05 20:48:10] EXIF metadata stripped from output.
```

**This confirms everything:**
- **Tool used:** Steghide v0.5.1
- **Payload:** product_designs_v4.zip
- **Cover image:** cat_03.png
- **Method:** LSB replacement, RGB channels
- **Output size matches:** 286,450 bytes (exactly what we see)
- **EXIF was stripped by the tool** (not manually)
- **Timeline:** Embedding done at 20:47-20:48 on Nov 5 → matches cat_03's modified timestamp

### Step 6: Build the Timeline

| Time | Event |
|------|-------|
| Nov 1, 18:22 | cat_01.png taken (iPhone 15 Pro, SF) |
| Nov 2, 12:45 | cat_02.png taken (iPhone 15 Pro, SF) |
| Nov 3, 09:10 | cat_03.png taken (iPhone 15 Pro, SF) |
| **Nov 5, 20:45** | Steghide tool installed/run |
| **Nov 5, 20:47** | product_designs_v4.zip embedded into cat_03.png |
| **Nov 5, 20:48** | Embedding complete, EXIF stripped |
| Nov 5, 21:15 | All three images sent via email (accessed time) |
| **Nov 6** | Competitor reveals suspiciously similar product |


## 6. Flags — What to Submit and Why

### Flag 1: Anomalous Image (30 points)

**What to type:**
- `cat_03.png is anomalous — oversized, stripped EXIF` ✅
- `cat_03.png` ✅ (matches target)
- `anomalous image` ✅ (matches finding)

**Why:** Identifying which of the three images is the stego carrier is the first step. The file size, EXIF, and LSB statistics all point to cat_03.

### Flag 2: LSB Steganography Technique (35 points)

**What to type:**
- `LSB steganography in cat_03.png` ✅
- `LSB steganography` ✅ (matches target)
- `steganography` ✅ (matches finding)

**Why:** Naming the **technique** (LSB steganography) shows the investigator understands *how* the data was hidden, not just *that* it was hidden.

### Flag 3: Embedded Payload (35 points)

**What to type:**
- `zip archive embedded in cat_03.png via LSB` ✅
- `zip archive` ✅ (matches target)
- `embedded payload` ✅ (matches finding)

**Why:** Identifying the **specific payload** (product_designs_v4.zip containing CAD files) proves what data was being exfiltrated.


## 7. Hints and Their Cost

The professor strongly mandated that hints should not act as mechanical walkthroughs, but instead leave space for conceptual inference and reasoning about statistical anomalies and metadata integrity.

| Tier | Cost | Text | Conceptual Focus |
|------|------|------|------------------|
| 1 | −10 pts | "Consider the physical footprint of digital image storage. If three control files share identical pixel dimensions and depict similar scenes, what does a statistically significant variance in file size indicate about the underlying byte arrangement of one specific file?" | **Data Storage Footprint**: Prompts the student to reason about why the stego-carrier is 14% larger due to the embedded zip archive. |
| 2 | −20 pts | "Analyze the metadata profiles of the images. While normal digital cameras systematically embed device descriptions, timestamps, and geolocation tags, what diagnostic inference can you draw when an image's EXIF profile is entirely blank? How does this cross-correlate with changes in the MFT timestamps?" | **EXIF Metadata Anomalies**: Prompts students to identify that the lack of camera model/GPS is due to steganography tools automatic stripping. |
| 3 | −30 pts | "The Chi-square statistic measures the goodness-of-fit against a uniform random distribution. A natural photograph's LSB layer, dominated by chaotic sensor noise, exhibits a Chi-square value near 1.0. If the Chi-square drops to 0.48, what does this tell you about the predictability and order of those bits? Why does replacing chaotic sensor noise with highly structured binary data (such as a compressed container) cause this specific mathematical anomaly?" | **Chi-Square & LSB Statistical Deviation**: Leads students to deduce that structured zip payloads overwrite natural chaotic noise, creating detectable statistical spikes and low Chi-square values. |



## 8. Scoring Breakdown

| Component | Points |
|-----------|--------|
| Starting score | 100 |
| Flag 1 (anomalous image) | +30 |
| Flag 2 (LSB steganography) | +35 |
| Flag 3 (embedded payload) | +35 |
| Wrong submissions | −5 each |
| Hints | −10, −20, −30 |
| Post-quiz bonus | +0 to +20 |

**Perfect run:** 100 + 30 + 35 + 35 + 20 = **220 pts**


## 9. Terminal Commands to Test

### `stat cat_01.png`
**Expected:** Normal metadata, size 245,780 bytes.

### `stat cat_03.png`
**Expected:** Size 286,450 bytes, modified timestamp 2024-11-05 20:48:12.

### `cat steghide_history.log`
**Expected:** Full steghide execution log showing the embedding operation.

### `xxd cat_03.png`
**Expected:** Hex dump with magic bytes `89504E47` highlighted (PNG signature = `‰PNG`).

### `hash cat_01.png` and `hash cat_03.png`
**Expected:** Different hashes (confirming the files are distinct).

### `istat 91003` (inode for cat_03.png)
**Expected:** \$SI and \$FN timestamps. Note that \$SI modified (2024-11-05 20:48:12) differs from \$FN created (2024-11-03 09:10:45), showing the file was re-saved.


## 10. Post-Quiz — Answers and Rationale

### Question 1
> **"What statistical test is commonly used to detect LSB steganography?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | SHA-256 hash comparison | ❌ (hashing detects modification, not steganography) |
| **1** | **Chi-square analysis of LSB distribution** | **✅** |
| 2 | CRC32 checksum verification | ❌ |
| 3 | Entropy measurement of file headers | ❌ |

**Why:** Chi-square analysis specifically measures whether the LSB distribution matches the expected pattern for a natural image. LSB steganography creates detectable statistical anomalies.

### Question 2
> **"Why is it suspicious when an image has its EXIF metadata stripped?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | EXIF removal always indicates steganography | ❌ (legitimate privacy reasons exist) |
| **1** | **It may indicate the image was processed to remove identifying metadata before embedding hidden data** | **✅** |
| 2 | EXIF can only be removed using forensic tools | ❌ |
| 3 | Stripped EXIF means the image file is corrupted | ❌ |

**Why:** While EXIF stripping has legitimate uses (privacy), in a forensic context it's suspicious — especially when compared to similar images that retain their EXIF. Some steganography tools automatically strip EXIF.

### Question 3
> **"Why did cat_03.png have its EXIF metadata stripped while cat_01 and cat_02 retained theirs?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The image was uploaded to social media, which strips EXIF automatically | ❌ |
| **1** | **The steganography embedding tool (Steghide) stripped EXIF during the embedding process** | **✅** |
| 2 | The camera malfunctioned when taking the third photo | ❌ |
| 3 | EXIF is only stored in JPEG files, not PNG | ❌ |

**Why:** Many steganography tools strip EXIF during embedding because the metadata can conflict with the modified pixel data. The steghide_history.log confirmed: 'EXIF metadata stripped from output.'

### Question 4
> **"Why did cat_03.png's LSB chi-square value (0.48) differ so significantly from cat_01 (0.92) and cat_02 (0.89)?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | cat_03 was taken with a lower-quality camera sensor | ❌ |
| **1** | **The embedded zip archive replaced the natural LSB distribution with structured data, changing the statistical signature** | **✅** |
| 2 | cat_03 used a different color space (CMYK instead of RGB) | ❌ |
| 3 | PNG compression artifacts lowered the chi-square value | ❌ |

**Why:** Natural images have semi-random LSBs (chi-square ≈ 1.0). When a compressed file (like a zip) replaces those LSBs, it introduces structured patterns that significantly lower the chi-square statistic.


## 11. Debriefing Verification

Verify the debriefing shows:
- **Title:** "How LSB Steganography Works"
- **Concept:** 24-bit color, 3 channels × 8 bits, LSB replacement, capacity calculation, visual imperceptibility
- **Real-World Tools:** zsteg (PNG), StegDetect, StegExpose, Steghide, OpenStego, chi-square analysis, RS analysis
- **Case Connection:** Three clues (file size, EXIF, chi-square), zsteg confirmed zip payload, steghide log as smoking gun
- **Further Reading:** zsteg, Steghide, chi-square steganalysis, RS analysis, PNG structure, EXIF forensics


## 12. Common Mistakes and Edge Cases

### Testing Edge Cases

| Test | Expected Behavior |
|------|-------------------|
| Clicking cat_01.png and cat_02.png | Should show normal files with EXIF data, chi-square ~0.9 |
| Submitting "cat_01" or "cat_02" | Should NOT match any flag (they're clean) |
| Submitting "steghide" | Does not directly match a flag target/finding (steghide_history.log is not a flag) |
| Submitting "product_designs" | May match if contained in flag description, but not in target or finding |
| Exploring the Tools directory | steghide_history.log is corroborating evidence, not a flag itself |

### Common Student Mistakes

1. **Suspecting all three images** — Students may waste time analyzing cat_01 and cat_02. The file size and EXIF comparisons should quickly narrow the focus to cat_03.
2. **Confusing steganography with encryption** — Steganography hides the **existence** of a message; encryption hides the **content**. LSB stego doesn't encrypt the data.
3. **Not understanding chi-square values** — A lower chi-square value is MORE suspicious (counter-intuitive for some).
4. **Ignoring the steghide log** — While not a flag, the log in the Tools directory provides definitive proof of the technique and intent.
5. **Thinking EXIF removal always = steganography** — The post-quiz tests this nuance. EXIF removal alone is not conclusive; it's the combination with other anomalies that matters.

### Statistical Analysis Deep Dive

For students who want to understand the chi-square test:

```
Chi-square test for LSB:
  For each pair of values (2k, 2k+1) where k = 0, 1, 2, ..., 127:
    Expected: equal frequency of 2k and 2k+1 values
    Observed: actual frequency in the image
    
  If LSBs are untouched (natural): pairs are roughly equal → χ² ≈ 1.0
  If LSBs carry data: pairs become exactly equal → χ² << 1.0
  
  cat_01: χ² = 0.92 → natural (some variation in pairs)
  cat_03: χ² = 0.48 → embedded data has equalized pair frequencies
```


## Quick Reference Card

```
┌──────────────────────────────────────────────────┐
│  SCENARIO 05 — HIDDEN IN PLAIN SIGHT             │
│                                                  │
│  Flag 1: cat_03.png — anomalous image (30 pts)   │
│  Flag 2: LSB steganography — stego (35 pts)      │
│  Flag 3: zip archive — embedded payload (35 pts) │
│                                                  │
│  Key Evidence: cat_03.png is the stego carrier   │
│  Anomalies: 14% larger, EXIF stripped, χ²=0.48   │
│  Payload: product_designs_v4.zip (~38KB)         │
│  Smoking Gun: steghide_history.log in Tools/     │
│  Controls: cat_01 and cat_02 are clean           │
│                                                  │
│  Pre-Quiz: 1→B, 2→B, 3→C, 4→B                    │
│  Post-Quiz: 1→B, 2→B, 3→B, 4→B                   │
└──────────────────────────────────────────────────┘
```
