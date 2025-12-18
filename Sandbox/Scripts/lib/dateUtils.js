/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/***************************************************************************************
 * Date Utilities Module
 * Shared date formatting functions for USC SuiteScript customizations
 ***************************************************************************************/

define([], () => {

    // Manila/Cebu is UTC+8, no daylight saving
    const MANILA_UTC_OFFSET_HOURS = 8;

    const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    /**
     * Get current time in Manila/Cebu timezone (UTC+8)
     *
     * NetSuite server-side new Date() returns PST, not UTC.
     * We use getTimezoneOffset() to convert to true UTC first,
     * then add Manila's UTC+8 offset.
     *
     * IMPORTANT: Use getUTC* methods when extracting values from the returned Date,
     * since we've shifted the timestamp to represent Manila time in UTC terms.
     *
     * @returns {Date} Date object with Manila time stored as UTC values
     */
    const getManilaTime = () => {
        const now = new Date();
        // Convert to UTC milliseconds (getTimezoneOffset returns minutes, positive for behind UTC)
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
        // Add Manila offset (UTC+8)
        const manilaMs = utcMs + (MANILA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
        return new Date(manilaMs);
    };

    /**
     * Format date as "Mon DD, YYYY HH:MM am/pm"
     * Uses UTC methods since getManilaTime stores Manila time as UTC values
     * @param {Date} date - Date to format (defaults to current Manila time)
     * @returns {string}
     */
    const formatPrintDate = (date) => {
        const d = date || getManilaTime();
        const day = d.getUTCDate();
        const month = MONTH_NAMES_SHORT[d.getUTCMonth()];
        const year = d.getUTCFullYear();
        const time = formatAMPM(d);

        return `${month} ${day}, ${year} ${time}`;
    };

    /**
     * Format time as "HH:MM am/pm"
     * Uses UTC methods since getManilaTime stores Manila time as UTC values
     * @param {Date} date
     * @returns {string}
     */
    const formatAMPM = (date) => {
        let hours = date.getUTCHours();
        let minutes = date.getUTCMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';

        hours = hours % 12;
        hours = hours ? hours : 12; // hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;

        return `${hours}:${minutes} ${ampm}`;
    };

    /**
     * Get formatted date components
     * Uses UTC methods since getManilaTime stores Manila time as UTC values
     * @param {Date} date - Date to format (defaults to current Manila time)
     * @returns {Object} { day, month, monthName, year, time, fullDate }
     */
    const getDateComponents = (date) => {
        const d = date || getManilaTime();
        return {
            day: d.getUTCDate(),
            month: d.getUTCMonth(),
            monthName: MONTH_NAMES_SHORT[d.getUTCMonth()],
            year: d.getUTCFullYear(),
            time: formatAMPM(d),
            fullDate: formatPrintDate(d)
        };
    };

    return {
        MANILA_UTC_OFFSET_HOURS,
        MONTH_NAMES_SHORT,
        MONTH_NAMES_FULL,
        getManilaTime,
        formatPrintDate,
        formatAMPM,
        getDateComponents
    };
});
