/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
/***************************************************************************************
 ** Copyright (c) 1998-2025 Softype, Inc.
 ** Ventus Infotech Private Limited, 3012, NIBR Corporate Park 1 Aerocity,Andheri - Kurla Rd, Safed Pul , Saki Naka,, Mumbai INDIA 400 072.
 ** All Rights Reserved.
 ** This software is the confidential and proprietary information of Softype, Inc. ("Confidential Information").
 **You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement you entered into with Softype.
 **
 **@Author      :  saisubramani
 **@Dated       :  12th Dec, 2025
 **@Version     :  2.1
 **@Description :  Clientscript to validate the cost center value
 ***************************************************************************************/
define(['N/ui/dialog', 'N/log'], function (dialog, log) {
    function checkFieldValues(currentRecord) {
        var fieldsWithValues = [];
        var count = 0;

        // Check Department
        var department = currentRecord.getValue({ fieldId: 'department' });
        if (department) {
            fieldsWithValues.push('Department');
            count++;
        }

        // Check Class (Trust Fund)
        var classValue = currentRecord.getValue({ fieldId: 'class' });
        if (classValue) {
            fieldsWithValues.push('Trust Fund');
            count++;
        }

        // Check Custom Segment (DCB Fund)
        var costCenter = currentRecord.getValue({ fieldId: 'cseg_usc_dcb_fund' });
        if (costCenter) {
            fieldsWithValues.push('DCB Fund');
            count++;
        }

        return {
            count: count,
            fields: fieldsWithValues
        };
    }

    function fieldChanged(context) {
        try {
            var currentRecord = context.currentRecord;
            var fieldId = context.fieldId;

            // Only validate if one of the three fields was changed
            if (fieldId === 'department' || fieldId === 'class' || fieldId === 'cseg_usc_dcb_fund') {

                log.debug('fieldChanged', 'Field changed: ' + fieldId);

                // Check field values
                var validation = checkFieldValues(currentRecord);

                log.debug('Field Validation', 'Count: ' + validation.count + ', Fields with values: ' + validation.fields.join(', '));

                // If more than one field has a value, show alert and clear the current field
                if (validation.count > 1) {
                    dialog.alert({
                        title: 'Validation Error',
                        message: 'Error: Only one field can have a value among Department, Trust fund, and DCB fund. Please clear the other fields.'
                    });

                    // Clear the field that was just changed
                    currentRecord.setValue({
                        fieldId: fieldId,
                        value: ''
                    });

                    log.audit('Field Cleared', 'Cleared field: ' + fieldId + ' due to multiple fields having values');
                }
            }

        } catch (e) {
            log.error('fieldChanged Error', e.toString());
        }
    }

    function saveRecord(context) {
        try {
            var currentRecord = context.currentRecord;

            log.debug('saveRecord', 'Validating before save');

            // Check field values
            var validation = checkFieldValues(currentRecord);

            log.debug('Save Validation', 'Count: ' + validation.count + ', Fields with values: ' + validation.fields.join(', '));

            // NEW VALIDATION: Check if all three fields are empty
            if (validation.count === 0) {
                dialog.alert({
                    title: 'Required Field Missing',
                    message: 'Please fill at least one field among Department, Trust fund, or DCB fund before saving.'
                });

                log.audit('Save Blocked', 'Save prevented - No cost center field has a value');

                return false; // Prevent save
            }

            // EXISTING VALIDATION: If more than one field has a value, show alert and prevent save
            if (validation.count > 1) {
                dialog.alert({
                    title: 'Cannot Save Record',
                    message: 'Cannot save: Only one field can have a value among Department, Trust fund, and DCB fund. Please correct before saving.'
                });

                log.audit('Save Blocked', 'Save prevented due to multiple fields having values: ' + validation.fields.join(', '));

                return false; // Prevent save
            }

            // Allow save if exactly 1 field has a value
            log.audit('Save Allowed', 'Validation passed. Field with value: ' + validation.fields.join(', '));
            return true;

        } catch (e) {
            log.error('saveRecord Error', e.toString());
            // In case of error, prevent save to be safe
            dialog.alert({
                title: 'Error',
                message: 'An error occurred during validation. Please contact your administrator.'
            });
            return false;
        }
    }

    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});