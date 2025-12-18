# Script Review Report

**Date:** December 18, 2025
**Reviewer:** Claude Code
**Scope:** All SuiteScript files in `Sandbox/` directory

---

## Executive Summary

Four scripts were reviewed in this repository. Several issues were identified ranging from critical bugs (incorrect timezone calculations) to maintainability concerns (hardcoded values). This report details each issue with code examples and recommended fixes.

---

## Critical Issues

### 1. Incorrect Timezone Calculation (UTC+15 Bug)

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

### 2. Inconsistent Currency Text Mapping

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

### 3. Hardcoded Approver Names in Footer

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

### 4. Inconsistent Error Message Terminology

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

### 5. Missing pageInit Validation

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

### 6. Incorrect Script Description in Header

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

### 7. Hardcoded Print Title for Multiple Record Types

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

### 8. Fragile Exchange Rate Parsing in Template

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

### 9. Amount Matching Tolerance May Cause Incorrect Matches

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

### 10. SuiteScript Version Inconsistency

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
| 1 | UTC+15 timezone bug | CheckVoucher, JournalVoucher | Critical | Low |
| 2 | USD mapped to "Pesos" | CheckVoucher | High | Low |
| 3 | Hardcoded approver names | CheckVoucher | High | Medium |
| 4 | Inconsistent error terminology | validateCostCenter | Medium | Low |
| 5 | Missing pageInit validation | validateCostCenter | Medium | Low |
| 6 | Incorrect script description | JournalVoucher | Low | Low |
| 7 | Hardcoded print title | JournalVoucher | Medium | Low |
| 8 | Fragile exchange rate parsing | Vendor Credit Template | Medium | Low |
| 9 | Amount matching tolerance | JournalVoucher | Medium | Medium |
| 10 | SuiteScript version inconsistency | Multiple | Low | Low |

---

## Recommended Action Plan

1. **Immediate:** Fix timezone calculation (Issue #1) - affects all printed documents
2. **Short-term:** Fix currency text mapping (Issue #2) and error messages (Issue #4)
3. **Medium-term:** Refactor hardcoded values to use configuration (Issue #3)
4. **Ongoing:** Standardize coding practices across all scripts
