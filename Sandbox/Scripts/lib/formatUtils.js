/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/***************************************************************************************
 * Format Utilities Module
 * Shared formatting functions for USC SuiteScript customizations
 ***************************************************************************************/

define([], () => {

    /**
     * Currency text mapping for amount-in-words conversion
     */
    const CURRENCY_TEXT = {
        USD: 'US Dollars',
        PHP: 'Pesos',
        CAD: 'Canadian Dollars',
        EUR: 'Euros',
        SGD: 'Singapore Dollars'
    };

    /**
     * Format number with comma separators (only for integer part)
     * @param {number|string} value
     * @returns {string}
     */
    const numberWithCommas = (value) => {
        const parts = value.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    /**
     * Parse formatted number string to float (removes all commas)
     * @param {string} value - Formatted number string like "1,234,567.89"
     * @returns {number}
     */
    const parseFormattedNumber = (value) => {
        if (!value) return 0;
        return parseFloat(value.toString().replace(/,/g, '')) || 0;
    };

    /**
     * Convert number to words for check printing
     * @param {number} value
     * @param {string} currencyCode - e.g., "PHP", "USD"
     * @returns {string}
     */
    const numberToWords = (value, currencyCode) => {
        const currencyText = CURRENCY_TEXT[currencyCode] || currencyCode;
        const fraction = Math.round((value % 1) * 100);
        const words = convertWholeNumber(Math.floor(Math.abs(value)));

        if (fraction > 0) {
            return `${words} ${currencyText} and ${fraction}/100 only`;
        }
        return `${words} ${currencyText} only`;
    };

    /**
     * Convert whole number to words
     * @param {number} num
     * @returns {string}
     */
    const convertWholeNumber = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
            'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

        if (num === 0) return 'Zero';

        let words = '';
        let scaleIndex = 0;

        while (num > 0) {
            const chunk = num % 1000;
            if (chunk !== 0) {
                const chunkWords = convertChunk(chunk, ones, tens, teens);
                words = `${chunkWords} ${scales[scaleIndex]} ${words}`;
            }
            num = Math.floor(num / 1000);
            scaleIndex++;
        }

        return words.trim().replace(/\s+/g, ' ');
    };

    /**
     * Convert a 3-digit chunk to words
     * @private
     */
    const convertChunk = (num, ones, tens, teens) => {
        let result = '';

        if (num >= 100) {
            result += `${ones[Math.floor(num / 100)]} Hundred `;
            num %= 100;
        }

        if (num >= 20) {
            result += `${tens[Math.floor(num / 10)]} `;
            num %= 10;
        } else if (num >= 10) {
            result += `${teens[num - 10]} `;
            return result;
        }

        if (num > 0) {
            result += `${ones[num]} `;
        }

        return result;
    };

    /**
     * Format currency amount for display
     * @param {number} amount
     * @param {number} decimals - Number of decimal places (default 2)
     * @returns {string}
     */
    const formatCurrency = (amount, decimals = 2) => {
        return numberWithCommas(amount.toFixed(decimals));
    };

    return {
        CURRENCY_TEXT,
        numberWithCommas,
        parseFormattedNumber,
        numberToWords,
        formatCurrency
    };
});
