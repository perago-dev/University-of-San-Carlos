# Contributing Guidelines

This document outlines coding standards and best practices for SuiteScript development in this repository.

---

## Code Quality Standards

### Script Structure

**Do:** Modularize your code with helper functions and shared modules.

```javascript
// ❌ Bad - 500+ line monolith
function onRequest(context) {
    // ... 500 lines of everything ...
}

// ✅ Good - Separated concerns
define(['./lib/dateUtils', './lib/formatUtils', './lib/pdfBuilder'],
    function(dateUtils, formatUtils, pdfBuilder) {

    function onRequest(context) {
        var data = loadRecordData(context);
        var formattedData = formatTransactionData(data);
        var pdf = pdfBuilder.createVoucher(formattedData);
        context.response.writeFile(pdf, true);
    }

    function loadRecordData(context) { /* ... */ }
    function formatTransactionData(data) { /* ... */ }

    return { onRequest: onRequest };
});
```

### Constants Over Magic Numbers

**Do:** Define constants for configuration values, field IDs, and offsets.

```javascript
// ❌ Bad - Magic numbers
var PHPTime = new Date(UTCDate.setHours(UTCDate.getHours() + 15));

if (currency == 'USD') {
    currencyText = 'Pesos'  // Also wrong!
}

// ✅ Good - Named constants
const MANILA_UTC_OFFSET = 8;
const CURRENCY_TEXT = {
    USD: 'US Dollars',
    PHP: 'Pesos',
    CAD: 'Canadian Dollars',
    EUR: 'Euros',
    SGD: 'Singapore Dollars'
};

var manilaTime = new Date(Date.now() + (MANILA_UTC_OFFSET * 60 * 60 * 1000));
var currencyText = CURRENCY_TEXT[currency] || currency;
```

### Field ID Constants

**Do:** Centralize field IDs to avoid typos and ease maintenance.

```javascript
// ❌ Bad - Hardcoded strings everywhere
var department = loadrec.getValue({ fieldId: 'department' });
var trustFund = loadrec.getValue({ fieldId: 'class' });
var dcbFund = loadrec.getValue({ fieldId: 'cseg_usc_dcb_fund' });

// ✅ Good - Centralized field IDs
const FIELDS = {
    DEPARTMENT: 'department',
    TRUST_FUND: 'class',
    DCB_FUND: 'cseg_usc_dcb_fund',
    EMPLOYEE_ADVANCES: 'custcol_usc_employeeadvances',
    PREPARED_BY: 'custbody_preparedby',
    CHECKED_BY: 'custbody_verifiedby',
    APPROVED_BY: 'custbody_approvedby'
};

var department = loadrec.getValue({ fieldId: FIELDS.DEPARTMENT });
var trustFund = loadrec.getValue({ fieldId: FIELDS.TRUST_FUND });
var dcbFund = loadrec.getValue({ fieldId: FIELDS.DCB_FUND });
```

---

## Shared Utilities

### Date Utilities

Create reusable date functions instead of copy-pasting timezone logic.

```javascript
// FileCabinet/SuiteScripts/lib/dateUtils.js

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([], function() {

    const MANILA_UTC_OFFSET = 8;

    /**
     * Get current time in Manila timezone
     * @returns {Date}
     */
    function getManilaTime() {
        var utcNow = new Date();
        return new Date(utcNow.getTime() + (MANILA_UTC_OFFSET * 60 * 60 * 1000));
    }

    /**
     * Format date as "Mon DD, YYYY HH:MM am/pm"
     * @param {Date} date
     * @returns {string}
     */
    function formatPrintDate(date) {
        var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        var day = date.getDate();
        var month = monthNames[date.getMonth()];
        var year = date.getFullYear();
        var time = formatAMPM(date);

        return month + ' ' + day + ', ' + year + ' ' + time;
    }

    /**
     * Format time as "HH:MM am/pm"
     * @param {Date} date
     * @returns {string}
     */
    function formatAMPM(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'pm' : 'am';

        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;

        return hours + ':' + minutes + ' ' + ampm;
    }

    return {
        getManilaTime: getManilaTime,
        formatPrintDate: formatPrintDate,
        formatAMPM: formatAMPM
    };
});
```

### Format Utilities

```javascript
// FileCabinet/SuiteScripts/lib/formatUtils.js

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([], function() {

    /**
     * Format number with comma separators
     * @param {number|string} value
     * @returns {string}
     */
    function numberWithCommas(value) {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Convert number to words for check printing
     * @param {number} value
     * @param {string} currencyText - e.g., "Pesos", "US Dollars"
     * @returns {string}
     */
    function numberToWords(value, currencyText) {
        var fraction = Math.round((value % 1) * 100);
        var words = convertWholeNumber(Math.floor(value));

        if (fraction > 0) {
            return words + ' ' + currencyText + ' and ' + fraction + '/100 only';
        }
        return words + ' ' + currencyText + ' only';
    }

    /**
     * Convert whole number to words
     * @param {number} num
     * @returns {string}
     */
    function convertWholeNumber(num) {
        var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        var teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
                    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        var scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

        if (num === 0) return 'Zero';

        var words = '';
        var scaleIndex = 0;

        while (num > 0) {
            var chunk = num % 1000;
            if (chunk !== 0) {
                var chunkWords = convertChunk(chunk, ones, tens, teens);
                words = chunkWords + ' ' + scales[scaleIndex] + ' ' + words;
            }
            num = Math.floor(num / 1000);
            scaleIndex++;
        }

        return words.trim().replace(/\s+/g, ' ');
    }

    function convertChunk(num, ones, tens, teens) {
        var result = '';

        if (num >= 100) {
            result += ones[Math.floor(num / 100)] + ' Hundred ';
            num %= 100;
        }

        if (num >= 20) {
            result += tens[Math.floor(num / 10)] + ' ';
            num %= 10;
        } else if (num >= 10) {
            result += teens[num - 10] + ' ';
            return result;
        }

        if (num > 0) {
            result += ones[num] + ' ';
        }

        return result;
    }

    return {
        numberWithCommas: numberWithCommas,
        numberToWords: numberToWords
    };
});
```

---

## PDF Generation Best Practices

### Avoid String Concatenation

**Do:** Use structured approaches for building PDF XML.

```javascript
// ❌ Bad - String concatenation nightmare
htmlvar = '';
htmlvar += '<?xml version=\"1.0\"?>\n';
htmlvar += '<pdf>\n';
htmlvar += '<head>';
htmlvar += '<table><tr><td>' + xml.escape(value1) + '</td>';
htmlvar += '<td>' + xml.escape(value2) + '</td></tr></table>';
// ... 200 more lines ...

// ✅ Better - Template literals (SuiteScript 2.1)
const pdfXml = `<?xml version="1.0"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf>
<head>
    <style>${styles}</style>
</head>
<body>
    <table>
        <tr>
            <td>${xml.escape(value1)}</td>
            <td>${xml.escape(value2)}</td>
        </tr>
    </table>
</body>
</pdf>`;

// ✅ Best - Use Advanced PDF Templates in NetSuite
// Store template in FileCabinet, render with N/render
var templateFile = file.load({ id: 'Templates/check_voucher.xml' });
var renderer = render.create();
renderer.setTemplateByScriptId('CUSTTMPL_CHECK_VOUCHER');
renderer.addRecord('record', loadrec);
renderer.addCustomDataSource({
    format: render.DataSource.OBJECT,
    alias: 'custom',
    data: { printDate: printDate, currencyText: currencyText }
});
var pdf = renderer.renderAsPdf();
```

---

## Error Handling

### Be Specific, Log Context

```javascript
// ❌ Bad - Generic catch, swallows details
try {
    // ... lots of code ...
} catch (e) {
    log.error("Error", e);
}

// ✅ Good - Specific handling, rich context
function loadRecordData(recordId, recordType) {
    try {
        var rec = record.load({
            type: recordType,
            id: recordId,
            isDynamic: true
        });
        return rec;
    } catch (e) {
        log.error({
            title: 'Failed to load record',
            details: {
                recordType: recordType,
                recordId: recordId,
                error: e.message,
                stack: e.stack
            }
        });
        throw error.create({
            name: 'RECORD_LOAD_FAILED',
            message: 'Could not load ' + recordType + ' record ' + recordId,
            cause: e
        });
    }
}
```

---

## Client Script Entry Points

### Always Include pageInit for Edit Mode

```javascript
// ❌ Incomplete - No initial validation
return {
    fieldChanged: fieldChanged,
    saveRecord: saveRecord
};

// ✅ Complete - Validates on load
function pageInit(context) {
    if (context.mode === 'edit') {
        validateInitialState(context.currentRecord);
    }
}

return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    saveRecord: saveRecord
};
```

---

## SuiteScript Version

### Standardize on 2.1

All new scripts should use SuiteScript 2.1 for modern JavaScript features:

```javascript
/**
 * @NApiVersion 2.1        // Not 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'], (record, search) => {  // Arrow functions

    const onRequest = (context) => {
        const { recordid, action } = context.request.parameters;  // Destructuring

        const lines = [];
        for (let i = 0; i < lineCount; i++) {  // let instead of var
            lines.push({ /* ... */ });
        }
    };

    return { onRequest };
});
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Script files | `Softype_<Type>_<Name>.js` | `Softype_ST_CheckVoucher.js` |
| Client Scripts | `_CS_` suffix | `Softype_CS_validateCostCenter.js` |
| Suitelets | `_ST_` suffix | `Softype_ST_CheckVoucher.js` |
| User Events | `_UE_` suffix | `Softype_UE_beforeSubmit.js` |
| Scheduled | `_SS_` suffix | `Softype_SS_dailySync.js` |
| Map/Reduce | `_MR_` suffix | `Softype_MR_bulkUpdate.js` |
| Library modules | `lib/` directory | `lib/dateUtils.js` |
| Constants | UPPER_SNAKE_CASE | `MANILA_UTC_OFFSET` |
| Functions | camelCase | `getManilaTime()` |

---

## Code Review Checklist

Before submitting a PR, verify:

- [ ] No hardcoded employee names or initials
- [ ] No magic numbers (use named constants)
- [ ] Timezone calculations use UTC+8 for Manila
- [ ] Field IDs are centralized or documented
- [ ] Error handling logs sufficient context
- [ ] Client scripts include `pageInit` if validating
- [ ] PDF templates use `xml.escape()` for all dynamic values
- [ ] Shared utilities extracted (no copy-paste between scripts)
- [ ] Using SuiteScript 2.1 with modern syntax
- [ ] JSDoc header has correct `@Description`

---

## File Organization

```
Sandbox/
├── Scripts/
│   ├── Client/           # Client Scripts
│   ├── Suitelet/         # Suitelets
│   ├── UserEvent/        # User Event Scripts
│   ├── Scheduled/        # Scheduled Scripts
│   └── lib/              # Shared modules
│       ├── dateUtils.js
│       ├── formatUtils.js
│       └── constants.js
├── Prints/
│   ├── Advanced pdf prints/   # FreeMarker templates
│   └── Suitelet Prints/       # Legacy suitelet-based prints
└── Tests/                     # Unit tests (future)
```

---

## Resources

- [SuiteScript 2.1 API Reference](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_156042690639.html)
- [NetSuite Advanced PDF Templates](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N541431.html)
- [BFO Report Writer Guide](https://bfo.com/products/report/docs/userguide.pdf) (PDF rendering engine)
