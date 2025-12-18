/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/***************************************************************************************
 ** Copyright (c) 1998-2020 Softype, Inc.
 ** All Rights Reserved.
 **
 ** @Author      : Saroja Iyer
 ** @Dated       : 26 Nov 2019
 ** @Version     : 2.1
 ** @Description : Suitelet to print Check Voucher PDF
 ** @Update      : Refactored to use shared utility modules per CONTRIBUTING.md
 ***************************************************************************************/

define([
    'N/record',
    'N/xml',
    'N/render',
    'N/search',
    'N/config',
    'N/file',
    'N/log',
    '../../Scripts/lib/dateUtils',
    '../../Scripts/lib/formatUtils',
    '../../Scripts/lib/constants'
], (record, xml, render, search, config, file, log, dateUtils, formatUtils, constants) => {

    const { FIELDS, SUBLISTS, ITEM_RECORD_TYPES } = constants;
    const { formatPrintDate, getManilaTime } = dateUtils;
    const { numberWithCommas, parseFormattedNumber, CURRENCY_TEXT } = formatUtils;

    const onRequest = (context) => {
        if (context.request.method !== 'GET') return;

        try {
            const recordid = context.request.parameters.recordid;
            if (!recordid) {
                context.response.write('Error: Missing recordid parameter');
                return;
            }

            const loadrec = record.load({
                type: 'check',
                id: recordid,
                isDynamic: true
            });

            // Extract header data
            const headerData = extractHeaderData(loadrec);
            const companyData = getCompanyData();
            const accountArray = getLineItemData(loadrec);
            const glData = getGLData(recordid);
            const totals = calculateTotals(glData.glLines);
            const printDate = formatPrintDate(getManilaTime());

            // Build and output PDF
            const pdfXml = buildPdfXml(headerData, companyData, accountArray, glData, totals, printDate);
            const pdfFile = render.xmlToPdf({ xmlString: pdfXml });
            context.response.writeFile(pdfFile, true);

        } catch (e) {
            log.error('Check Voucher Error', e);
            context.response.write('Error generating Check Voucher. Please contact support.');
        }
    };

    const extractHeaderData = (loadrec) => {
        // Use getValue for currency code (e.g., 'PHP'), getText for display name
        const currencyCode = loadrec.getValue({ fieldId: FIELDS.CURRENCY });
        const currencyDisplay = loadrec.getText({ fieldId: FIELDS.CURRENCY });
        return {
            transactionNumber: loadrec.getValue({ fieldId: FIELDS.TRANSACTION_NUMBER }) || '',
            entity: loadrec.getText({ fieldId: FIELDS.ENTITY }) || '',
            date: loadrec.getText({ fieldId: FIELDS.TRAN_DATE }) || '',
            memo: loadrec.getValue({ fieldId: FIELDS.MEMO }) || '',
            checkNo: loadrec.getValue({ fieldId: FIELDS.TRAN_ID }) || '',
            amount: loadrec.getValue({ fieldId: FIELDS.USER_TOTAL }) || 0,
            location: loadrec.getText({ fieldId: FIELDS.LOCATION }) || '',
            currency: currencyCode,
            currencyText: CURRENCY_TEXT[currencyCode] || currencyDisplay || 'Pesos',
            exchangeRate: loadrec.getValue({ fieldId: FIELDS.EXCHANGE_RATE })
        };
    };

    const getCompanyData = () => {
        const companyInfo = config.load({ type: config.Type.COMPANY_INFORMATION });
        const companyFileID = companyInfo.getValue({ fieldId: 'pagelogo' });
        let logoUrl = '';
        if (companyFileID) {
            try {
                const fileObj = file.load({ id: companyFileID });
                logoUrl = fileObj.url;
            } catch (e) {
                log.error('Logo Load Error', e);
            }
        }
        return {
            name: companyInfo.getValue({ fieldId: 'companyname' }),
            logo: logoUrl
        };
    };

    const getLineItemData = (loadrec) => {
        const accountArray = [];

        // Process items
        const itemCount = loadrec.getLineCount({ sublistId: SUBLISTS.ITEM });
        for (let i = 0; i < itemCount; i++) {
            const itemId = loadrec.getSublistValue({ sublistId: SUBLISTS.ITEM, fieldId: 'item', line: i });
            if (!itemId) continue;

            const itemType = loadrec.getSublistValue({ sublistId: SUBLISTS.ITEM, fieldId: 'itemtype', line: i });
            const recordType = ITEM_RECORD_TYPES[itemType] || 'otherchargeitem';
            const recItem = record.load({ type: recordType, id: itemId });

            let accountIds = [];
            if (itemType === 'InvtPart') {
                accountIds = [recItem.getValue('cogsaccount'), recItem.getValue('assetaccount')];
            } else {
                const fieldMap = { NonInvtPart: 'expenseaccount', Service: 'incomeaccount', Discount: 'account' };
                accountIds = [recItem.getValue(fieldMap[itemType] || 'expenseaccount')];
            }

            accountArray.push({
                accountId: accountIds,
                department: loadrec.getSublistText({ sublistId: SUBLISTS.ITEM, fieldId: FIELDS.DEPARTMENT, line: i }) || '',
                trustFunds: loadrec.getSublistText({ sublistId: SUBLISTS.ITEM, fieldId: FIELDS.CLASS, line: i }) || '',
                employee: loadrec.getSublistText({ sublistId: SUBLISTS.ITEM, fieldId: FIELDS.EMPLOYEE_ADVANCES, line: i }) || '',
                DCBFunds: loadrec.getSublistText({ sublistId: SUBLISTS.ITEM, fieldId: FIELDS.DCB_FUND, line: i }) || '',
                vehicle: loadrec.getSublistText({ sublistId: SUBLISTS.ITEM, fieldId: FIELDS.VEHICLE, line: i }) || '',
                amount: loadrec.getSublistText({ sublistId: SUBLISTS.ITEM, fieldId: 'amount', line: i }) || ''
            });
        }

        // Process expenses
        const expenseCount = loadrec.getLineCount({ sublistId: SUBLISTS.EXPENSE });
        for (let e = 0; e < expenseCount; e++) {
            accountArray.push({
                accountId: [loadrec.getSublistValue({ sublistId: SUBLISTS.EXPENSE, fieldId: 'account', line: e })],
                department: loadrec.getSublistText({ sublistId: SUBLISTS.EXPENSE, fieldId: FIELDS.DEPARTMENT, line: e }) || '',
                trustFunds: loadrec.getSublistText({ sublistId: SUBLISTS.EXPENSE, fieldId: FIELDS.CLASS, line: e }) || '',
                employee: loadrec.getSublistText({ sublistId: SUBLISTS.EXPENSE, fieldId: FIELDS.EMPLOYEE_ADVANCES, line: e }) || '',
                DCBFunds: loadrec.getSublistText({ sublistId: SUBLISTS.EXPENSE, fieldId: FIELDS.DCB_FUND, line: e }) || '',
                vehicle: loadrec.getSublistText({ sublistId: SUBLISTS.EXPENSE, fieldId: FIELDS.VEHICLE, line: e }) || '',
                amount: loadrec.getSublistText({ sublistId: SUBLISTS.EXPENSE, fieldId: 'amount', line: e }) || ''
            });
        }

        return accountArray;
    };

    const getGLData = (recordid) => {
        const glSearch = search.create({
            type: 'transaction',
            columns: ['account', 'creditamount', 'debitamount', 'department', 'class', FIELDS.DCB_FUND],
            filters: [search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: recordid })]
        }).run().getRange(0, 1000);

        let checkAmountInWords = 0;
        const glLines = glSearch.map(line => {
            const accName = line.getText('account');
            const creditAmount = parseFormattedNumber(line.getValue('creditamount'));
            const debitAmount = parseFormattedNumber(line.getValue('debitamount'));

            if (accName.indexOf('Cash In Bank') !== -1) {
                checkAmountInWords += creditAmount;
            }

            return {
                accId: line.getValue('account'),
                accountName: accName,
                creditAmount,
                debitAmount,
                department: line.getText('department') || '',
                trustFund: line.getText('class') || '',
                dcbFund: line.getText(FIELDS.DCB_FUND) || ''
            };
        });

        return { glLines, checkAmountInWords };
    };

    const calculateTotals = (glLines) => {
        let credTotal = 0;
        let debTotal = 0;
        glLines.forEach(line => {
            credTotal += line.creditAmount;
            debTotal += line.debitAmount;
        });
        return { credTotal, debTotal };
    };

    const findMatchingLineData = (accountArray, accId) => {
        for (const item of accountArray) {
            if (item.accountId && item.accountId.indexOf(accId) !== -1) {
                return { employee: item.employee || '', dcbFunds: item.DCBFunds || '' };
            }
        }
        return { employee: '', dcbFunds: '' };
    };

    const numberToWordsForCheck = (value, currencyText) => {
        const fraction = Math.round((value % 1) * 100);
        const words = numToWords(value);
        if (fraction > 0) {
            return `${words} ${currencyText} and ${fraction}/100 only`;
        }
        return `${words} ${currencyText} only`;
    };

    const numToWords = (s) => {
        const th = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
        const dg = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tn = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tw = ['Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        s = s.toString().replace(/[\, ]/g, '');
        if (s != parseFloat(s)) return 'not a number';
        let x = s.indexOf('.');
        if (x === -1) x = s.length;
        if (x > 15) return 'too big';
        const n = s.split('');
        let str = '';
        let sk = 0;
        for (let i = 0; i < x; i++) {
            if ((x - i) % 3 === 2) {
                if (n[i] === '1') {
                    str += tn[Number(n[i + 1])] + ' ';
                    i++;
                    sk = 1;
                } else if (n[i] != 0) {
                    str += tw[n[i] - 2] + ' ';
                    sk = 1;
                }
            } else if (n[i] != 0) {
                str += dg[n[i]] + ' ';
                if ((x - i) % 3 === 0) str += 'Hundred ';
                sk = 1;
            }
            if ((x - i) % 3 === 1) {
                if (sk) str += th[(x - i - 1) / 3] + ' ';
                sk = 0;
            }
        }
        return str.replace(/\s+/g, ' ').trim();
    };

    const buildPdfXml = (headerData, companyData, accountArray, glData, totals, printDate) => {
        const checkAmountWords = numberToWordsForCheck(glData.checkAmountInWords, headerData.currencyText);

        let glRowsHtml = '';
        glData.glLines.forEach(line => {
            if (line.creditAmount === 0 && line.debitAmount === 0) return;

            const accountName = line.accountName || '';
            const index = accountName.indexOf(' ');
            const accountCode = index > -1 ? accountName.substring(0, index) : '';
            const matchedData = findMatchingLineData(accountArray, line.accId);
            const trustFunds = line.trustFund || matchedData.dcbFunds || '';
            const employeeName = matchedData.employee ? matchedData.employee.substring(matchedData.employee.indexOf(' ')) : '';

            glRowsHtml += `<tr>
<td align="right" border-right="1px" border-bottom="1px">${xml.escape(accountCode)}</td>
<td align="left" border-right="1px" border-bottom="1px"><p style="white-space: pre-wrap;word-break: break-word">${xml.escape(accountName)}</p></td>
<td align="left" border-right="1px" border-bottom="1px"><p style="white-space: pre-wrap;word-break: break-word">${xml.escape(line.department)}</p></td>
<td align="left" border-right="1px" border-bottom="1px"><p style="white-space: pre-wrap;word-break: break-word">${xml.escape(trustFunds)}</p></td>
<td align="center" border-right="1px" border-bottom="1px" style="white-space: pre-wrap;word-break: break-word">${xml.escape(employeeName)}</td>
<td align="right" border-right="1px" border-bottom="1px">${xml.escape(numberWithCommas(line.debitAmount.toFixed(2)))}</td>
<td align="right" border-bottom="1px">${xml.escape(numberWithCommas(line.creditAmount.toFixed(2)))}</td>
</tr>`;
        });

        return `<?xml version="1.0"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf>
<head>
<macrolist>
<macro id="nlheader">
<table width="100%"><tr>
<td align="left" width="50%"><img src="${xml.escape(companyData.logo)}" style="float: left; margin: 0px;height:100px;width:240px" /></td>
<td align="right" style="width: 50%;"><span style="font-size:26px;font-family: Helvetica">Check Voucher</span></td>
</tr></table>
</macro>
<macro id="nlfooter">
<table border="1" cellpadding="1" cellspacing="0" width="100%"><tr>
<td border-bottom="1px" border-right="1px" style="width: 196px;padding-left:20px;">Prepared by:<p style="font-size:12px"><span style="width:30px">LRV/ JJJM</span><span style="padding-left:10px;font-size:14px">_______________</span></p><p style="font-size:12px;padding-top:-7px">AOC<span style="padding-left:41px;font-size:14px">_______________</span></p></td>
<td border-bottom="1px" border-right="1px" style="width: 182px;padding-left:20px;">Checked by:<p style="font-size:12px;"><span style="width:30px">AGM </span><span style="padding-left:18px;font-size:14px">________________</span></p><p style="font-size:12px;padding-top:-7px">MJA<span style="padding-left:24px;font-size:14px;">________________</span></p></td>
<td colspan="2" style="width: 309px;font-size:14px;"><br/><br/><br/>&nbsp;&nbsp; &nbsp;&nbsp;&nbsp; &nbsp;Received by:</td>
</tr>
<tr>
<td border-right="1px" colspan="2" style="width: 397px;padding-left:20px;">Approved by:<p style="padding-left:20px">Fr. Arthur Z. Villanueva, SVD</p></td>
<td align="center" border-right="1px" style="width: 194px;font-size:9px"><br /><br /><br />______________________________<br />SIGNATURE OVER PRINTED NAME</td>
<td border-top="1px" style="width: 120px;">&nbsp;Date Printed: <br />&nbsp;${printDate}</td>
</tr></table>
<table class="footer" style="width: 100%;" margin-top="3px"><tr>
<td align="center"><b><pagenumber/> of <totalpages/></b></td>
</tr></table>
</macro>
</macrolist>
<style type="text/css">
th {font-weight: bold;font-size: 10px;vertical-align: middle;padding: 5px 6px 3px;background-color: #e3e3e3;color: #333333;}
</style>
</head>
<body header="nlheader" header-height="12%" footer="nlfooter" footer-height="16%" padding="1.2cm 1.2cm 1.2cm 1.2cm" width="8.5in" height="11in" style="font-family: Arial, Helvetica, sans-serif;font-size:11px">
<table border="1" cellpadding="1" cellspacing="1" style="width: 100%;table-layout:fixed;font-size:11px">
<tr>
<td style="width: 18%;"><b>Payee:</b></td>
<td style="width: 58%;">${xml.escape(headerData.entity)}</td>
<td style="width: 10%;" padding-right="5px"><b>Date:</b></td>
<td style="width: 15%;">${xml.escape(headerData.date)}</td>
</tr>
<tr>
<td><b>Location:</b></td>
<td>${xml.escape(headerData.location)}</td>
<td padding-right="5px"><b>CV #:</b></td>
<td>${xml.escape(headerData.transactionNumber)}</td>
</tr>
<tr>
<td><b>Check Amount:</b></td>
<td>${xml.escape(checkAmountWords)}</td>
<td><b>Check #:</b></td>
<td>${xml.escape(headerData.checkNo)}</td>
</tr>
</table>
<table margin-top="10px" margin-bottom="30px" border="1" cellpadding="1" cellspacing="1" width="100%" style="page-break-inside: avoid; page-break-before:auto;"><tr>
<td align="left" width="100%"><span style="font-size:11px;"><strong>Memo : </strong></span><span style="font-size:11px;padding-left:10px">${xml.escape(headerData.memo)}</span></td>
</tr></table>
<table margin-top="20px" border-top="1" border-left="1" border-right="1" cellpadding="1" cellspacing="0" width="100%" style="page-break-inside: auto; page-break-before:auto;table-layout:fixed;font-size:9.5px;"><tr>
<th align="center" border-right="1px" border-bottom="1px" width="7%">Account<p style="padding-top:-10px">Code</p></th>
<th align="center" border-right="1px" border-bottom="1px" width="20%">Account Title</th>
<th align="center" border-right="1px" border-bottom="1px" width="20%">Department</th>
<th align="center" border-right="1px" border-bottom="1px" width="15%">Trust Fund/<p style="padding-top:-10px">DCB Fund</p></th>
<th align="center" border-right="1px" border-bottom="1px" width="11%">Employee</th>
<th align="center" border-right="1px" border-bottom="1px" width="10%">Debit</th>
<th align="center" border-bottom="1px" width="10%">Credit</th>
</tr>
${glRowsHtml}
</table>
<table margin-top="5px" width="100%" style="page-break-inside: avoid; page-break-before:auto;font-size:10px">
<tr border-top="0px" border-bottom="1px">
<td colspan="6" align="left" border-bottom="1px" width="80%" style="font-size:12px"><b>Overall Total</b></td>
<td align="right" border-bottom="1px" width="10%"><b>${xml.escape(String(headerData.currency || 'PHP'))}<br />${xml.escape(numberWithCommas(totals.debTotal.toFixed(2)))}</b></td>
<td align="right" border-bottom="1px" width="10%"><b>${xml.escape(String(headerData.currency || 'PHP'))}<br />${xml.escape(numberWithCommas(totals.credTotal.toFixed(2)))}</b></td>
</tr></table>
</body>
</pdf>`;
    };

    return { onRequest };
});
