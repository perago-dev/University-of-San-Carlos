# Script Review Report

**Date:** December 18, 2025
**Reviewer:** Claude Code
**Scope:** All SuiteScript files in `Sandbox/` directory

---

## Executive Summary

Four scripts were reviewed in this repository. Several issues were identified ranging from critical bugs (incorrect timezone calculations) to maintainability concerns (hardcoded values). This report details each issue with code examples and recommended fixes.

---

## Critical Issues

### 1. Undefined `loadrec` Causes Script Crash

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Lines 28-43)

**Severity:** Critical
**Impact:** Script crashes with unhandled error if `recordName` parameter is invalid

**Description:**
The script only defines `loadrec` inside conditional blocks for specific record types. If `recordName` is anything other than `"inventoryadjustment"` or `"deposit"`, `loadrec` remains undefined and the script crashes on line 43.

**Current Code:**
```javascript
if (recordName == "inventoryadjustment") {
    var loadrec = record.load({ type: 'inventoryadjustment', id: recordid, isDynamic: true });
}

if (recordName == "deposit") {
    var loadrec = record.load({ type: 'deposit', id: recordid, isDynamic: true });
}

var trandate = loadrec.getText({ fieldId: 'trandate' });  // CRASH if loadrec undefined
```

**Recommended Fix:**
```javascript
var loadrec;
if (recordName == "inventoryadjustment") {
    loadrec = record.load({ type: 'inventoryadjustment', id: recordid, isDynamic: true });
} else if (recordName == "deposit") {
    loadrec = record.load({ type: 'deposit', id: recordid, isDynamic: true });
} else {
    throw error.create({
        name: 'INVALID_RECORD_TYPE',
        message: 'Unsupported record type: ' + recordName
    });
}
```

---

### 2. Incorrect Timezone Calculation (UTC+15 Bug)

**Affected Files:**
- `Sandbox/Prints/Suitelet Prints/Softype_ST_CheckVoucher.js` (Line 75)
- `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Line 68)

**Severity:** Critical
**Impact:** All printed timestamps are 7 hours ahead of actual Manila time

**Description:**
The code attempts to convert UTC to Manila time (PHT) but adds 15 hours instead of 8. UTC+15 is not a valid timezone—the maximum valid offset is UTC+14 (Line Islands, Kiribati).

**Current Code:**
```javascript
var UTCDate = new Date(new Date().toUTCString());
var PHPTime = new Date(UTCDate.setHours(UTCDate.getHours() + 15)); // Manilla Time.
```

**Recommended Fix:**
```javascript
var UTCDate = new Date(new Date().toUTCString());
var PHPTime = new Date(UTCDate.setHours(UTCDate.getHours() + 8)); // Manila Time (UTC+8)
```

**Alternative (More Robust):**
```javascript
// Using toLocaleString for automatic DST handling
var manilaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
var PHPTime = new Date(manilaTime);
```

---

## High Priority Issues

### 3. `replace(',', '')` Only Removes First Comma

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_CheckVoucher.js` (Lines 353, 527, 529, 533, 535, 623, 626)

**Severity:** High
**Impact:** Amounts over 1,000,000 are parsed incorrectly, causing wrong totals

**Description:**
JavaScript's `String.replace()` with a string argument only replaces the first occurrence. For amounts like `"1,234,567.89"`, only the first comma is removed, resulting in `"1234,567.89"` which `parseFloat()` truncates to `1234`.

**Current Code:**
```javascript
parseFloat(creditamount.replace(',', ''));
// "1,234,567.89".replace(',', '') → "1234,567.89" → parseFloat → 1234  ❌
```

**Recommended Fix:**
```javascript
parseFloat(creditamount.replace(/,/g, ''));
// "1,234,567.89".replace(/,/g, '') → "1234567.89" → parseFloat → 1234567.89  ✓
```

**All Affected Lines:**
- Line 353: `parseFloat(creditamount.replace(',', ''))`
- Line 527: `parseFloat(creditamount.replace(',', ''))`
- Line 529: `parseFloat(creditamount.replace(',', ''))`
- Line 533: `parseFloat(debitamount.replace(',', ''))`
- Line 535: `parseFloat(debitamount.replace(',', ''))`
- Line 623: `parseFloat(creditamount)` (no replace, but related)
- Line 626: `parseFloat(debitamount)` (no replace, but related)

---

### 4. Inconsistent Currency Text Mapping

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_CheckVoucher.js` (Lines 78-86)

**Severity:** High
**Impact:** Check amounts in words may display incorrect currency name

**Description:**
Both USD and PHP currencies map to "Pesos", which is incorrect for USD.

**Current Code:**
```javascript
var currencyText = '';
if (currency == 'USD') {
    currencyText = 'Pesos'        // Wrong - should be 'US Dollars'
} else if (currency == 'PHP') {
    currencyText = 'Pesos'        // Correct
} else if (currency == 'CAD') {
    currencyText = 'Canadian Dollars'
} else if (currency == 'EUR') {
    currencyText = 'Euros'
} else if (currency == 'SGD') {
    currencyText = 'Singapore Dollars'
}
```

**Recommended Fix:**
```javascript
var currencyText = '';
if (currency == 'USD') {
    currencyText = 'US Dollars'
} else if (currency == 'PHP') {
    currencyText = 'Pesos'
} else if (currency == 'CAD') {
    currencyText = 'Canadian Dollars'
} else if (currency == 'EUR') {
    currencyText = 'Euros'
} else if (currency == 'SGD') {
    currencyText = 'Singapore Dollars'
} else {
    currencyText = currency; // Fallback to currency code
}
```

---

### 6. `xml.escape()` Called with Object Instead of String

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_CheckVoucher.js` (Lines 613-618, 638-643)

**Severity:** Medium
**Impact:** PDF displays `[object Object]` instead of formatted amounts

**Description:**
The `xml.escape()` function expects a string argument, but the code passes an object with an `xmlText` property. This causes the output to render as `[object Object]`.

**Current Code:**
```javascript
htmlvar += xml.escape({
    xmlText: numberWithCommas(debitamountUSD.toFixed(2))
}) + '</td>';
// Output: "[object Object]"
```

**Recommended Fix:**
```javascript
htmlvar += xml.escape(numberWithCommas(debitamountUSD.toFixed(2))) + '</td>';
// Output: "1,234.56"
```

---

### 7. Hardcoded Approver Names in Footer

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_CheckVoucher.js` (Lines 241-246)

**Severity:** High
**Impact:** Personnel changes require code modifications; not scalable

**Description:**
The check voucher footer contains hardcoded employee initials and approver names.

**Current Code:**
```javascript
htmlvar += '<td ...>Prepared by:<p ...><span ...>LRV/ JJJM</span>...</p><p ...>AOC...</p></td>';
htmlvar += '<td ...>Checked by:<p ...><span ...>AGM </span>...</p><p ...>MJA...</p></td>';
// ...
htmlvar += '<td ...>Approved by:<p ...>Fr. Arthur Z. Villanueva, SVD</p></td>';
```

**Recommended Fix:**
Use custom body fields or a configuration record to store these values:

```javascript
var preparedByInitials = loadrec.getValue({ fieldId: 'custbody_prepared_by_initials' }) || '';
var checkedByInitials = loadrec.getValue({ fieldId: 'custbody_checked_by_initials' }) || '';
var approvedByName = loadrec.getValue({ fieldId: 'custbody_approved_by_name' }) || '';

htmlvar += '<td ...>Prepared by:<p ...>' + xml.escape(preparedByInitials) + '</p></td>';
htmlvar += '<td ...>Checked by:<p ...>' + xml.escape(checkedByInitials) + '</p></td>';
htmlvar += '<td ...>Approved by:<p ...>' + xml.escape(approvedByName) + '</p></td>';
```

---

## Medium Priority Issues

### 8. Missing `xml.escape()` on User Input Fields

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Lines 375, 377, 417)

**Severity:** Medium
**Impact:** PDF generation fails or renders incorrectly if memo contains special characters

**Description:**
User-entered values (`tranid`, `trandate`, `memo`) are inserted directly into XML without escaping. If these fields contain `<`, `>`, `&`, or quotes, the PDF XML becomes invalid.

**Current Code:**
```javascript
html += '...Reference No:</strong></span><span ...>' + tranid + '</span></td></tr>'
html += '...Transaction Date:</strong></span><span ...>' + trandate + '</span></td></tr>'
html += '<td ><b>Particular:</b>&nbsp;&nbsp;' + memo + '</td>'
```

**Recommended Fix:**
```javascript
html += '...Reference No:</strong></span><span ...>' + xml.escape(tranid) + '</span></td></tr>'
html += '...Transaction Date:</strong></span><span ...>' + xml.escape(trandate) + '</span></td></tr>'
html += '<td ><b>Particular:</b>&nbsp;&nbsp;' + xml.escape(memo) + '</td>'
```

---

### 9. System Notes Search Hardcoded to `inventoryadjustment`

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Lines 294-311)

**Severity:** Medium
**Impact:** "Prepared By" field is always blank for deposit records

**Description:**
The system notes search to find who created the record is hardcoded to search `inventoryadjustment` type, even when printing a deposit.

**Current Code:**
```javascript
var system_obj = search.create({
    type: 'inventoryadjustment',  // Hardcoded - won't find deposit system notes
    filters: [["internalid", "anyof", recordid]],
    columns: [
        search.createColumn({ name: "name", join: "systemNotes" }),
        search.createColumn({ name: "type", join: "systemNotes" })
    ]
});
```

**Recommended Fix:**
```javascript
var system_obj = search.create({
    type: recordName,  // Use dynamic record type
    filters: [["internalid", "anyof", recordid]],
    columns: [
        search.createColumn({ name: "name", join: "systemNotes" }),
        search.createColumn({ name: "type", join: "systemNotes" })
    ]
});
```

---

### 10. Inconsistent Error Message Terminology

**Affected File:** `Sandbox/Scripts/Softype_CS_validateCostCenter.js` (Lines 52, 65)

**Severity:** Medium
**Impact:** User confusion due to mismatched field names

**Description:**
The error messages reference "Trust fund" and "DCB fund" but the code checks fields labeled "Class" and "Cost Center (Fund)".

**Current Code:**
```javascript
// Line 36-37: Fields being checked
fieldsWithValues.push('Class');
fieldsWithValues.push('Cost Center (Fund)');

// Line 52, 65: Error message text
message: 'Error: Only one field can have a value among Department, Trust fund, and DCB fund...'
```

**Recommended Fix:**
```javascript
// Option A: Update field labels to match error message
fieldsWithValues.push('Trust Fund');      // instead of 'Class'
fieldsWithValues.push('DCB Fund');        // instead of 'Cost Center (Fund)'

// Option B: Update error message to match field labels
message: 'Error: Only one field can have a value among Department, Class, and Cost Center (Fund)...'
```

---

### 11. Missing pageInit Validation

**Affected File:** `Sandbox/Scripts/Softype_CS_validateCostCenter.js`

**Severity:** Medium
**Impact:** Existing records with invalid data won't show warnings until user edits

**Description:**
The client script validates on `fieldChanged` and `saveRecord` but lacks a `pageInit` entry point to validate when a record is first loaded.

**Recommended Addition:**
```javascript
function pageInit(context) {
    if (context.mode === 'edit') {
        var currentRecord = context.currentRecord;
        var validation = checkFieldValues(currentRecord);

        if (validation.count > 1) {
            dialog.alert({
                title: 'Data Warning',
                message: 'This record has multiple cost center fields populated: ' +
                         validation.fields.join(', ') +
                         '. Please correct before saving.'
            });
        }
    }
}

return {
    pageInit: pageInit,      // Add this
    fieldChanged: fieldChanged,
    saveRecord: saveRecord
};
```

---

### 12. Incorrect Script Description in Header

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Line 9)

**Severity:** Low
**Impact:** Developer confusion during maintenance

**Description:**
The JSDoc header says "Inventory Transfer Print" but the script handles inventory adjustments and deposits.

**Current Code:**
```javascript
/**@Description :  Suitelet for Inventory Transfer Print. */
```

**Recommended Fix:**
```javascript
/**@Description :  Suitelet for Inventory Adjustment and Deposit Print. */
```

---

### 13. Hardcoded Print Title for Multiple Record Types

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Line 147)

**Severity:** Medium
**Impact:** Deposits print with "Inventory Adjustment" title

**Description:**
The print title is hardcoded as "Inventory Adjustment" regardless of record type.

**Current Code:**
```javascript
html += '<td align="right"><span class="title">Inventory Adjustment</span></td>'
```

**Recommended Fix:**
```javascript
var printTitle = recordName == "inventoryadjustment" ? "Inventory Adjustment" : "Deposit";
html += '<td align="right"><span class="title">' + printTitle + '</span></td>'
```

---

### 14. Fragile Exchange Rate Parsing in Template

**Affected File:** `Sandbox/Prints/Advanced pdf prints/custtmpl_113_8226925_233.template.xml` (Line 69)

**Severity:** Medium
**Impact:** Template may break with currencies other than USD or PHP

**Description:**
The exchange rate parsing uses string replacement that only handles specific currency symbols.

**Current Code:**
```freemarker
<#assign exRate = record.exchangerate?replace("$","")?replace("PHP","")?replace(",","")?number>
```

**Recommended Fix:**
```freemarker
<#-- Remove all non-numeric characters except decimal point -->
<#assign exRate = record.exchangerate?replace("[^0-9.]", "", "r")?number>
```

---

### 15. Amount Matching Tolerance May Cause Incorrect Matches

**Affected File:** `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Line 93)

**Severity:** Medium
**Impact:** GL lines may be matched to wrong inventory lines if amounts are similar

**Description:**
The script matches GL impact lines to inventory lines based on amount with a 0.01 tolerance. If two lines have similar amounts, the wrong match may occur.

**Current Code:**
```javascript
var tolerance = 0.01;
for (var j = 0; j < lineItemsData.length; j++) {
    var lineItem = lineItemsData[j];
    if (Math.abs(lineItem.totalAmount - glAmount) <= tolerance) {
        matchedItem = lineItem;
        break;  // Takes first match, may be wrong
    }
}
```

**Recommended Fix:**
```javascript
// Match by line index from GL search instead of amount
var glLineIndex = parseInt(glLine.getValue("line")) || -1;

for (var j = 0; j < lineItemsData.length; j++) {
    if (lineItemsData[j].lineIndex === glLineIndex) {
        matchedItem = lineItemsData[j];
        break;
    }
}
```

---

## Low Priority Issues

### 16. Inconsistent Month Name Abbreviations

**Affected Files:**
- `Sandbox/Prints/Suitelet Prints/Softype_ST_CheckVoucher.js` (Line 363)
- `Sandbox/Prints/Suitelet Prints/Softype_ST_USC_JournalVoucher.js` (Line 75)

**Severity:** Low
**Impact:** Cosmetic inconsistency in printed dates

**Description:**
The month names array mixes 3-letter abbreviations with full names.

**Current Code:**
```javascript
var monthNames = ["Jan", "Feb", "March", "April", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//                 ^^^    ^^^    ^^^^^    ^^^^^                                  ^^^
//                 3-char 3-char 5-char   5-char                                 3-char
```

**Recommended Fix:**
```javascript
// Option A: All abbreviated
var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Option B: All full names
var monthNames = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
```

---

### 17. SuiteScript Version Inconsistency

**Affected Files:**
- `Softype_ST_CheckVoucher.js` uses `@NApiVersion 2.x`
- `Softype_ST_USC_JournalVoucher.js` uses `@NApiVersion 2.1`
- `Softype_CS_validateCostCenter.js` uses `@NApiVersion 2.1`

**Recommendation:**
Standardize on SuiteScript 2.1 for all scripts to enable modern JavaScript features (arrow functions, const/let, template literals).

---

## Summary Table

| # | Issue | File | Severity | Effort |
|---|-------|------|----------|--------|
| 1 | Undefined `loadrec` crash | JournalVoucher | **Critical** | Low |
| 2 | UTC+15 timezone bug | CheckVoucher, JournalVoucher | **Critical** | Low |
| 3 | `replace(',','')` only removes first comma | CheckVoucher | **High** | Low |
| 4 | USD mapped to "Pesos" | CheckVoucher | High | Low |
| 5 | Hardcoded approver names | CheckVoucher | High | Medium |
| 6 | `xml.escape()` with object | CheckVoucher | Medium | Low |
| 7 | Hardcoded approver names | CheckVoucher | High | Medium |
| 8 | Missing `xml.escape()` on inputs | JournalVoucher | Medium | Low |
| 9 | System notes search hardcoded | JournalVoucher | Medium | Low |
| 10 | Inconsistent error terminology | validateCostCenter | Medium | Low |
| 11 | Missing pageInit validation | validateCostCenter | Medium | Low |
| 12 | Incorrect script description | JournalVoucher | Low | Low |
| 13 | Hardcoded print title | JournalVoucher | Medium | Low |
| 14 | Fragile exchange rate parsing | Vendor Credit Template | Medium | Low |
| 15 | Amount matching tolerance | JournalVoucher | Medium | Medium |
| 16 | Inconsistent month abbreviations | CheckVoucher, JournalVoucher | Low | Low |
| 17 | SuiteScript version inconsistency | Multiple | Low | Low |

---

## Recommended Action Plan

1. **Immediate:** Fix critical issues (#1, #2, #3) — script crashes and data corruption
2. **Short-term:** Fix high priority issues (#4, #5) and xml.escape issues (#6, #8)
3. **Medium-term:** Refactor hardcoded values (#7), fix deposit support (#9, #13)
4. **Ongoing:** Standardize coding practices across all scripts
