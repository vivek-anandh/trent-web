// FundCalcService.js
// Single source of truth for buy/sell (FIFO) matching and realized gain/loss.
// Used by DashboardController (home), PortfolioPerformanceController and FundDetailController.

// Fully-sold threshold: if remaining investment is less than Rs 5 (rounding artifact),
// treat the fund as fully sold.
var GAIN_FULLY_SOLD_THRESHOLD = 5;

// FIFO matching of buys vs sells. Returns realized gain plus the remaining (unsold) buy lots.
// Operates on a deep clone so the source portfolio is never mutated.
function computeFundBreakdown(portfolio) {
    if (!portfolio || portfolio.length === 0) {
        return { realized: 0, remainingBuys: [] };
    }
    var clone = portfolio.map(function(p) {
        return { quantity: p.quantity, price: p.price, date: p.date };
    });
    clone.sort(function(a, b) {
        if (a.date > b.date) return -1;
        else if (a.date < b.date) return 1;
        else return 0;
    });
    var buyRecords = [], sellRecords = [];
    clone.forEach(function(item) {
        if (item.quantity > 0) buyRecords.push(item);
        else sellRecords.push(item);
    });
    buyRecords.reverse();
    var realized = 0;
    for (var i = 0; i < sellRecords.length; i++) {
        var sell = sellRecords[i];
        if (sell.quantity < 0) {
            for (var j = 0; j < buyRecords.length; j++) {
                var buy = buyRecords[j];
                if (buy.quantity >= (sell.quantity * -1)) {
                    realized += ((sell.quantity * -1) * (sell.price - buy.price));
                    buy.quantity += sell.quantity;
                    buy.quantity = Number(buy.quantity.toFixed(4));
                    sell.quantity = 0;
                } else if (buy.quantity < (sell.quantity * -1)) {
                    realized += ((buy.quantity) * (sell.price - buy.price));
                    sell.quantity += buy.quantity;
                    sell.quantity = Number(sell.quantity.toFixed(4));
                    buy.quantity = 0;
                }
            }
        }
    }
    var remainingBuys = buyRecords.filter(function(b) { return b.quantity > 0; });
    return { realized: realized, remainingBuys: remainingBuys };
}

// Remaining (net) investment and quantity for a fund after FIFO matching.
function remainingBasis(breakdown) {
    var qty = 0, cost = 0;
    breakdown.remainingBuys.forEach(function(b) {
        qty += b.quantity;
        cost += b.quantity * b.price;
    });
    return { qty: qty, cost: cost };
}
