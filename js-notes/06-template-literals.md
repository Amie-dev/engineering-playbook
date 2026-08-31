# Module 06: Template Literals — Interpolation, Tagged Parsing, and Security Sanitization

## Overview

Introduced in ECMAScript 2015 (ES6), **Template Literals** use backtick delimiters (`` ` ``) instead of single or double quotes (`'` or `"`).

They provide three core features:
1. **Multi-line String Preservation**: Preserves raw line breaks and formatting without requiring `\n` escape sequences.
2. **Expression Interpolation (`${expr}`)**: Evaluates embedded JavaScript expressions inline with implicit string coercion.
3. **Tagged Template Literals**: Allows custom functions to intercept, tokenize, sanitize, and transform template strings and dynamic values before assembly.

---

## 1. Template Literal Architecture

```mermaid
flowchart TD
    Backtick[Backtick Delimiter Syntax `` ` ``] --> Features[Template Literal Capabilities]
    
    Features --> Interp[1. Expression Interpolation<br/>Evaluates ${expression} inline]
    Features --> Multiline[2. Native Multi-Line<br/>Preserves newlines & whitespace]
    Features --> Tagged[3. Tagged Template Pipelines<br/>Custom function parsing & sanitization]
    Features --> Raw[4. Raw String Access<br/>Accesses un-escaped raw backslashes]
```

---

## 2. Expression Interpolation (`${expression}`)

Inside template literals, any valid ECMAScript expression inside `${ ... }` is evaluated, coerced to a string, and concatenated inline:

```javascript
const item = "Enterprise Workstation";
const unitPrice = 125000;
const quantity = 3;
const taxRate = 0.18;

// 1. Complex Arithmetic & Logic inside ${}
const invoice = `Summary: ${quantity}x ${item} | Subtotal: Rs.${quantity * unitPrice} | Total (incl. 18% Tax): Rs.${(quantity * unitPrice * (1 + taxRate)).toFixed(2)}`;
console.log(invoice);

// 2. Embedded Function Calls & Ternary Logic
const user = { name: "Ananya", tier: "Gold", points: 4500 };
console.log(`Greeting: Welcome back ${user.tier === "Gold" ? "VIP Client " : ""}${user.name.toUpperCase()}!`);
```

---

## 3. Tagged Template Literals & Parsing Pipeline

Tagged templates turn a template literal into a function call. The tag function receives an array of static string literals as its first argument, followed by the evaluated interpolation values:

$$\text{tagFunction(stringsArray, value1, value2, ...valueN)}$$

```mermaid
flowchart LR
    subgraph Tagged Template Invocation: sanitizeHTML`User ${name} posted ${comment}`
        Input[Template Literal Input] --> SplitStrings["stringsArray: ['User ', ' posted ', '']"]
        Input --> SplitValues["valuesArray: [name, comment]"]
        
        SplitStrings --> TagFn[Custom Tag Function Pipeline]
        SplitValues --> TagFn
        
        TagFn --> Output[Sanitized HTML String Output]
    end
```

### XSS Prevention via Tagged HTML Sanitization

```javascript
// Security Tag Function to HTML-encode untrusted user input
function safeHTML(strings, ...values) {
  return strings.reduce((acc, staticStr, i) => {
    const rawVal = values[i - 1];
    
    // Sanitize dynamic value against XSS attacks
    const sanitizedVal = String(rawVal ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return acc + sanitizedVal + staticStr;
  });
}

const untrustedUserComment = "<script>alert('Hacked!');</script>";
const safeCardHTML = safeHTML`<div class="comment">${untrustedUserComment}</div>`;

console.log(safeCardHTML);
// Output: <div class="comment">&lt;script&gt;alert(&#39;Hacked!&#39;);&lt;/script&gt;</div>
```

---

## 4. Raw Strings & `String.raw`

The `String.raw` tag function accesses raw backslash escape sequences without interpreting them:

```javascript
// 1. Standard String: \n is interpreted as a newline break
const standardPath = "C:\\Windows\\System32\\node.exe";

// 2. String.raw Tagged Template: Preserves literal backslashes
const rawPath = String.raw`C:\Windows\System32\node.exe`;
console.log(rawPath); // Output: C:\Windows\System32\node.exe

// Inspecting raw strings in custom tag functions
function inspectRaw(strings) {
  console.log("Cooked String:", strings[0]);     // Interpreted escape
  console.log("Raw String   :", strings.raw[0]); // Literal raw backslashes
}

inspectRaw`Line 1\nLine 2`;
```

---

## Key Production Takeaways

1. **Use Tagged Templates for Security Sanitization**: Use custom tagged template functions (`html`, `sql`) to automatically escape HTML entities and SQL queries to prevent XSS and SQL injection.
2. **Prefer Template Literals over Concatenation**: Avoid string concatenation (`a + " " + b`); template literals (`${a} ${b}`) improve readability and eliminate formatting errors.
3. **Use `String.raw` for Regex Patterns and Windows File Paths**: Use `String.raw` when defining Windows file paths or complex regular expressions to avoid double-escaping backslashes (`\\`).
4. **Remember Automatic String Coercion**: Values evaluated inside `${expr}` are automatically converted to strings via `String(expr)`.

