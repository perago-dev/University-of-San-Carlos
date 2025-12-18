/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/***************************************************************************************
** Copyright (c) 1998-2020 Softype, Inc.
** Ventus Infotech Private Limited, Raheja Plaza One, Suite A201, LBS Marg, Ghatkopar West, Near R City Mall, Mumbai INDIA 400086.
** All Rights Reserved.
**
** This software is the confidential and proprietary information of Softype, Inc. ("Confidential Information").
** You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement you entered into with Softype.                    
**                      
 ** @Author      : Saroja Iyer
 ** @Dated       :  26 Nov 2019
 ** @Version     :  2.0
 ** @Description :  Suitelet to print the data from check record after the userevent redirects here.
 ** @Update      :  changes by Nazir - check amount in words & currency symbol 
 ** @Update      :  Convert PHP GL amounts to USD using exchange rate from check record

 ***************************************************************************************/

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
define(['N/record', 'N/xml', 'N/render', 'N/http', 'N/search', 'N/config', 'N/file'],
    function (record, xml, render, http, search, config, file) {
        function onRequest(context) {

            if (context.request.method == 'GET') {
                try {


                    // Getting the parameters from Userevent.
                    var action = context.request.parameters.action;
                    var recordid = context.request.parameters.recordid;
                    var loadrec = record.load({
                        type: 'check',
                        id: recordid,
                        isDynamic: true
                    });
                    var transactionnumber = loadrec.getValue({
                        fieldId: 'transactionnumber'
                    });
                    var entity = loadrec.getText({
                        fieldId: 'entity'
                    });
                    var date = loadrec.getText({
                        fieldId: 'trandate'
                    });
                    var preparedby = loadrec.getText({
                        fieldId: 'custbody_preparedby'
                    });
                    var checkedby = loadrec.getText({
                        fieldId: 'custbody_verifiedby'
                    });
                    var approvedby = loadrec.getText({
                        fieldId: 'custbody_approvedby'
                    });
                    var amount = loadrec.getValue({
                        fieldId: 'usertotal'
                    });
                    var memo = loadrec.getValue({
                        fieldId: 'memo'
                    });
                    var checkno = loadrec.getValue({
                        fieldId: 'tranid'
                    });
                    var amtinwords = loadrec.getValue({
                        fieldId: 'usertotal'
                    });
                    log.debug('amtinwords', amtinwords);

                    var currency = loadrec.getText({
                        fieldId: 'currency'
                    });

                    // RETRIEVE EXCHANGE RATE FROM CHECK RECORD
                    var exchangeRate = loadrec.getValue({
                        fieldId: 'exchangerate'
                    });
                    log.debug('Exchange Rate', exchangeRate);

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
                    var location = loadrec.getText({
                        fieldId: 'location'
                    });

                    var companyInfo = config.load({
                        type: config.Type.COMPANY_INFORMATION
                    });

                    var companyName = companyInfo.getValue({
                        fieldId: 'companyname'
                    });
                    var companyFileID = companyInfo.getValue({
                        fieldId: 'pagelogo'
                    });
                    var companyCurrency = companyInfo.getValue({
                        fieldId: 'basecurrency'
                    });
                    var currencyName;
                    if (companyCurrency != '' && companyCurrency != null && companyCurrency != undefined) {
                        log.debug('companyCurrency', companyCurrency);

                        var currencySearchObj = search.create({
                            type: "currency",
                            filters: [
                                ["internalid", "anyof", companyCurrency]
                            ],
                            columns: [
                                search.createColumn({
                                    name: "name",
                                    sort: search.Sort.ASC,
                                    label: "Name"
                                }),
                                search.createColumn({
                                    name: "symbol",
                                    label: "Symbol"
                                })
                            ]
                        });
                        var searchResultCount = currencySearchObj.run().getRange(0, 1);
                        if (searchResultCount.length > 0) {
                            currencyName = searchResultCount[0].getValue({
                                name: 'name'
                            });
                            log.debug('currencyName', currencyName);
                        }
                    }

                    var fileObj = file.load({
                        id: companyFileID
                    });

                    var companyLogo = fileObj.url;

                    var accountArray = new Array();

                    var expenseCount = loadrec.getLineCount({
                        sublistId: 'expense'
                    });

                    var itemCount = loadrec.getLineCount({
                        sublistId: 'item'
                    });

                    for (var i = 0; i < itemCount; i++) {

                        var itemId = loadrec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });

                        var itemType = loadrec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemtype',
                            line: i
                        });
                        log.debug('itemType', itemType)

                        var recordTypeForLoad = '';
                        var fields = [];
                        if (itemType == 'InvtPart') {
                            recordTypeForLoad = 'inventoryitem';
                            fields = ['cogsaccount', 'assetaccount']

                        } else if (itemType == 'NonInvtPart') {
                            recordTypeForLoad = 'noninventoryitem';
                            fields = 'expenseaccount'

                        } else if (itemType == 'Service') {
                            recordTypeForLoad = 'serviceitem'
                            fields = 'incomeaccount'

                        } else if (itemType == 'Discount') {
                            recordTypeForLoad = 'discountitem'
                            fields = 'account'
                        } else {
                            recordTypeForLoad = 'otherchargeitem'
                            fields = 'expenseaccount'
                        }
                        log.audit('checkk recordTypeForLoad', recordTypeForLoad);
                        log.audit('checkk fields', fields);

                        var recItem = record.load({
                            type: recordTypeForLoad,
                            id: itemId
                        });


                        var accountIds = [];
                        if (itemType == 'InvtPart') {
                            accountIds[0] = recItem.getValue('cogsaccount');
                            accountIds[1] = recItem.getValue('assetaccount');
                        } else {
                            accountIds[0] = recItem.getValue(fields);
                        }
                        log.audit('checkk accountIds', accountIds);

                        var department = loadrec.getSublistText({
                            sublistId: 'item',
                            fieldId: 'department',
                            line: i
                        });

                        var trustFunds = loadrec.getSublistText({
                            sublistId: 'item',
                            fieldId: 'class',
                            line: i
                        });

                        var employee = loadrec.getSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_usc_employeeadvances',
                            line: i
                        });

                        var DCBFunds = loadrec.getSublistText({
                            sublistId: 'item',
                            fieldId: 'cseg_usc_dcb_fund',
                            line: i
                        });

                        var vehicle = loadrec.getSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol1',
                            line: i
                        });

                        var amount = loadrec.getSublistText({
                            sublistId: 'item',
                            fieldId: 'amount',
                            line: i
                        });


                        accountArray.push({
                            'accountId': accountIds,
                            'department': department,
                            'trustFunds': trustFunds,
                            'employee': employee,
                            'DCBFunds': DCBFunds,
                            'vehicle': vehicle,
                            'amount': amount
                        })
                        log.debug('accountArray', accountArray)
                    }

                    for (var e = 0; e < expenseCount; e++) {

                        var accountId = loadrec.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'account',
                            line: e
                        });

                        var department = loadrec.getSublistText({
                            sublistId: 'expense',
                            fieldId: 'department',
                            line: e
                        });

                        var trustFunds = loadrec.getSublistText({
                            sublistId: 'expense',
                            fieldId: 'class',
                            line: e
                        });

                        var employee = loadrec.getSublistText({
                            sublistId: 'expense',
                            fieldId: 'custcol_usc_employeeadvances',
                            line: e
                        });

                        var DCBFunds = loadrec.getSublistText({
                            sublistId: 'expense',
                            fieldId: 'cseg_usc_dcb_fund',
                            line: e
                        });
                        log.debug('DCBFUNDS', DCBFunds);

                        var vehicle = loadrec.getSublistText({
                            sublistId: 'expense',
                            fieldId: 'custcol1',
                            line: e
                        });

                        var amount = loadrec.getSublistText({
                            sublistId: 'expense',
                            fieldId: 'amount',
                            line: e
                        });


                        accountArray.push({
                            'accountId': [accountId],
                            'department': department,
                            'trustFunds': trustFunds,
                            'employee': employee,
                            'DCBFunds': DCBFunds,
                            'vehicle': vehicle,
                            'amount': amount
                        })
                    }

                    log.debug('accountArray', JSON.stringify(accountArray));

                    var columns = [];
                    var filters = [];
                    var GL_search = search.create({
                        type: 'transaction',
                        columns: [
                            "account",
                            //"acctname",
                            "creditamount",
                            "debitamount",
                            "department",
                            "class",
                            "cseg_usc_dcb_fund"
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
                    log.debug('GL Search', GL_search);
                    var debTotal_InWords = 0;
                    for (var i = 0; i < GL_search.length; i++) {
                        var accName = GL_search[i].getText('account');
                        log.audit('accName', accName);
                        var creditamount = GL_search[i].getValue("creditamount");
                        if (accName.indexOf('Cash In Bank') != -1) {
                            debTotal_InWords = parseFloat(debTotal_InWords) + parseFloat(creditamount.replace(/,/g, ''));
                        }
                    }
                    // debTotal_InWords = parseFloat(debTotal_InWords) / parseFloat(exchangeRate)

                    // Manila/Cebu time (UTC+8)
                    // NetSuite server-side new Date() returns PST, not UTC.
                    // Use getTimezoneOffset() to convert to true UTC first, then add Manila offset.
                    var now = new Date();
                    var utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
                    var manilaMs = utcMs + (8 * 60 * 60 * 1000);
                    var manilaTime = new Date(manilaMs);

                    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                    var day = manilaTime.getDate();
                    var month = manilaTime.getMonth();
                    var year = manilaTime.getFullYear();

                    log.debug('Manila time', manilaTime);

                    var ampmformat = formatAMPM(manilaTime);
                    log.audit('ampm format', ampmformat);

                    var fullDate = monthNames[month] + ' ' + day + ', ' + year + ' ' + ampmformat
                    log.debug('print date', fullDate);

                    // Creating the htmlvar file to displayed in the suitelet.
                    htmlvar = '';
                    htmlvar += '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n';
                    htmlvar += '<pdf>\n'
                    htmlvar += '<head>';
                    htmlvar += '<macrolist>';
                    htmlvar += '<macro id="nlheader">';
                    htmlvar += '<table width="100%"><tr>';
                    htmlvar += '<td align="left" width="50%"><img src="' + xml.escape(companyLogo) + '" style="float: left; margin: 0px;height:100px;width:240px" /></td>';

                    htmlvar += '<td align="right" style="width: 50%;"> <span style="font-size:26px;font-family: Helvetica ">Check Voucher</span>';
                    htmlvar += '</td>';
                    htmlvar += '</tr></table>';
                    htmlvar += '</macro>';
                    htmlvar += '<macro id="nlfooter">';
                    htmlvar += '<table border="1" cellpadding="1" cellspacing="0" width="100%"><tr>';
                    htmlvar += '<td border-bottom="1px" border-right="1px" style="width: 196px;padding-left:20px;">Prepared by:<p style="font-size:12px"><span style="width:30px">LRV/ JJJM</span><span style="padding-left:10px;font-size:14px">_______________</span></p><p style="font-size:12px;padding-top:-7px">AOC<span style="padding-left:41px;font-size:14px">_______________</span></p></td>';
                    htmlvar += '<td border-bottom="1px" border-right="1px" style="width: 182px;padding-left:20px;">Checked by:<p style="font-size:12px;"><span style="width:30px">AGM </span><span style="padding-left:18px;font-size:14px">________________</span></p><p style="font-size:12px;padding-top:-7px">MJA<span style="padding-left:24px;font-size:14px;">________________</span></p></td>';
                    htmlvar += '<td colspan="2" style="width: 309px;font-size:14px;"><br/><br/><br/>&nbsp;&nbsp; &nbsp;&nbsp;&nbsp; &nbsp;Received by:</td>';
                    /* htmlvar+='<!--td border-bottom="1px" colspan="2" style="width: 185px;">RECEIVED FROM <b>PROSEL PHARMA , INC. </b> THE SUM OF PESOS :<br />&nbsp;';
                    htmlvar+='<p style="font-size:18px">${record.custbody_amountinwords}</p>';
                    htmlvar+='</td-->'; */
                    htmlvar += '</tr>';
                    htmlvar += '<tr>';
                    htmlvar += '<td border-right="1px" colspan="2" style="width: 397px;padding-left:20px;">Approved by:<p style="padding-left:20px">Fr. Arthur Z. Villanueva, SVD</p></td>';
                    htmlvar += '<td align="center" border-right="1px" style="width: 194px;font-size:9px"><br /><br /><br />______________________________<br />SIGNATURE OVER PRINTED NAME</td>';
                    htmlvar += '<td border-top="1px" style="width: 120px;">&nbsp;Date Printed: <br />&nbsp;' + fullDate + '</td>';
                    htmlvar += '</tr></table>';
                    htmlvar += '<table class="footer" style="width: 100%;" margin-top="3px"><tr>';
                    htmlvar += '<td align="center"><b><pagenumber/> of <totalpages/></b></td>';
                    htmlvar += '</tr></table>';
                    htmlvar += '</macro>';
                    htmlvar += '</macrolist>';
                    htmlvar += '<style type="text/css">';
                    htmlvar += 'th {font-weight: bold;font-size: 10px;vertical-align: middle;padding: 5px 6px 3px;background-color: #e3e3e3;color: #333333;}';
                    htmlvar += '</style>';
                    htmlvar += '</head>';

                    htmlvar += '<body header="nlheader" header-height="12%" footer="nlfooter" footer-height="16%" padding="1.2cm 1.2cm 1.2cm 1.2cm" width="8.5in" height="11in" style="font-family: Arial, Helvetica, sans-serif;font-size:11px">';
                    htmlvar += '<table border="1" cellpadding="1" cellspacing="1" style="width: 100%;table-layout:fixed;font-size:11px">';
                    //payee and date
                    htmlvar += '<tr>';
                    htmlvar += '<td style="width: 18%;"><b>Payee:</b></td>';
                    htmlvar += '<td style="width: 58%;">' + xml.escape(entity) + '</td>';
                    htmlvar += '<td style="width: 10%;" padding-right="5px"><b>Date:</b></td>';
                    htmlvar += '<td style="width: 15%;">' + xml.escape(date) + '</td>';
                    htmlvar += '</tr>';
                    //CV # and Class
                    htmlvar += '<tr>';
                    htmlvar += '<td><b>Location:</b></td>';
                    htmlvar += '<td>' + xml.escape(location) + '</td>';
                    htmlvar += '<td padding-right="5px"><b>CV #:</b></td>';
                    htmlvar += '<td>' + xml.escape(transactionnumber) + '</td>';
                    htmlvar += '</tr>';
                    //Check No. and PPI transaction number
                    try {
                        htmlvar += '<tr>';
                        htmlvar += '<td><b>Check Amount:</b></td>';
                        htmlvar += '<td>' + (amtinwords == null ? "" : xml.escape(number2text(debTotal_InWords, currencyText))) + '</td>';
                        htmlvar += '<td><b>Check #:</b></td>';
                        htmlvar += '<td>' + xml.escape(checkno) + '</td>';
                        htmlvar += '</tr>';
                    } catch (err) {
                        log.debug("ERROR --", err);
                    }

                    htmlvar += '</table>';
                    htmlvar += '<table margin-top="10px" margin-bottom="30px" border="1" cellpadding="1" cellspacing="1" width="100%" style="page-break-inside : avoid; page-break-before:auto;"><tr>';
                    htmlvar += '<td align="left" width="100%"><span style="font-size:11px;"><strong>Memo : </strong></span><span style="font-size:11px;padding-left:10px">' + xml.escape(memo) + '</span></td>';
                    htmlvar += '</tr>';

                    htmlvar += '</table>';
                    /* htmlvar+='<table width="90%"><tr>';
                    htmlvar+='<td align="right" style="width: 542px;"><span style="font-size:18px;"><strong>Total</strong></span></td>';
                    htmlvar+='<td align="right" style="width: 181px; text-align: right;"><span style="font-size:18px;"><strong>'+amount+'</strong></span></td>';
                    htmlvar+='</tr></table>'; */

                    htmlvar += '<table margin-top="20px" border-top="1" border-left="1"   border-right="1"  cellpadding="1" cellspacing="0" width="100%" style="page-break-inside : auto; page-break-before:auto;table-layout:fixed;font-size:9.5px;" ><tr>';
                    htmlvar += '  <th align="center" border-right="1px" border-bottom="1px" width="7%">Account<p style="padding-top:-10px">Code</p></th>';
                    htmlvar += '  <th align="center" border-right="1px" border-bottom="1px" width="20%">Account Title</th>';
                    htmlvar += '  <th align="center" border-right="1px" border-bottom="1px" width="20%">Department</th>';
                    htmlvar += '  <th align="center" border-right="1px" border-bottom="1px" width="15%">Trust Fund/<p style="padding-top:-10px">DCB Fund</p></th>';
                    htmlvar += '  <th align="center" border-right="1px" border-bottom="1px" width="11%">Employee</th>';
                    // htmlvar += '  <th align="center" border-right="1px" border-bottom="1px" width="7%">Vehicle</th>';
                    htmlvar += '  <th align="center" border-right="1px" border-bottom="1px" width="10%">Debit</th>';
                    htmlvar += '  <th align="center" border-bottom="1px" width="10%">Credit</th>';
                    htmlvar += '	</tr>';

                    var credTotal = 0;
                    var debTotal = 0;
                    ///////////////////////////////////////////////////////////////////
                    //search accountname in GL then separate the account number
                    for (var i = 0; i < GL_search.length; i++) {
                        var accId = GL_search[i].getValue("account");
                        var accountname = GL_search[i].getText("account");
                        var index = accountname.indexOf(' ');
                        //get account number
                        var account = '';
                        for (var x = 0; x < index; x++) {
                            account += accountname.charAt(x);
                        }
                        //log.debug('account', account);
                        //get next string
                        var accountNext = '';
                        for (var y = index; y < accountname.length; y++) {
                            accountNext += accountname.charAt(y);
                        }
                        log.debug('account next', accountNext);
                        ////////////////////////////////////////////////////////////////////
                        /*
                        for (var i = 0; i < GL_search.length; i++) {
                        var accountname = GL_search[i].getText("account");
                        var account = '';
                        if(accountname.indexOf(' ') != -1){
                            var accountnameArray = accountname.split(' ');
                            account = accountnameArray[0];
                        	
                            if(isNaN(account)){
                            	
                                account = ' ';
                            	
                            }
                            else{
                                accountname = '';
                            	
                                for(var j =1; j < accountnameArray.length; j++){
                                	
                                    accountname = accountname + accountnameArray[j];
    
                                }
                            }
                        }
                        */


                        var creditamount = GL_search[i].getValue("creditamount");
                        var debitamount = GL_search[i].getValue("debitamount");

                        // CONVERT PHP AMOUNTS TO USD BY DIVIDING BY EXCHANGE RATE
                        var creditamountUSD = 0;
                        var debitamountUSD = 0;

                        if (creditamount != 0 && exchangeRate != null && exchangeRate != undefined && exchangeRate != '') {
                            creditamountUSD = parseFloat(creditamount.replace(/,/g, ''));
                        } else if (creditamount != 0) {
                            creditamountUSD = parseFloat(creditamount.replace(/,/g, ''));
                        }

                        if (debitamount != 0 && exchangeRate != null && exchangeRate != undefined && exchangeRate != '') {
                            debitamountUSD = parseFloat(debitamount.replace(/,/g, ''));
                        } else if (debitamount != 0) {
                            debitamountUSD = parseFloat(debitamount.replace(/,/g, ''));
                        }

                        log.debug('Original - Debit: ' + debitamount + ', Credit: ' + creditamount);
                        log.debug('Converted - Debit USD: ' + debitamountUSD.toFixed(2) + ', Credit USD: ' + creditamountUSD.toFixed(2));

                        //log.debug('creditamount',creditamount + ' @@@ ' + debitamount )
                        if (creditamountUSD != 0 || debitamountUSD != 0) {
                            htmlvar += '	<tr>';
                            htmlvar += '  <td align="right" border-right="1px" border-bottom="1px">' + xml.escape(account) + '</td>';
                            htmlvar += '  <td align="left" border-right="1px" border-bottom="1px"><p style="white-space: pre-wrap;word-break: break-word">' + xml.escape(accountname) + '</p></td>';

                            htmlvar += '  <td align="left" border-right="1px" border-bottom="1px"><p style="white-space: pre-wrap;word-break: break-word">' + xml.escape(GL_search[i].getText("department")) + '</p></td>';


                            var vehicleName = ''
                            var employeeName = ''
                            var dcbFunds = ''
                            for (var g = 0; g < accountArray.length; g++) {
                                var accIds = accountArray[g].accountId
                                var amt = accountArray[g].amount

                                log.debug('accids', [accId, accId]);
                                if (accIds.indexOf(accId) != -1) {
                                    if (creditamountUSD != '' || creditamountUSD != undefined || creditamountUSD != null) {
                                        log.debug('creditamountUSD', creditamountUSD + ' ' + amt)
                                        var creditamountToComp = '-' + creditamount
                                        log.debug('creditamountToComp', [creditamountToComp, amt])
                                        // if (numberWithCommas(creditamountToComp) == amt) {
                                        if (accountArray[g].vehicle != null && accountArray[g].vehicle != undefined && accountArray[g].vehicle != '') {
                                            vehicleName = accountArray[g].vehicle
                                        }

                                        if (accountArray[g].employee != null && accountArray[g].employee != undefined && accountArray[g].employee != '') {
                                            employeeName = accountArray[g].employee
                                        }

                                        if (accountArray[g].DCBFunds != null && accountArray[g].DCBFunds != undefined && accountArray[g].DCBFunds != '') {
                                            dcbFunds = accountArray[g].DCBFunds
                                        }

                                        // }

                                    }
                                    log.debug('debitamountUSD', debitamountUSD + ' ' + amt)
                                    log.debug('debitamount', [debitamount, amt])
                                    if ((debitamountUSD != '' || debitamountUSD != undefined || debitamountUSD != null)) {
                                        // if (numberWithCommas(debitamount) == amt){
                                        if (accountArray[g].vehicle != null && accountArray[g].vehicle != undefined && accountArray[g].vehicle != '') {
                                            vehicleName = accountArray[g].vehicle
                                        }

                                        if (accountArray[g].employee != null && accountArray[g].employee != undefined && accountArray[g].employee != '') {
                                            employeeName = accountArray[g].employee
                                        }

                                        if (accountArray[g].DCBFunds != null && accountArray[g].DCBFunds != undefined && accountArray[g].DCBFunds != '') {
                                            dcbFunds = accountArray[g].DCBFunds
                                        }
                                        // }
                                    }

                                }
                            }

                            var trustFunds = '';
                            if (GL_search[i].getText("class") != '' && GL_search[i].getText("class") != undefined && GL_search[i].getText("class") != null) {
                                trustFunds = GL_search[i].getText("class")
                            } else {
                                trustFunds = dcbFunds
                            }
                            htmlvar += '  <td align="left" border-right="1px" border-bottom="1px"><p style="white-space: pre-wrap;word-break: break-word">' + xml.escape(trustFunds) + '</p></td>';


                            htmlvar += '  <td align="center" border-right="1px" border-bottom="1px" style="white-space: pre-wrap;word-break: break-word">' + xml.escape(employeeName.substring(employeeName.indexOf(' '))) + '</td>';
                            // htmlvar += '  <td align="center" border-right="1px" border-bottom="1px" style="white-space: pre-wrap;word-break: break-word">' + xml.escape(vehicleName) + '</td>';

                            // DISPLAY CONVERTED USD AMOUNTS WITH PROPER FORMATTING
                            htmlvar += '  <td align="right" border-right="1px" border-bottom="1px">' + xml.escape(numberWithCommas(debitamountUSD.toFixed(2))) + '</td>';
                            htmlvar += '  <td align="right" border-bottom="1px">' + xml.escape(numberWithCommas(creditamountUSD.toFixed(2))) + '</td>';
                            htmlvar += '  </tr>';
                        }

                        if (creditamount != 0) {
                            credTotal = parseFloat(credTotal) + parseFloat(creditamount);
                        }
                        if (debitamount != 0) {
                            debTotal = parseFloat(debTotal) + parseFloat(debitamount);
                        }
                    }

                    htmlvar += '  </table>';

                    htmlvar += '<table margin-top="5px" width="100%" style="page-break-inside : avoid; page-break-before:auto;font-size:10px">';
                    htmlvar += '<tr border-top="0px" border-bottom="1px">';

                    htmlvar += '  <td colspan="6" align="left"  border-bottom="1px" width="80%" style="font-size:12px"><b>Overall Total</b></td>';

                    // DISPLAY TOTALS IN USD CURRENCY
                    htmlvar += '  <td align="right" border-bottom="1px" width="10%"> <b> PHP <br />' + xml.escape(numberWithCommas(debTotal.toFixed(2))) + '</b></td>';
                    htmlvar += '  <td align="right" border-bottom="1px" width="10%"> <b> PHP <br />' + xml.escape(numberWithCommas(credTotal.toFixed(2))) + '</b></td>';


                    htmlvar += '</tr>';
                    htmlvar += ' </table>';
                    /* htmlvar+='<table border="1" cellpadding="1" cellspacing="0" width="100%"><tr>';
                    htmlvar+='<td border-bottom="1px" border-right="1px" style="width: 196px;padding-left:20px;"><b>Prepared by:</b><br /><br />&nbsp;'+xml.escape(preparedby)+'</td>';
                    htmlvar+='<td border-bottom="1px" border-right="1px" style="width: 182px;padding-left:20px;"><b>Checked by:</b><br /><br />&nbsp;'+xml.escape(checkedby)+'</td>';
                    htmlvar+='<td colspan="2" style="width: 309px;font-size:14px;"><br/><br/><br/>&nbsp;&nbsp; &nbsp;&nbsp;&nbsp; &nbsp;Received by:</td>';
                    /* htmlvar+='<!--td border-bottom="1px" colspan="2" style="width: 185px;">RECEIVED FROM <b>PROSEL PHARMA , INC. </b> THE SUM OF PESOS :<br />&nbsp;';
                    htmlvar+='<p style="font-size:18px">${record.custbody_amountinwords}</p>';
                    htmlvar+='</td-->'; 
                    htmlvar+='</tr>';
                    htmlvar+='<tr>';
                    htmlvar+='<td border-right="1px" colspan="2" style="width: 397px;padding-left:20px;"><b>Approved by:</b><br /><br />&nbsp;'+xml.escape(approvedby)+'</td>';
                    htmlvar+='<td align="center" border-right="1px" style="width: 194px;font-size:9px"><br /><br /><br />_____________________________________<br />SIGNATURE OVER PRINTED NAME</td>';
                    htmlvar+='<td border-top="1px" style="width: 100px;">&nbsp;Date:</td>';
                    htmlvar+='</tr></table>'; */

                    htmlvar += '</body>';
                    htmlvar += '</pdf>';

                    var file1 = render.xmlToPdf({
                        xmlString: htmlvar
                    });

                    context.response.writeFile(file1, true);
                    return;
                } catch (e) {
                    log.error("Error", e);
                }
            }
        }

        function numberWithCommas(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        // Function to add commas between the numbers.

        function number2text(value, currencyText) {
            var fraction = Math.round(frac(value) * 100);
            log.debug('fraction', fraction)
            var f_text = "";

            if (fraction > 0) {
                // f_text = convert_number(fraction)+" Cents"; //Changes as Moses req 
                //f_text = convert_number(fraction)+" Centavos";

                return numToWords(value) + ' ' + currencyText + ' and ' + fraction + '/100' + " " + 'only';
            }
            return numToWords(value) + ' ' + currencyText + f_text + " " + 'only';
        }



        function frac(f) {
            return f % 1;
        }

        function numToWords(s) {

            var th = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

            var dg = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
            var tn = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            var tw = ['Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

            s = s.toString();
            s = s.replace(/[\, ]/g, '');
            if (s != parseFloat(s)) return 'not a number';
            var x = s.indexOf('.');
            if (x == -1) x = s.length;
            if (x > 15) return 'too big';
            var n = s.split('');
            var str = '';
            var sk = 0;
            for (var i = 0; i < x; i++) {
                if ((x - i) % 3 == 2) {
                    if (n[i] == '1') {
                        str += tn[Number(n[i + 1])] + ' ';
                        i++;
                        sk = 1;
                    } else if (n[i] != 0) {
                        str += tw[n[i] - 2] + ' ';
                        sk = 1;
                    }
                } else if (n[i] != 0) {
                    str += dg[n[i]] + ' ';
                    if ((x - i) % 3 == 0) str += 'Hundred ';
                    sk = 1;
                }
                if ((x - i) % 3 == 1) {
                    if (sk) str += th[(x - i - 1) / 3] + ' ';
                    sk = 0;
                }
            }
            // if (x != s.length) {
            // var y = s.length;
            // str += 'point ';
            // for (var i = x + 1; i < y; i++) str += dg[n[i]] + ' ';
            // }
            return str.replace(/\s+/g, ' ');

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