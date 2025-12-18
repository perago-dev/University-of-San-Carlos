/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/***************************************************************************************  
 ** Copyright (c) 1998-2020 Softype, Inc.
 ** Ventus Infotech Private Limited, 3012, NIBR Corporate Park 1 Aerocity,Andheri - Kurla Rd, Safed Pul , Saki Naka,, Mumbai INDIA 400 072.
 ** All Rights Reserved.
 ** This software is the confidential and proprietary information of Softype, Inc. ("Confidential Information").
 **You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement you entered into with Softype.                    
 **                      
 **@Author      :  Akash Chavan
 **@Dated       :  19th Jan, 2023
 **@Version     :  2.1
 **@Description :  Suitelet for Inventory Transfer Print.
 ***************************************************************************************/

define(['N/record', 'N/xml', 'N/render', 'N/runtime', 'N/search', 'N/config', 'N/file'],
    function (record, xml, render, runtime, search, config, file) {
        function onRequest(context) {

            if (context.request.method == 'GET') {

                var recordid = context.request.parameters.recordId;
                var recordName = context.request.parameters.recordName;
                if (recordName == "inventoryadjustment") {
                    var loadrec = record.load({
                        type: 'inventoryadjustment',
                        id: recordid,
                        isDynamic: true
                    });
                }

                if (recordName == "deposit") {
                    var loadrec = record.load({
                        type: 'deposit',
                        id: recordid,
                        isDynamic: true
                    });
                }
                var trandate = loadrec.getText({ fieldId: 'trandate' });

                var memo = loadrec.getValue({ fieldId: 'memo' });
                var tranid = loadrec.getValue({ fieldId: 'tranid' });
                //added by sai on 18-12-2025 for inventory adjustment print
                if (recordName == "inventoryadjustment") {
                    var department = loadrec.getText({ fieldId: 'department' }) || '';
                    var trustFund = loadrec.getText({ fieldId: 'class' }) || '';
                    var dcbFund = loadrec.getText({ fieldId: 'cseg_usc_dcb_fund' }) || '';
                }

                var companyInfo = config.load({
                    type: config.Type.COMPANY_INFORMATION
                });

                var companyName = companyInfo.getValue({ fieldId: 'companyname' });
                var companyFileID = companyInfo.getValue({ fieldId: 'pagelogo' });
                var addrtext = companyInfo.getValue({ fieldId: 'mainaddress_text' });

                var fileObj = file.load({
                    id: companyFileID
                });

                var setby = runtime.getCurrentUser().id;

                var companyLogo = fileObj.url;

                var UTCDate = new Date(new Date().toUTCString());
                var PHPTime = new Date(UTCDate.setHours(UTCDate.getHours() + 16)); // Manila Time (NetSuite returns PST, PST+16=Manila)
                var currentTime = PHPTime;

                var todaysDate = new Date();
                var monthNames = ["Jan", "Feb", "March", "April", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                var day = todaysDate.getDate();
                log.debug('date', todaysDate);
                log.debug('day', day);


                var month = todaysDate.getMonth();


                var year = todaysDate.getFullYear();

                var hours = currentTime.getHours().toString();
                var minutes = currentTime.getMinutes().toString();
                var str = hours + ":" + minutes;
                var ampmformat = formatAMPM(PHPTime);
                log.audit('ampm format 1929=>', ampmformat);

                var fullDate = monthNames[month] + ' ' + day + ', ' + year + ' ' + ampmformat
                log.debug('print date', fullDate);

                // Get GL Impact lines from transaction search
                var GL_search = search.create({
                    type: 'transaction',
                    columns: [
                        "account",
                        "creditamount",
                        "debitamount",
                        "name",
                        "line"
                    ],
                    filters: [
                        search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.ANYOF,
                            values: recordid
                        })
                    ]
                }).run().getRange(0, 1000);

                log.debug('Record ID', recordid);
                log.debug("GL_search", GL_search);

                // Get line item details from the record
                var lineItemsData = [];
                var sublistId = recordName == "inventoryadjustment" ? 'inventory' : 'line';
                var lineCount = loadrec.getLineCount({ sublistId: sublistId });

                for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
                    var itemId = loadrec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'item',
                        line: lineIndex
                    });

                    var description = '';
                    var quantity = 0;
                    var estUnitCost = 0;
                    var adjustQty = 0;
                    var totalAmount = 0;
                    var lineDepartment = '';

                    if (itemId) {
                        // Get item description
                        description = loadrec.getSublistText({
                            sublistId: sublistId,
                            fieldId: 'description',
                            line: lineIndex
                        }) || '';

                        // Get quantity and estimated unit cost
                        if (recordName == "inventoryadjustment") {
                            quantity = loadrec.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'quantityonhand',
                                line: lineIndex
                            }) || 0;

                            adjustQty = loadrec.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'adjustqtyby',
                                line: lineIndex
                            }) || 0;

                            estUnitCost = loadrec.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'unitcost',
                                line: lineIndex
                            }) || 0;

                            lineDepartment = loadrec.getSublistText({
                                sublistId: sublistId,
                                fieldId: 'department',
                                line: lineIndex
                            }) || '';

                            var splitStr = lineDepartment.split(':');
                            if (splitStr.length > 1) {
                                lineDepartment = splitStr[splitStr.length - 1]
                            }

                            // Calculate total amount (adjustment quantity * unit cost)
                            totalAmount = Math.abs(parseFloat(adjustQty) * parseFloat(estUnitCost));
                        } else {
                            quantity = loadrec.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'quantity',
                                line: lineIndex
                            }) || 0;

                            lineDepartment = loadrec.getSublistText({
                                sublistId: sublistId,
                                fieldId: 'department',
                                line: lineIndex
                            }) || '';

                            estUnitCost = loadrec.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'rate',
                                line: lineIndex
                            }) || loadrec.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'amount',
                                line: lineIndex
                            }) || 0;

                            totalAmount = Math.abs(parseFloat(estUnitCost));
                        }

                        lineItemsData.push({
                            lineIndex: lineIndex,
                            itemId: itemId,
                            description: description,
                            quantity: quantity,
                            adjustQty: adjustQty,
                            estUnitCost: estUnitCost,
                            totalAmount: totalAmount,
                            lineDepartment: lineDepartment
                        });
                    }
                }

                log.debug("lineItemsData", lineItemsData);

                // Match GL impact lines with line items based on amount
                var matchedData = [];

                for (var i = 0; i < GL_search.length; i++) {
                    var glLine = GL_search[i];
                    var accountname = glLine.getText("account");
                    var creditamount = parseFloat(glLine.getValue("creditamount") || 0);
                    var debitamount = parseFloat(glLine.getValue("debitamount") || 0);
                    var glAmount = creditamount > 0 ? creditamount : debitamount;
                    var gl_name = glLine.getText("name");

                    // Try to match with line items based on amount
                    var matchedItem = null;
                    var tolerance = 0.01; // Allow small rounding differences

                    for (var j = 0; j < lineItemsData.length; j++) {
                        var lineItem = lineItemsData[j];
                        if (Math.abs(lineItem.totalAmount - glAmount) <= tolerance) {
                            matchedItem = lineItem;
                            break;
                        }
                    }

                    // Parse account name for better display
                    var index = accountname.indexOf(' ');
                    var account = '';
                    var accountNext = '';

                    if (index > -1) {
                        for (var x = 0; x < index; x++) {
                            account += accountname.charAt(x);
                        }
                        for (var y = index; y < accountname.length; y++) {
                            accountNext += accountname.charAt(y);
                        }
                    } else {
                        accountNext = accountname;
                    }

                    log.debug('account next', accountNext);

                    // Handle child accounts
                    var account_child_name;
                    var account_has_child = false;
                    try {
                        if (accountNext.indexOf(':') > -1) {
                            account_has_child = true;
                            account_child_name = accountNext.split(":");
                            log.debug("namelength", account_child_name.length);
                        }
                    } catch (e) {
                        account_has_child = false;
                        account_child_name = accountNext;
                    }

                    matchedData.push({
                        accountname: accountname,
                        creditamount: creditamount,
                        debitamount: debitamount,
                        gl_name: gl_name,
                        description: matchedItem ? matchedItem.description : '',
                        quantity: matchedItem ? (recordName == "inventoryadjustment" ? matchedItem.adjustQty : '') : '',
                        estUnitCost: matchedItem ? matchedItem.estUnitCost : '',
                        lineDepartment: matchedItem ? matchedItem.lineDepartment : '',

                        lineIndex: matchedItem ? matchedItem.lineIndex : -1,
                    });
                }

                var credTotal = 0;
                var debTotal = 0;

                log.debug("matchedData", matchedData);


                var system_obj = search.create({
                    type: 'inventoryadjustment',
                    filters:
                        [
                            ["internalid", "anyof", recordid]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "name",
                                join: "systemNotes"
                            }),
                            search.createColumn({
                                name: "type",
                                join: "systemNotes"
                            })
                        ]
                });
                var preparedBy;
                var preparedById;
                system_obj.run().each(function (result) {
                    var type = result.getValue({ name: 'type', join: 'systemNotes' });
                    // log.debug("type", type);

                    if (type == "Create") {
                        var data = result.getText({ name: 'name', join: 'systemNotes' });
                        preparedBy = data;
                        preparedById = result.getValue({ name: 'name', join: 'systemNotes' })
                    }
                    return true;
                });

                var currentUserId = runtime.getCurrentUser().id;
                log.debug('currentUserId', currentUserId);
                if (preparedById) {
                    var empRec = search.lookupFields({
                        type: 'employee',
                        id: preparedById,
                        columns: ['supervisor']
                    });
                    var checkedBy;
                    var empRecResult = empRec.supervisor;
                    if (empRecResult.length > 0) {
                        checkedBy = empRec.supervisor[0].text;
                    }
                }

                log.debug('checkedBy', checkedBy);
                if (checkedBy == '' || checkedBy == null || checkedBy == undefined) {
                    checkedBy = ''
                } else {
                    checkedBy = xml.escape(checkedBy).replace(/^[0-9\s]+/, '').trim();

                }

                if (preparedBy == '' || preparedBy == null || preparedBy == undefined) {
                    preparedBy = ''
                } else {
                    preparedBy = xml.escape(preparedBy).replace(/^[0-9\s]+/, '').trim();
                }
                var html = "";
                html += '<?xml version="1.0" ?>'
                html += '<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">'
                html += '<pdf>'
                html += '<head>'
                html += '<macrolist>'
                html += '<macro id="nlheader">'
                html += '<table border="0" class="header" margin-bottom="0px" style="width: 100%;">'
                html += '<tr>'
                html += '<td>'
                html += '<table style="width: 100%;">'
                html += '<tr><td rowpspan="3"><img src="' + xml.escape(companyLogo) + '" style="float:left; width:310px; height:120px;" /></td></tr>'
                html += '</table>'
                html += '</td>'
                html += '<td align="right">'
                html += '<table style="width: 100%; padding:5px;">'
                html += '<tr>'
                html += '<td align="right"><span class="title">Inventory Adjustment</span></td>'
                html += '</tr>'
                html += '<tr rowspan="2" style="width: 100%;">'
                html += '<td>'
                html += '<table border="0.5" style="width: 100%;"><tr><td><span style="font-size:12px;" ><strong>Reference No:</strong></span><span style="font-size:12px;">&nbsp;&nbsp;&nbsp;' + tranid + '</span></td></tr>'
                html += '<tr style="width: 100%;" >'
                html += '<td><span style="font-size:12px;" ><strong>Transaction Date:</strong></span><span style="font-size:12px;">&nbsp;&nbsp;&nbsp;' + trandate + '</span></td></tr></table>'
                html += '</td>'
                html += '</tr>'
                html += '</table>'
                html += '</td>'
                html += '</tr>'
                html += '<tr>'
                html += '<td></td>'
                html += '</tr>'
                html += '</table>'
                html += '</macro>'
                html += '<macro id="footer">'
                html += '<table class="footer" style="width: 100%;">'
                html += '<tr>'
                html += '<td align="center"><b><pagenumber/> of <totalpages/></b>'
                html += '</td>'
                html += '</tr>'
                html += '</table>'
                html += '</macro>'
                html += '</macrolist>'
                html += '<style type="text/css">'
                html += 'span.title {'
                html += 'font-size: 15pt; font-family: Helvetica, Arial, sans-serif;}'
                html += 'span.number {'
                html += 'font-size: 14pt; font-family: Helvetica, Arial, sans-serif;}'
                html += 'table.main td, th {'
                html += 'border-bottom: 1px solid #ddd; font-family: Helvetica, Arial, sans-serif;}'
                html += 'tr.space {'
                html += 'border-bottom: 1px; font-family: Helvetica, Arial, sans-serif;}'
                html += 'th {'
                html += 'font-weight: bold;vertical-align: middle;padding: 5px 6px 3px;background-color: #e3e3e3;color: #333333;border-bottom:1px; font-family: Helvetica, Arial, sans-serif;}'
                html += 'td {padding: 4px 6px; font-family: Helvetica, Arial, sans-serif;}'
                html += 'td p { align:left font-family: Helvetica, Arial, sans-serif;}'
                html += '</style>'
                html += '</head>'

                html += '<body header="nlheader" header-height="12%" footer="footer" footer-height="1%" padding="0.1in 0.5in 0.5in 0.5in" size="Letter">'
                html += '<br />'
                html += '<table style="width: 100%;height:80px;" border="0.5">'
                html += '<tr rowspan="4">'
                html += '<td ><b>Particular:</b>&nbsp;&nbsp;' + memo + '</td>'
                html += '</tr>'
                html += '</table>'
                html += '<table width="100%" border="0.1" style="margin-top:20px;">'
                html += '<tr class="space">'
                html += '<th border="0.1" align="center" style="width:180px;font-size:11px;">Description</th>'
                html += '<th border="0.1" align="center" style="width:150px;font-size:11px;">GL Account</th>'
                html += '<th border="0.1" align="center" style="width:150px;font-size:11px;">Cost Center</th>'
                html += '<th border="0.1" align="center" style="width:60px;font-size:11px;">Qty</th>'
                html += '<th border="0.1" align="center" style="width:100px;font-size:11px;">Debit</th>'
                html += '<th border="0.1" align="center" style="width:100px;font-size:11px;">Credit</th>'
                html += '</tr>'

                // Display matched data
                for (var i = 0; i < matchedData.length; i++) {
                    var data = matchedData[i];

                    html += '<tr>'
                    html += '<td border="0.1" align="left" style="width:180px;font-size:11px;">' + xml.escape(data.description || '') + '</td>'
                    html += '<td border="0.1" align="left" style="width:150px;font-size:11px;">' + xml.escape(data.accountname || '') + '</td>'
                    if (recordName != "inventoryadjustment") {
                        html += '<td border="0.1" align="right" style="width:150px;font-size:11px;">' + xml.escape(data.lineDepartment || '') + '</td>'
                    }
                    else {
                        if (department != '') {
                            html += '<td border="0.1" align="right" style="width:150px;font-size:11px;">' + xml.escape(department) + '</td>'
                        }
                        else if (trustFund != '') {
                            html += '<td border="0.1" align="right" style="width:150px;font-size:11px;">' + xml.escape(trustFund) + '</td>'
                        }
                        else if (dcbFund != '') {
                            html += '<td border="0.1" align="right" style="width:150px;font-size:11px;">' + xml.escape(dcbFund) + '</td>'
                        }
                        else {
                            html += '<td border="0.1" align="right" style="width:150px;font-size:11px;"></td>'
                        }
                    }
                    html += '<td border="0.1" align="center" style="width:60px;font-size:11px;">' + (data.quantity ? numberWithCommas(Math.abs(data.quantity)) : '') + '</td>'
                    html += '<td border="0.1" align="right" style="width:100px;font-size:11px;">' + numberWithCommas((data.debitamount).toFixed(2)) + '</td>'
                    html += '<td border="0.1" align="right" style="width:100px;font-size:11px;">' + numberWithCommas((data.creditamount).toFixed(2)) + '</td>'
                    html += '</tr>'

                    if (data.creditamount != 0) {
                        credTotal = parseFloat(credTotal) + parseFloat(data.creditamount);
                    }
                    if (data.debitamount != 0) {
                        debTotal = parseFloat(debTotal) + parseFloat(data.debitamount);
                    }
                }

                html += '</table>'

                html += '<table margin-top="10px" width="100%">'
                log.debug("Totals calculated");

                html += '<tr>'
                html += '<td align="left" style="width:180px;font-size:11px;"></td>'
                html += '<td align="left" style="width:200px;font-size:11px;"></td>'
                html += '<td align="left" style="width:80px;font-size:11px;"></td>'
                html += '<td align="left" style="background-color:#e3e3e3;width:80px;font-size:13px;"><strong>Total:</strong></td>'
                html += '<td align="right" style="background-color:#e3e3e3;width:100px;font-size:13px;"><strong>' + numberWithCommas(debTotal.toFixed(2)) + '</strong></td>'
                html += '<td align="right" style="background-color:#e3e3e3;width:100px;font-size:13px;"><strong>' + numberWithCommas(credTotal.toFixed(2)) + '</strong></td>'
                html += '</tr>'

                html += '</table>'
                html += '<table style="width: 100%; height: 50px; overflow: hidden; display: table;">'
                html += '<tr> <td>&nbsp;</td> </tr>'
                html += '</table>'

                html += '<table border="0.1" style="width:375px; padding-top: -60;">'
                html += '<tr>'
                html += '<td border-left="0.1" border-right="0.1" border-top="0.1" style="width:156px; font-size:12px">Prepared By:</td>'
                html += '<td border-left="0.1" border-right="0.1" border-top="0.1" style="width:130px; font-size:12px">Checked by:</td>'
                html += '</tr><tr>'
                html += '<td border-left="0.1" border-right="0.1" border-bottom="0.1" style="width:156px; font-size:12px">' + preparedBy + '</td>'
                html += '<td border-left="0.1" border-right="0.1" border-bottom="0.1" style="width:130px; font-size:12px">' + checkedBy + '</td>'
                html += '</tr></table>'

                html += '<table style="width:727px;">'
                html += '<tr>'
                html += '<td  style="width:160px; font-size:12px"></td>'
                html += '<td style="width:170px; font-size:12px"></td>'
                html += '<td style="width:160px; font-size:12px"></td>'
                html += '<td style="width:170px; font-size:10px">Date Printed:&nbsp;&nbsp;<br></br> <span style="padding-left:10px">' + fullDate + ' </span></td>';
                html += '</tr><tr>'
                html += '<td style="width:160px; font-size:12px"></td>'
                html += '<td style="width:155px;"></td>'
                html += '</tr></table>'
                html += '</body>'
                html += '</pdf>'

                var file1 = render.xmlToPdf
                    ({
                        xmlString: html
                    });

                context.response.writeFile(file1, true);
                return;
            }


        }

        function numberWithCommas(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        function formatAMPM(date) {
            log.error('date', date);
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var strTime = hours + ':' + minutes + ' ' + ampm;
            return strTime;
        }

        return {
            onRequest: onRequest
        };
    });