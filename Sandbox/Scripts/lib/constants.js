/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/***************************************************************************************
 * Constants Module
 * Centralized field IDs and configuration values for USC SuiteScript customizations
 ***************************************************************************************/

define([], () => {

    /**
     * Standard NetSuite field IDs
     */
    const FIELDS = {
        // Transaction header fields
        TRAN_ID: 'tranid',
        TRAN_DATE: 'trandate',
        TRANSACTION_NUMBER: 'transactionnumber',
        ENTITY: 'entity',
        MEMO: 'memo',
        LOCATION: 'location',
        CURRENCY: 'currency',
        EXCHANGE_RATE: 'exchangerate',
        USER_TOTAL: 'usertotal',

        // Classification fields
        DEPARTMENT: 'department',
        CLASS: 'class',  // Trust Fund

        // Custom fields
        PREPARED_BY: 'custbody_preparedby',
        CHECKED_BY: 'custbody_verifiedby',
        APPROVED_BY: 'custbody_approvedby',
        EMPLOYEE_ADVANCES: 'custcol_usc_employeeadvances',
        VEHICLE: 'custcol1',

        // Custom segments
        DCB_FUND: 'cseg_usc_dcb_fund'
    };

    /**
     * Sublist IDs
     */
    const SUBLISTS = {
        EXPENSE: 'expense',
        ITEM: 'item',
        INVENTORY: 'inventory',
        LINE: 'line',
        APPLY: 'apply'
    };

    /**
     * Record types
     */
    const RECORD_TYPES = {
        CHECK: 'check',
        INVENTORY_ADJUSTMENT: 'inventoryadjustment',
        DEPOSIT: 'deposit',
        VENDOR_CREDIT: 'vendorcredit'
    };

    /**
     * Cost center field labels for validation messages
     */
    const COST_CENTER_LABELS = {
        DEPARTMENT: 'Department',
        TRUST_FUND: 'Trust Fund',
        DCB_FUND: 'DCB Fund'
    };

    /**
     * Item types
     */
    const ITEM_TYPES = {
        INVENTORY: 'InvtPart',
        NON_INVENTORY: 'NonInvtPart',
        SERVICE: 'Service',
        DISCOUNT: 'Discount',
        OTHER_CHARGE: 'OtherCharge'
    };

    /**
     * Item type to record type mapping for loading item records
     */
    const ITEM_RECORD_TYPES = {
        InvtPart: 'inventoryitem',
        NonInvtPart: 'noninventoryitem',
        Service: 'serviceitem',
        Discount: 'discountitem',
        OtherCharge: 'otherchargeitem'
    };

    /**
     * Print titles for different record types
     */
    const PRINT_TITLES = {
        check: 'Check Voucher',
        inventoryadjustment: 'Inventory Adjustment',
        deposit: 'Deposit',
        vendorcredit: 'Vendor Credit'
    };

    return {
        FIELDS,
        SUBLISTS,
        RECORD_TYPES,
        COST_CENTER_LABELS,
        ITEM_TYPES,
        ITEM_RECORD_TYPES,
        PRINT_TITLES
    };
});
