// fetch info from Monetary Authority of Singapore (MAS) APIs, such as T-Bills
// adapted from https://github.com/ngshiheng/sgs-issuance-calendar/blob/main/src/api.ts

const axios = require("axios");
const { MASResponse, TBillsIssuanceRecord, TBillsAuctionRecord } = require('./masDataTypes');

/**
 * Returns the date now (GMT +8)
 * @returns {Date} date_obj
 */
function getDateNow() {
    // Global variable for today's date in GMT+8
    const today = new Date();
    // shift time to GMT+8
    today.setHours(today.getHours() + 8);

    return today;
}

/**
 * Formats a Date object into a string of the format YYYY-MM-DD.
 *
 * This function takes a JavaScript Date object and extracts the year, month, and day,
 * ensuring that the month and day are zero-padded to two digits.
 *
 * @param {Date} date_obj - The Date object to be formatted.
 * @returns {string} A string representing the date in the format YYYY-MM-DD.
 *
 * @example
 * const date = new Date('2023-10-04');
 * const formatted = formatDate(date);
 * console.log(formatted); // Outputs: '2023-10-04'
 */
function formatDate(date_obj) {
    // return a string of YYYY-MM-DD, date given from the `date_obj`
    const year = date_obj.getFullYear();
    const month = String(date_obj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date_obj.getDate()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;

    return formattedDate;
}

/**
 * Represents a service for interacting with the MAS API.
 *
 * This class provides methods to build URLs for API requests and fetch data related
 * to Treasury Bills (T-Bills) issuance calendar and history. It encapsulates the
 * base URL for the MAS API and provides utility functions to construct API endpoints
 * and handle requests.
 *
 * @class
 */
class MASApiService {
    constructor() {
        this.baseUrl = "https://eservices.mas.gov.sg/statistics/api/v1";
    }

    /**
     * Constructs a full URL from the given endpoint and parameters.
     *
     * This function takes an endpoint and a parameters object, converts the parameters
     * into a query string format, and combines them with the base URL to create a complete URL.
     *
     * @param {string} endpoint - The API endpoint to append to the base URL.
     * @param {Object} params - An object containing key-value pairs to be included as query parameters.
     * @returns {string} The constructed URL with the base URL, endpoint, and query parameters.
     *
     * @example
     * const endpoint = '/api/data';
     * const params = { key1: 'value1', key2: 'value2' };
     * const url = buildUrl(endpoint, params);
     * console.log(url); // Outputs: 'https://yourbaseurl.com/api/data?key1=value1&key2=value2'
     */
    buildUrl(endpoint, params) {
        console.log(`[MASApiService.buildUrl] endpoint: ${endpoint}, params.keys: ${Object.keys(params)}, params.values: ${Object.values(params)}`);

        const paramString = Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join("&");
        const url = `${this.baseUrl}${endpoint}?${paramString}`;
        return url;
    }

    /**
     * Fetches data from the specified endpoint.
     *
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {Object} params - The parameters to send with the request.
     * @returns {Promise<MASResponse>} A promise that resolves to a MASResponse object.
     */
    async fetch(endpoint, params) {
        const url = this.buildUrl(endpoint, params);
        
        console.log(`[MASApiService.fetch] Fetching data from "${url}"`);
        
        try {
            const response = await axios.get(url);
            console.log(
                "[MASApiService.fetch] got remote dictionary from MAS with",
                Object.keys(response.data).length, "keys"
            );
            console.log(
                "[MASApiService.fetch]", response.data
            );
            return new MASResponse(true, response.data.result);
        } catch (error) {
            console.error(`[MASApiService.fetch] Error fetching data from "${url}":`);
            console.error(error);
            return new MASResponse(false, {});
        }
    }

    /**
     * Retrieves the T-Bills issuance calendar for a specified date range and auction tenor.
     *
     * This function constructs a request to fetch the issuance calendar for Treasury Bills
     * (T-Bills) based on the provided start and end announcement dates, auction tenor, number of rows, and sorting order.
     *
     * @param {string} startDate - The start date for the issuance calendar (format: YYYY-MM-DD).
     * @param {string} endDate - The end date for the issuance calendar (format: YYYY-MM-DD).
     * @param {number} auctionTenor - The auction tenor, expressed as a fraction of a year (e.g., 0.5 for 6 months).
     * @param {number} [rows=200] - The maximum number of rows to return (default is 200).
     * @param {string} [sort="auction_date desc"] - The sorting order for the results 
     *                                         (default is "auction_date desc", descending order of auction date).
     * @returns {Promise<Object>} A promise that resolves to the response containing the T-Bills issuance calendar data.
     *
     * @example
     * getTBillsIssuanceCalendar('2023-01-01', '2023-12-31', 0.5)
     *   .then(data => {
     *       console.log(data);
     *   })
     *   .catch(error => {
     *       console.error(error);
     *   });
     */
    async getTBillsIssuanceCalendar({startDate, endDate, auctionTenor, rows = 200, sort = "auction_date desc"} = {}) {
        const endpoint = "/bondsandbills/m/issuancecalendar";

        // issue_type="T" refers to T-Bills
        // auction_tenor is a fraction of a year, so for 6-month t-bills, auction_tenor=0.5
        // ann_date: announcement date
        const params = {
            rows,
            filters: `issue_type:"T" AND auction_tenor:"${auctionTenor}" AND ann_date:[${startDate} TO ${endDate}]`,
            sort,
        };
        
        try {
            const response = await this.fetch(endpoint, params);
            console.log(
                "[MASApiService.getTBillsIssuanceCalendar] got MAS Response of size",
                response.result.total
            );
            return response;
        } catch (error) {
            console.error(`[MASApiService.getTBillsIssuanceCalendar] Error fetching data from MAS`);
            console.error(error);
            return new MASResponse(false, {}); // Return a structured error response
        }
    }

    /**
     * Retrieves the T-Bills issuance history for a specified date range and auction tenor.
     *
     * This function constructs a request to fetch the issuance history for Treasury Bills
     * (T-Bills) based on the provided start and end auction dates, auction tenor, number of rows, and sorting order.
     *
     * @param {string} startDate - The start date for the issuance history (format: YYYY-MM-DD).
     * @param {string} endDate - The end date for the issuance history (format: YYYY-MM-DD).
     * @param {number} auctionTenor - The auction tenor, expressed as a fraction of a year (e.g., 0.5 for 6 months).
     * @param {number} [rows=10] - The maximum number of rows to return (default is 10).
     * @param {string} [sort="auction_date desc"] - The sorting order for the results 
     *                                              (default is "auction_date desc", decreasing order of auction date).
     * @returns {Promise<Object>} A promise that resolves to the response containing the T-Bills issuance history data.
     */
    async getTBillsIssuanceHistory({startDate, endDate, auctionTenor, rows = 10, sort = "auction_date desc"} = {}) {
        const endpoint = "/bondsandbills/m/listauctionbondsandbills"
        const params = {
            rows,
            filters: `product_type:"B" AND auction_tenor:"${auctionTenor}" AND auction_date:[${startDate} TO ${endDate}]`,
            sort
        }
        
        try {
            const response = await this.fetch(endpoint, params);
            console.log(
                "[MASApiService.getTBillsIssuanceHistory] got MAS Response of size",
                response.result.total
            );
            return response;
        } catch (error) {
            console.error(`[MASApiService.getTBillsIssuanceHistory] Error fetching data from MAS`);
            console.error(error);
            return new MASResponse(false, {}); // Return a structured error response
        }
    }

    // TODO: Add methods for getting MAS SGS and SSB records
}

/**
 * Asynchronously retrieves information about recent T-Bills issuances based on the specified tenor.
 *
 * This function fetches T-Bills issuance history from the MAS API service. It calculates 
 * the date range for the past month to filter the issuance history data and returns 
 * the most recent (sort by auction date) issuance record for the specified tenor.
 *
 * @async
 * @function getRecentTbills
 * @param {Object} [options={}] - Optional parameters for the function.
 * @param {number} [options.tenor=0.5] - The tenor (in years) for which to fetch recent T-Bills 
 * issuance details. Defaults to 0.5 years (6 months).
 * 
 * @returns {Promise<TBillsAuctionRecord>} A promise that resolves to an instance 
 * of `TBillsAuctionRecord` representing the most recent T-Bills issuance. If no records 
 * are found or an error occurs, an empty `TBillsAuctionRecord` is returned.
 *
 * @throws {Error} Throws an error if there is a problem retrieving the T-Bills data.
 * The error is logged, and an empty `TBillsAuctionRecord` is returned in case of failure.
 */
async function getRecentTbills({tenor = 0.5} = {}) {

    console.log("[getRecentTbills] get recent t-bills info");

    const api = new MASApiService();

    const lastMonth = new Date();
    const today = getDateNow();

    // Set the date to one month prior
    lastMonth.setMonth(today.getMonth() - 1);

    const startDate = formatDate(lastMonth);
    const endDate = formatDate(today);

    try {
        const response = await api.getTBillsIssuanceHistory({
            startDate: startDate, 
            endDate: endDate, 
            auctionTenor: tenor, 
            rows: 10,
            sort: "auction_date desc"});

        console.log(`[getRecentTbills] got response of size ${response.result.total}`);
        return new TBillsAuctionRecord(response.result.records[0]);
    } catch(error) {
        console.log(`[getRecentTbills] got error ${error}`);
        return new TBillsAuctionRecord();
    };
}

/**
 * Asynchronously retrieves the next T-Bills issuance details based on the specified tenor.
 *
 * This function fetches T-Bills issuance records from the MAS API service. It 
 * calculates the date range for the past month to filter the issuance calendar 
 * data, and it returns the most recent (sort by announcement date) issuance record 
 * for the specified tenor.
 *
 * @async
 * @function getNextTbills
 * @param {Object} [options={}] - Optional parameters for the function.
 * @param {number} [options.tenor=0.5] - The tenor (in years) for which to fetch T-Bills 
 * issuance details. Defaults to 0.5 years (6 months).
 * 
 * @returns {Promise<TBillsIssuanceRecord>} A promise that resolves to an instance 
 * of `TBillsIssuanceRecord` representing the next T-Bills issuance. If no records 
 * are found or an error occurs, an empty `TBillsIssuanceRecord` is returned.
 *
 * @throws {Error} Throws an error if there is a problem retrieving the T-Bills data.
 * The error is logged, and an empty `TBillsIssuanceRecord` is returned in case of failure.
 */
async function getNextTbills({tenor = 0.5} = {}) {

    console.log("[getNextTbills] tenor:", tenor);

    const api = new MASApiService();

    const nextMonth = new Date();
    const today = getDateNow();

    // get next month's date
    nextMonth.setMonth(today.getMonth() + 1);

    const startDate = formatDate(today);
    const endDate = formatDate(nextMonth);

    try {
        const response = await api.getTBillsIssuanceCalendar({
            startDate: startDate, 
            endDate: endDate, 
            auctionTenor: tenor, 
            rows: 10,
            sort: "ann_date asc"});

        console.log(`[getNextTbills] got response of size ${response.result.total}`);
        return new TBillsIssuanceRecord(response.result.records[0]);
    } catch(error) {
        console.log(`[getNextTbills] got error ${error}`);
        return new TBillsIssuanceRecord();
    };
}

const tbillsURL = "https://www.mas.gov.sg/bonds-and-bills/singapore-government-t-bills-information-for-individuals";
function getTBiilsErrorMessage() {
    const message = `💰* Daily T-Bills ${formatDate(getDateNow())}*💰
Current T-Bills information is not available. Please visit ${tbillsURL}`;
    return message;
}

/**
 * Asynchronously retrieves and formats a message containing information about
 * the next and recent T-Bills (Treasury Bills) for a specific tenor (0.5 years).
 *
 * This function fetches the next and recent 6-month T-Bills data using the
 * `getNextTbills` and `getRecentTbills` functions, respectively. It formats 
 * the data into a user-friendly message that includes issue codes, 
 * announcement dates, auction dates, issue dates, and cut-off yields.
 *
 * The message also includes the current date and day of the week.
 *
 * @async
 * @function getTbillsMessage
 * @returns {Promise<string>} A promise that resolves to a formatted message
 * containing details of the next and recent T-Bills.
 *
 * @throws {Error} Throws an error if there is a problem retrieving the T-Bills data.
 * The error is logged, and a predefined error message (`getTBiilsErrorMessage`) is returned
 * in case of failure.
 */
async function getTbillsMessage() {
    let reply;

    const daysOfWeek = [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
    ];
    const today = getDateNow();

    try {
        const nextTbills = await getNextTbills({tenor: 0.5});
        const recentTbills = await getRecentTbills({tenor: 0.5});
        console.log("[index.tbills] got next tbills", nextTbills);
        console.log("[index.tbills] got recent tbills", recentTbills);

        if (nextTbills.issueCode == "" || recentTbills == "") {
            return getTBiilsErrorMessage();
        }

        reply = `💰* Daily T-Bills ${formatDate(today)} (${daysOfWeek[today.getDay()]})* 💰

*Next 6-month T-Bills*
---------------------------------------
*Issue Code:* ${nextTbills.issueCode}
*Announcement Date:* ${nextTbills.announcementDate}
*Auction Date:* ${nextTbills.auctionDate}
*Issue Date:* ${nextTbills.issueDate}
${nextTbills.getURL()}

*Last 6-month T-Bills*
---------------------------------------
*Issue Code:* ${recentTbills.issueCode}
*Auction Date:* ${recentTbills.auctionDate}
*Issue Date:* ${recentTbills.issueDate}
*Cut-off Yield:* ${recentTbills.cutoffYield}
${recentTbills.getURL()}
        `;
        return reply;
      } catch (error) {
        console.log("[index.tbills] error getting tbills", error);
        return getTBiilsErrorMessage();
      }
}

// Export the functions and class
module.exports = {
    MASApiService,
    getRecentTbills,
    getNextTbills,
    getTbillsMessage,
    getTBiilsErrorMessage,
};