/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/***************************************************************************************
 * Date Utilities Module
 * Shared date formatting functions for USC SuiteScript customizations
 ***************************************************************************************/

define([], () => {

    const MANILA_UTC_OFFSET = 8;

    const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    /**
     * Get current time in Manila timezone (UTC+8)
     * @returns {Date}
     */
    const getManilaTime = () => {
        const utcNow = new Date();
        return new Date(utcNow.getTime() + (MANILA_UTC_OFFSET * 60 * 60 * 1000));
    };

    /**
     * Format date as "Mon DD, YYYY HH:MM am/pm"
     * @param {Date} date - Date to format (defaults to current Manila time)
     * @returns {string}
     */
    const formatPrintDate = (date) => {
        const d = date || getManilaTime();
        const day = d.getDate();
        const month = MONTH_NAMES_SHORT[d.getMonth()];
        const year = d.getFullYear();
        const time = formatAMPM(d);

        return `${month} ${day}, ${year} ${time}`;
    };

    /**
     * Format time as "HH:MM am/pm"
     * @param {Date} date
     * @returns {string}
     */
    const formatAMPM = (date) => {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';

        hours = hours % 12;
        hours = hours ? hours : 12; // hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;

        return `${hours}:${minutes} ${ampm}`;
    };

    /**
     * Get formatted date components
     * @param {Date} date - Date to format (defaults to current Manila time)
     * @returns {Object} { day, month, monthName, year, time, fullDate }
     */
    const getDateComponents = (date) => {
        const d = date || getManilaTime();
        return {
            day: d.getDate(),
            month: d.getMonth(),
            monthName: MONTH_NAMES_SHORT[d.getMonth()],
            year: d.getFullYear(),
            time: formatAMPM(d),
            fullDate: formatPrintDate(d)
        };
    };

    return {
        MANILA_UTC_OFFSET,
        MONTH_NAMES_SHORT,
        MONTH_NAMES_FULL,
        getManilaTime,
        formatPrintDate,
        formatAMPM,
        getDateComponents
    };
});
