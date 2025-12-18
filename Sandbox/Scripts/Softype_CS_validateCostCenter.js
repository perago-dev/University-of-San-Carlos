/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

/***************************************************************************************
 ** Copyright (c) 1998-2025 Softype, Inc.
 ** All Rights Reserved.
 **
 ** @Author      : saisubramani
 ** @Dated       : 12th Dec, 2025
 ** @Version     : 2.1
 ** @Description : Client script to validate cost center fields (only one can have a value)
 ** @Update      : Refactored to use shared constants, added pageInit validation
 ***************************************************************************************/

define(['N/ui/dialog', 'N/log', './lib/constants'], (dialog, log, constants) => {

    const { FIELDS, COST_CENTER_LABELS } = constants;

    /**
     * Check which cost center fields have values
     * @param {Record} currentRecord
     * @returns {Object} { count, fields }
     */
    const checkFieldValues = (currentRecord) => {
        const fieldsWithValues = [];
        let count = 0;

        // Check Department
        if (currentRecord.getValue({ fieldId: FIELDS.DEPARTMENT })) {
            fieldsWithValues.push(COST_CENTER_LABELS.DEPARTMENT);
            count++;
        }

        // Check Class (Trust Fund)
        if (currentRecord.getValue({ fieldId: FIELDS.CLASS })) {
            fieldsWithValues.push(COST_CENTER_LABELS.TRUST_FUND);
            count++;
        }

        // Check Custom Segment (DCB Fund)
        if (currentRecord.getValue({ fieldId: FIELDS.DCB_FUND })) {
            fieldsWithValues.push(COST_CENTER_LABELS.DCB_FUND);
            count++;
        }

        return { count, fields: fieldsWithValues };
    };

    /**
     * Show validation error dialog
     * @param {string} title
     * @param {string[]} fields
     */
    const showValidationError = (title, fields) => {
        dialog.alert({
            title,
            message: `Error: Only one field can have a value among ${COST_CENTER_LABELS.DEPARTMENT}, ${COST_CENTER_LABELS.TRUST_FUND}, and ${COST_CENTER_LABELS.DCB_FUND}. Please clear the other fields.\n\nCurrently filled: ${fields.join(', ')}`
        });
    };

    /**
     * Validate on page load (edit mode)
     */
    const pageInit = (context) => {
        if (context.mode !== 'edit') return;

        try {
            const currentRecord = context.currentRecord;
            const validation = checkFieldValues(currentRecord);

            log.debug('pageInit Validation', `Count: ${validation.count}, Fields: ${validation.fields.join(', ')}`);

            if (validation.count > 1) {
                dialog.alert({
                    title: 'Data Warning',
                    message: `This record has multiple cost center fields populated: ${validation.fields.join(', ')}. Please correct before saving.`
                });
            }
        } catch (e) {
            log.error('pageInit Error', e.toString());
        }
    };

    /**
     * Validate when cost center fields change
     */
    const fieldChanged = (context) => {
        try {
            const currentRecord = context.currentRecord;
            const fieldId = context.fieldId;

            // Only validate if one of the three fields was changed
            if (fieldId !== FIELDS.DEPARTMENT && fieldId !== FIELDS.CLASS && fieldId !== FIELDS.DCB_FUND) {
                return;
            }

            log.debug('fieldChanged', `Field changed: ${fieldId}`);

            const validation = checkFieldValues(currentRecord);
            log.debug('Field Validation', `Count: ${validation.count}, Fields: ${validation.fields.join(', ')}`);

            if (validation.count > 1) {
                showValidationError('Validation Error', validation.fields);

                // Clear the field that was just changed
                currentRecord.setValue({ fieldId, value: '' });
                log.audit('Field Cleared', `Cleared field: ${fieldId} due to multiple fields having values`);
            }
        } catch (e) {
            log.error('fieldChanged Error', e.toString());
        }
    };

    /**
     * Validate before save
     */
    const saveRecord = (context) => {
        try {
            const currentRecord = context.currentRecord;
            log.debug('saveRecord', 'Validating before save');

            const validation = checkFieldValues(currentRecord);
            log.debug('Save Validation', `Count: ${validation.count}, Fields: ${validation.fields.join(', ')}`);

            if (validation.count > 1) {
                showValidationError('Cannot Save Record', validation.fields);
                log.audit('Save Blocked', `Save prevented: ${validation.fields.join(', ')}`);
                return false;
            }

            log.audit('Save Allowed', `Validation passed. Fields with values: ${validation.count}`);
            return true;
        } catch (e) {
            log.error('saveRecord Error', e.toString());
            dialog.alert({
                title: 'Error',
                message: 'An error occurred during validation. Please contact your administrator.'
            });
            return false;
        }
    };

    return {
        pageInit,
        fieldChanged,
        saveRecord
    };
});
