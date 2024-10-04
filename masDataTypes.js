class MASResponse {
    constructor(success, responseData) {
        this.success = success;
        this.result = {
            total: responseData.total || 0,
            records: responseData.records || [],
        };
    }
}

/**
 * T-Bills Issuance Record from MAS
 *
 * @example
 * "issue_code": "BS24120V",
 * "issue_no": "1", 
 * "isin_code": "SGXZ87934956",
 * "issue_type": "T",
 * "raw_tenor": 182.0,
 * "auction_tenor": "0.5",
 * "tenor_unit": "D",
 * "curr": "SGD",
 * "new_reopen": "N",
 * "ann_date": "2024-10-03",
 * "auction_date": "2024-10-10",
 * "issue_date": "2024-10-15",
 * "flag": null,
 * "maturity_date": "2025-04-15",
 * "is_benchmark": "Y",
 * "sgs_type": "U"
 */
class TBillsIssuanceRecord {
    constructor(data = {}) {
        this.issueCode = data.issue_code || '';
        this.issueNo = data.issue_no || '';
        this.isinCode = data.isin_code || '';
        this.issueType = data.issue_type || '';
        this.rawTenor = data.raw_tenor || 0;
        this.auctionTenor = data.auction_tenor || '';
        this.tenorUnit = data.tenor_unit || '';
        this.currency = data.curr || '';
        this.newReopen = data.new_reopen || '';
        this.announcementDate = data.ann_date || '';
        this.auctionDate = data.auction_date || '';
        this.issueDate = data.issue_date || '';
        this.flag = data.flag || '';
        this.maturityDate = data.maturity_date || '';
        this.isBenchmark = data.is_benchmark || '';
        this.sgsType = data.sgsType || '';
    }

    getURL() {
        const baseURL = "https://www.mas.gov.sg/bonds-and-bills/auctions-and-issuance-calendar/auction-t-bill";
        if (this.issueCode && this.issueDate) {
            return `${baseURL}?issue\\_code=${this.issueCode}&issue\\_date=${this.issueDate}`;
        } else {
            return "";
        }
    }
}

/**
 * T-Bills Auction Record from MAS
 *
 * @example
 * "issue_code": "BA21100S",
 * "isin_code": "SGXZ99378911",
 * "issue_no": "1",
 * "reopened_issue": "N",
 * "raw_tenor": 7.0,
 * "auction_tenor": 7.00,
 * "auction_date": "2021-11-02",
 * "issue_date": "2021-11-03",
 * "first_issue_date": "2021-11-03",
 * "bill_bond_ind": "bill",
 * "maturity_date": "2021-11-10",
 * "ann_date": "2021-11-01",
 * "rate": 0.0000,
 * "coupon_date_1": null,
 * "coupon_date_2": null,
 * "product_type": "C",
 * "sgs_type": "U",
 * "total_amt_allot": "50.00000000",
 * "amt_allot_non_cmpt_appls": "0.00000000",
 * "amt_allot_mas": "0.00000000",
 * "pct_cmpt_appls_cutoff": 75.00,
 * "pct_non_cmpt_appls_cutoff": 100.00,
 * "total_bids": 248.90000000,
 * "bid_to_cover": 4.98,
 * "cutoff_yield": 0.40,
 * "cutoff_price": 99.9920,
 * "median_yield": 0.35,
 * "median_price": 99.9930,
 * "avg_yield": 0.34,
 * "avg_price": 99.9930,
 * "auction_amt": 50.00000000,
 * "intended_tender_amt": 0.00000000,
 * "accrued_int": 0.0
 */
class TBillsAuctionRecord {
    constructor(data = {}) {
        this.issueCode = data.issue_code || '';
        this.isinCode = data.isin_code || '';
        this.issueNo = data.issue_no || '';
        this.reopenedIssue = data.reopened_issue || 'N';
        this.rawTenor = data.raw_tenor || 0.0;
        this.auctionTenor = data.auction_tenor || 0.0;
        this.auctionDate = data.auction_date || '';
        this.issueDate = data.issue_date || '';
        this.firstIssueDate = data.first_issue_date || '';
        this.billBondIndicator = data.bill_bond_ind || '';
        this.maturityDate = data.maturity_date || '';
        this.announcementDate = data.ann_date || '';
        this.rate = data.rate || 0.0;
        this.couponDate1 = data.coupon_date_1 || null;
        this.couponDate2 = data.coupon_date_2 || null;
        this.productType = data.product_type || '';
        this.sgsType = data.sgs_type || '';
        this.totalAmountAllot = data.total_amt_allot || '0.0';
        this.amtAllotNonCmptAppls = data.amt_allot_non_cmpt_appls || '0.0';
        this.amtAllotMas = data.amt_allot_mas || '0.0';
        this.pctCmptApplsCutoff = data.pct_cmpt_appls_cutoff || 0.0;
        this.pctNonCmptApplsCutoff = data.pct_non_cmpt_appls_cutoff || 0.0;
        this.totalBids = data.total_bids || 0.0;
        this.bidToCover = data.bid_to_cover || 0.0;
        this.cutoffYield = data.cutoff_yield || 0.0;
        this.cutoffPrice = data.cutoff_price || 0.0;
        this.medianYield = data.median_yield || 0.0;
        this.medianPrice = data.median_price || 0.0;
        this.avgYield = data.avg_yield || 0.0;
        this.avgPrice = data.avg_price || 0.0;
        this.auctionAmount = data.auction_amt || 0.0;
        this.intendedTenderAmount = data.intended_tender_amt || 0.0;
        this.accruedInterest = data.accrued_int || 0.0;
    }
    
    getURL() {
        const baseURL = "https://www.mas.gov.sg/bonds-and-bills/auctions-and-issuance-calendar/auction-t-bill";
        if (this.issueCode && this.issueDate) {
            return `${baseURL}?issue\\_code=${this.issueCode}&issue\\_date=${this.issueDate}`;
        } else {
            return "";
        }
    }
}


// Export the functions and class
module.exports = {
    MASResponse,
    TBillsIssuanceRecord,
    TBillsAuctionRecord
};