# Module 37: Regular Expressions (RegExp) — Parsing Engines, Lookaround Assertions, and ReDoS Defense

## Overview

A **Regular Expression (RegExp)** is a sequence of characters that forms a search pattern for text matching, validation, extraction, and string transformation.

Under the hood, JavaScript regular expressions execute on non-deterministic or deterministic finite automata engines inside V8.

Understanding **RegExp Engine Flags (`g`, `i`, `m`, `u`, `s`, `y`, `d`)**, **Named Capturing Groups (`(?<name>...)`)**, **Lookahead and Lookbehind Assertions**, and mitigating **ReDoS (Regular Expression Denial of Service) Catastrophic Backtracking** is essential.

---

## 1. RegExp Architecture & Flags Taxonomy

```mermaid
flowchart TD
    RegexLiteral["/pattern/flags"] --> PatternElements[Pattern Components]
    RegexLiteral --> FlagsTaxonomy[Engine Execution Flags]

    PatternElements --> CharClasses["Character Classes: \\d, \\w, \\s, [a-z]"]
    PatternElements --> Anchors["Anchors: ^ (Start), $ (End), \\b (Word Boundary)"]
    PatternElements --> Quantifiers["Quantifiers: * (0+), + (1+), ? (0 or 1), {n,m}"]
    PatternElements --> Groups["Capturing Groups: (...), (?<name>...), (?:...)"]
    PatternElements --> Lookarounds["Assertions: (?=...), (?!...), (?<=...), (?<!...)"]

    FlagsTaxonomy --> FlagsList["g: Global Match<br/>i: Case-Insensitive<br/>m: Multiline (^ / $ per line)<br/>u: Unicode Mode<br/>s: DotAll (. matches newline)<br/>y: Sticky Matching<br/>d: HasIndices (Match Indices)"]
```

---

## 2. Named Capturing Groups & Lookaround Assertions

```mermaid
flowchart LR
    subgraph Lookaround Assertions
        PositiveLA["Positive Lookahead (?=...)<br/>Matches if followed by pattern"]
        NegativeLA["Negative Lookahead (?!...)<br/>Matches if NOT followed by pattern"]
        PositiveLB["Positive Lookbehind (?<=...)<br/>Matches if preceded by pattern"]
        NegativeLB["Negative Lookbehind (?<!...)<br/>Matches if NOT preceded by pattern"]
    end
```

```javascript
// 1. Named Capturing Groups: (?<year>\d{4})
const datePattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const matchResult = datePattern.exec("2026-08-31");

console.log("Matched Year :", matchResult.groups.year);  // "2026"
console.log("Matched Month:", matchResult.groups.month); // "08"
console.log("Matched Day  :", matchResult.groups.day);   // "31"

// 2. Lookahead & Lookbehind Assertions
// Match price ONLY if preceded by INR currency symbol (Positive Lookbehind)
const pricePattern = /(?<=INR\s?)\d+/g;
const text = "Price is INR 4500 for product A and USD 60 for product B";

console.log("INR Prices Matched:", text.match(pricePattern)); // ["4500"]
```

---

## 3. Catastrophic Backtracking Security Hazard (ReDoS)

**ReDoS (Regular Expression Denial of Service)** occurs when a nested quantifier pattern (e.g. `(a+)+$`) forces the RegExp engine into exponential $\mathcal{O}(2^N)$ backtracking attempts when evaluated against non-matching input strings, freezing the single-threaded Event Loop at 100% CPU:

```mermaid
flowchart TD
    PatternDef["Nested Quantifier Pattern: (a+)+$"] --> InputFail["Non-Matching Input: 'aaaaaaaaaaaaaaaaaaaa!'"]
    InputFail --> ExponentialTree["RegExp Engine Attempts Exponential Backtracking<br/>- 2^N state evaluation paths!"]
    ExponentialTree --> Freeze["Event Loop Freezes at 100% CPU!<br/>ReDoS Security Denial of Service Attack!"]
```

```javascript
// DANGER: ReDoS Catastrophic Backtracking Vulnerability
const vulnerableRegex = /(a+)+$/; 

// UNCOMMENTING THIS WILL FREEZE YOUR CPU THREAD FOR MINUTES:
// vulnerableRegex.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!");

// SAFE PATTERN: Eliminate nested quantifiers! Use atomic matching or un-nested quantifiers
const safeRegex = /^a+$/;
console.log(safeRegex.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!")); // Instantly returns false!
```

---

## 4. Modern String RegExp API Suite (`matchAll`, `replaceAll`)

```javascript
const logData = "ERR_01: DB Timeout, ERR_02: Socket Closed, ERR_03: Auth Fail";
const errorPattern = /ERR_(?<id>\d{2}):\s(?<msg>[^,]+)/g;

// String.prototype.matchAll() returns an iterator over ALL matching groups cleanly
for (const match of logData.matchAll(errorPattern)) {
  console.log(`Error Code ${match.groups.id} -> ${match.groups.msg}`);
}
/*
  Output:
  Error Code 01 -> DB Timeout
  Error Code 02 -> Socket Closed
  Error Code 03 -> Auth Fail
*/
```

---

## Key Production Takeaways

1. **Use Named Capturing Groups `(?<name>...)`**: Replace fragile numeric group indices (`match[1]`) with named capturing groups (`match.groups.name`) for readable regex extraction.
2. **Beware of ReDoS Catastrophic Backtracking**: Avoid nesting quantifiers like `(a+)+` or `(a|a)+`. Test complex regex patterns against bad input strings using ReDoS checkers.
3. **Use `matchAll()` for Global Group Iteration**: Use `str.matchAll(globalRegex)` instead of `exec()` loops to cleanly iterate over capturing groups.
4. **Cache Static `RegExp` Objects Outside Hot Loops**: Avoid instantiating `new RegExp(...)` inside `for` loops; compile regex literals once at module load time.

