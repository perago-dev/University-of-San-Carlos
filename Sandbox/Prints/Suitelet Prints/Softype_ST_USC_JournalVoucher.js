/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/***************************************************************************************
 ** Copyright (c) 1998-2020 Softype, Inc.
 ** All Rights Reserved.
 **
 ** @Author      : Akash Chavan
 ** @Dated       : 19th Jan, 2023
 ** @Version     : 2.1
 ** @Description : Suitelet for Inventory Adjustment and Deposit Print
 ** @Update      : Refactored to use shared utility modules per CONTRIBUTING.md
 ***************************************************************************************/

define([
    'N/record',
    'N/xml',
    'N/render',
    'N/runtime',
    'N/search',
    'N/config',
    'N/file',
    'N/log',
    '../../Scripts/lib/dateUtils',
    '../../Scripts/lib/formatUtils',
    '../../Scripts/lib/constants'
], (record, xml, render, runtime, search, config, file, log, dateUtils, formatUtils, constants) => {

    const { FIELDS, PRINT_TITLES } = constants;
    const { formatPrintDate, getManilaTime } = dateUtils;
    const { numberWithCommas } = formatUtils;

    const onRequest = (context) => {
        if (context.request.method !== 'GET') return;

        const recordid = context.request.parameters.recordId;
        const recordName = context.request.parameters.recordName;

        // Validate record type
        let loadrec;
        if (recordName === 'inventoryadjustment') {
            loadrec = record.load({ type: 'inventoryadjustment', id: recordid, isDynamic: true });
        } else if (recordName === 'deposit') {
            loadrec = record.load({ type: 'deposit', id: recordid, isDynamic: true });
        } else {
            throw new Error('Unsupported record type: ' + recordName);
        }

        // Extract data
        const headerData = extractHeaderData(loadrec, recordName);
        const companyData = getCompanyData();
        const lineItemsData = getLineItemsData(loadrec, recordName);
        const glData = getGLData(recordid, lineItemsData, recordName);
        const signatureData = getSignatureData(recordid, recordName);
        const printDate = formatPrintDate(getManilaTime());
        const printTitle = PRINT_TITLES[recordName] || 'Transaction';

        // Build and output PDF
        const pdfXml = buildPdfXml(headerData, companyData, glData, signatureData, printDate, printTitle, recordName);
        const pdfFile = render.xmlToPdf({ xmlString: pdfXml });
        context.response.writeFile(pdfFile, true);
    };

    const extractHeaderData = (loadrec, recordName) => {
        const data = {
            trandate: loadrec.getText({ fieldId: FIELDS.TRAN_DATE }) || '',
            memo: loadrec.getValue({ fieldId: FIELDS.MEMO }) || '',
            tranid: loadrec.getValue({ fieldId: FIELDS.TRAN_ID }) || ''
        };

        if (recordName === 'inventoryadjustment') {
            data.department = loadrec.getText({ fieldId: FIELDS.DEPARTMENT }) || '';
            data.trustFund = loadrec.getText({ fieldId: FIELDS.CLASS }) || '';
            data.dcbFund = loadrec.getText({ fieldId: FIELDS.DCB_FUND }) || '';
        }

        return data;
    };

    const getCompanyData = () => {
        const companyInfo = config.load({ type: config.Type.COMPANY_INFORMATION });
        const companyFileID = companyInfo.getValue({ fieldId: 'pagelogo' });
        const fileObj = file.load({ id: companyFileID });
        return {
            name: companyInfo.getValue({ fieldId: 'companyname' }),
            logo: fileObj.url
        };
    };

    const getLineItemsData = (loadrec, recordName) => {
        const lineItemsData = [];
        const sublistId = recordName === 'inventoryadjustment' ? 'inventory' : 'line';
        const lineCount = loadrec.getLineCount({ sublistId });

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const itemId = loadrec.getSublistValue({ sublistId, fieldId: 'item', line: lineIndex });
            if (!itemId) continue;

            const description = loadrec.getSublistText({ sublistId, fieldId: 'description', line: lineIndex }) || '';
            let quantity = 0, adjustQty = 0, estUnitCost = 0, totalAmount = 0, lineDepartment = '';

            if (recordName === 'inventoryadjustment') {
                quantity = loadrec.getSublistValue({ sublistId, fieldId: 'quantityonhand', line: lineIndex }) || 0;
                adjustQty = loadrec.getSublistValue({ sublistId, fieldId: 'adjustqtyby', line: lineIndex }) || 0;
                estUnitCost = loadrec.getSublistValue({ sublistId, fieldId: 'unitcost', line: lineIndex }) || 0;
                lineDepartment = loadrec.getSublistText({ sublistId, fieldId: 'department', line: lineIndex }) || '';

                const splitStr = lineDepartment.split(':');
                if (splitStr.length > 1) lineDepartment = splitStr[splitStr.length - 1];

                totalAmount = Math.abs(parseFloat(adjustQty) * parseFloat(estUnitCost));
            } else {
                quantity = loadrec.getSublistValue({ sublistId, fieldId: 'quantity', line: lineIndex }) || 0;
                lineDepartment = loadrec.getSublistText({ sublistId, fieldId: 'department', line: lineIndex }) || '';
                estUnitCost = loadrec.getSublistValue({ sublistId, fieldId: 'rate', line: lineIndex }) ||
                    loadrec.getSublistValue({ sublistId, fieldId: 'amount', line: lineIndex }) || 0;
                totalAmount = Math.abs(parseFloat(estUnitCost));
            }

            lineItemsData.push({
                lineIndex, itemId, description, quantity, adjustQty, estUnitCost, totalAmount, lineDepartment
            });
        }

        return lineItemsData;
    };

    const getGLData = (recordid, lineItemsData, recordName) => {
        const glSearch = search.create({
            type: 'transaction',
            columns: ['account', 'creditamount', 'debitamount', 'name', 'line'],
            filters: [search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: recordid })]
        }).run().getRange(0, 1000);

        const matchedData = glSearch.map(glLine => {
            const accountname = glLine.getText('account') || '';
            const creditamount = parseFloat(glLine.getValue('creditamount') || 0);
            const debitamount = parseFloat(glLine.getValue('debitamount') || 0);
            const glAmount = creditamount > 0 ? creditamount : debitamount;

            // Match by amount tolerance
            let matchedItem = null;
            const tolerance = 0.01;
            for (const lineItem of lineItemsData) {
                if (Math.abs(lineItem.totalAmount - glAmount) <= tolerance) {
                    matchedItem = lineItem;
                    break;
                }
            }

            return {
                accountname,
                creditamount,
                debitamount,
                description: matchedItem ? matchedItem.description : '',
                quantity: matchedItem && recordName === 'inventoryadjustment' ? matchedItem.adjustQty : '',
                lineDepartment: matchedItem ? matchedItem.lineDepartment : ''
            };
        });

        let credTotal = 0, debTotal = 0;
        matchedData.forEach(line => {
            credTotal += line.creditamount;
            debTotal += line.debitamount;
        });

        return { matchedData, credTotal, debTotal };
    };

    const getSignatureData = (recordid, recordName) => {
        let preparedBy = '', checkedBy = '';

        try {
            const systemSearch = search.create({
                type: recordName,
                filters: [['internalid', 'anyof', recordid]],
                columns: [
                    search.createColumn({ name: 'name', join: 'systemNotes' }),
                    search.createColumn({ name: 'type', join: 'systemNotes' })
                ]
            });

            let preparedById = null;
            systemSearch.run().each(result => {
                const type = result.getValue({ name: 'type', join: 'systemNotes' });
                if (type === 'Create') {
                    preparedBy = result.getText({ name: 'name', join: 'systemNotes' }) || '';
                    preparedById = result.getValue({ name: 'name', join: 'systemNotes' });
                }
                return true;
            });

            if (preparedById) {
                const empRec = search.lookupFields({
                    type: 'employee',
                    id: preparedById,
                    columns: ['supervisor']
                });
                if (empRec.supervisor && empRec.supervisor.length > 0) {
                    checkedBy = empRec.supervisor[0].text || '';
                }
            }
        } catch (e) {
            log.error('getSignatureData Error', e);
        }

        // Clean up names (remove leading numbers)
        preparedBy = preparedBy.replace(/^[0-9\s]+/, '').trim();
        checkedBy = checkedBy.replace(/^[0-9\s]+/, '').trim();

        return { preparedBy, checkedBy };
    };

    const buildPdfXml = (headerData, companyData, glData, signatureData, printDate, printTitle, recordName) => {
        let glRowsHtml = '';
        glData.matchedData.forEach(data => {
            let costCenter = '';
            if (recordName === 'inventoryadjustment') {
                costCenter = headerData.department || headerData.trustFund || headerData.dcbFund || '';
            } else {
                costCenter = data.lineDepartment || '';
            }

            glRowsHtml += `<tr>
<td border="0.1" align="left" style="width:180px;font-size:11px;">${xml.escape(data.description || '')}</td>
<td border="0.1" align="left" style="width:150px;font-size:11px;">${xml.escape(data.accountname || '')}</td>
<td border="0.1" align="right" style="width:150px;font-size:11px;">${xml.escape(costCenter)}</td>
<td border="0.1" align="center" style="width:60px;font-size:11px;">${data.quantity ? numberWithCommas(Math.abs(data.quantity)) : ''}</td>
<td border="0.1" align="right" style="width:100px;font-size:11px;">${numberWithCommas(data.debitamount.toFixed(2))}</td>
<td border="0.1" align="right" style="width:100px;font-size:11px;">${numberWithCommas(data.creditamount.toFixed(2))}</td>
</tr>`;
        });

        return `<?xml version="1.0" ?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf>
<head>
<macrolist>
<macro id="nlheader">
<table border="0" class="header" margin-bottom="0px" style="width: 100%;">
<tr>
<td>
<table style="width: 100%;">
<tr><td rowspan="3"><img src="${xml.escape(companyData.logo)}" style="float:left; width:310px; height:120px;" /></td></tr>
</table>
</td>
<td align="right">
<table style="width: 100%; padding:5px;">
<tr>
<td align="right"><span class="title">${printTitle}</span></td>
</tr>
<tr rowspan="2" style="width: 100%;">
<td>
<table border="0.5" style="width: 100%;"><tr><td><span style="font-size:12px;"><strong>Reference No:</strong></span><span style="font-size:12px;">&nbsp;&nbsp;&nbsp;${xml.escape(headerData.tranid)}</span></td></tr>
<tr style="width: 100%;">
<td><span style="font-size:12px;"><strong>Transaction Date:</strong></span><span style="font-size:12px;">&nbsp;&nbsp;&nbsp;${xml.escape(headerData.trandate)}</span></td></tr></table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</macro>
<macro id="footer">
<table class="footer" style="width: 100%;">
<tr>
<td align="center"><b><pagenumber/> of <totalpages/></b></td>
</tr>
</table>
</macro>
</macrolist>
<style type="text/css">
span.title { font-size: 15pt; font-family: Helvetica, Arial, sans-serif; }
th { font-weight: bold; vertical-align: middle; padding: 5px 6px 3px; background-color: #e3e3e3; color: #333333; border-bottom: 1px; font-family: Helvetica, Arial, sans-serif; }
td { padding: 4px 6px; font-family: Helvetica, Arial, sans-serif; }
</style>
</head>
<body header="nlheader" header-height="12%" footer="footer" footer-height="1%" padding="0.1in 0.5in 0.5in 0.5in" size="Letter">
<br />
<table style="width: 100%;height:80px;" border="0.5">
<tr rowspan="4">
<td><b>Particular:</b>&nbsp;&nbsp;${xml.escape(headerData.memo || '')}</td>
</tr>
</table>
<table width="100%" border="0.1" style="margin-top:20px;">
<tr class="space">
<th border="0.1" align="center" style="width:180px;font-size:11px;">Description</th>
<th border="0.1" align="center" style="width:150px;font-size:11px;">GL Account</th>
<th border="0.1" align="center" style="width:150px;font-size:11px;">Cost Center</th>
<th border="0.1" align="center" style="width:60px;font-size:11px;">Qty</th>
<th border="0.1" align="center" style="width:100px;font-size:11px;">Debit</th>
<th border="0.1" align="center" style="width:100px;font-size:11px;">Credit</th>
</tr>
${glRowsHtml}
</table>
<table margin-top="10px" width="100%">
<tr>
<td align="left" style="width:180px;font-size:11px;"></td>
<td align="left" style="width:200px;font-size:11px;"></td>
<td align="left" style="width:80px;font-size:11px;"></td>
<td align="left" style="background-color:#e3e3e3;width:80px;font-size:13px;"><strong>Total:</strong></td>
<td align="right" style="background-color:#e3e3e3;width:100px;font-size:13px;"><strong>${numberWithCommas(glData.debTotal.toFixed(2))}</strong></td>
<td align="right" style="background-color:#e3e3e3;width:100px;font-size:13px;"><strong>${numberWithCommas(glData.credTotal.toFixed(2))}</strong></td>
</tr>
</table>
<table style="width: 100%; height: 50px; overflow: hidden; display: table;">
<tr><td>&nbsp;</td></tr>
</table>
<table border="0.1" style="width:375px; padding-top: -60;">
<tr>
<td border-left="0.1" border-right="0.1" border-top="0.1" style="width:156px; font-size:12px">Prepared By:</td>
<td border-left="0.1" border-right="0.1" border-top="0.1" style="width:130px; font-size:12px">Checked by:</td>
</tr><tr>
<td border-left="0.1" border-right="0.1" border-bottom="0.1" style="width:156px; font-size:12px">${xml.escape(signatureData.preparedBy)}</td>
<td border-left="0.1" border-right="0.1" border-bottom="0.1" style="width:130px; font-size:12px">${xml.escape(signatureData.checkedBy)}</td>
</tr></table>
<table style="width:727px;">
<tr>
<td style="width:160px; font-size:12px"></td>
<td style="width:170px; font-size:12px"></td>
<td style="width:160px; font-size:12px"></td>
<td style="width:170px; font-size:10px">Date Printed:&nbsp;&nbsp;<br></br><span style="padding-left:10px">${printDate}</span></td>
</tr></table>
</body>
</pdf>`;
    };

    return { onRequest };
});
