
// for deep-lining urls to pages, use linking in NavigationContainer
function initaializePortfolioPromise(data) {
    return new Promise(function (resolve, reject) {
        let fundIds = [];
        let fundHist = {};
        Object.keys(data).forEach(function (fundId) {
            fundIds.push(fundId);
        });
        let requests = fundIds.map(fundId => navHistPromise(fundId, fundHist));


        Promise.all(requests)
            .then(function (responses) {
                responses.forEach(response => { fundHist[response.fundId] = response.hist; });
                calculatePortfolio(data, fundHist);
                var funds = outputDecorator(data);
                resolve(funds);
            })
            .catch(error => reject('Error while fectching latest NAV history' + error));
    });
}


function outputDecorator(data) {
    let funds = [];
    let response = {};
    response.funds = funds;
    response.totals = {};
    Object.keys(data).forEach(function (fundId) {
        let fund = data[fundId];
        if (fund.isActive) {
            fund.fundId = fundId;
            funds.push(fund);
        }
    });
    funds.sort((a, b) => { return b.investment - a.investment; });

    response.totals.value = 0;
    response.totals.investment = 0;
    response.totals.previousValue = 0;
    funds.map((fund, index) => {
        if (fund.isActive && fund.portfolio.length > 0) {
            fund.portfolio.sort((a, b) => { return b.date - a.date; });
            response.totals.value += Number(fund.value);
            response.totals.investment += fund.investment;
            response.totals.previousValue += Number(fund.previousValue);
			//console.log(fund.portfolio);
        }
    });
    response.totals.net = (response.totals.value - response.totals.investment).toFixed(0);
    response.totals.netP = ((response.totals.value - response.totals.investment) * 100 / response.totals.investment).toFixed(3);
    let previousValueOriginal = response.totals.value - response.totals.previousValue;
    response.totals.previousValueP = ((response.totals.value - previousValueOriginal) * 100 / previousValueOriginal).toFixed(3);

    return response;
}

function sell(fund) {
    //change transaction as sell
    fund.transactions.forEach(function (transaction) {
        if (transaction.quantity < 0) {
            transaction.type = 'sell';
        }
    });



    //sepearte as buy and sell
    let sellRecords = [];
    let buyRecords = [];

    for (let i = 0; i < fund.portfolio.length; i++) {
        if (fund.portfolio[i].quantity > 0) {
            buyRecords.push(fund.portfolio[i]);
        }
        else {
            sellRecords.push(fund.portfolio[i]);
        }
    }

    for (let i = 0; i < sellRecords.length; i++) {
        let sell = sellRecords[i];
        for (let j = 0; j < buyRecords.length; j++) {
            let buy = buyRecords[j];
            if( buy.quantity > (sell.quantity * -1) ) {
                buy.quantity += sell.quantity;
                buy.quantity = Number(buy.quantity.toFixed(4));
	        sell.quantity += buy.quantity;
	        sell.quantity = Number(sell.quantity.toFixed(4));
            }
            else if(buy.quantity < (sell.quantity * -1)) {
                buy.quantity = 0;
	        sell.quantity += buy.quantity;
	        sell.quantity = Number(sell.quantity.toFixed(4));
            }
        }
    }
}


function calculateFund(fund, hist) {
    prepareHistData(hist);
    sell(fund);
    if (fund.portfolio && hist.data.length > 0) {
        fund.investment = 0;
        fund.value = 0;
        fund.previousValue = 0;
        fund.portfolio.forEach(function (item) {
            item.isActive = item.quantity != 0;
            if (item.isActive) {
                item.histPerf = [];
                item.latestNav = hist.data[0].nav;
                item.investment = item.price * item.quantity;
                item.value = item.latestNav * item.quantity;
                fund.investment += item.investment;
                fund.value += item.value;
                calculateFundHist(item, hist);

                fund.previousValue += (item.previousValue ? item.previousValue : 0);
                fund.latestNavDt = hist.data[0].date;
                fund.latestNav = hist.data[0].nav;

                item.net = (item.value - item.investment).toFixed(0);
                item.netP = ((item.value - item.investment) * 100 / item.investment).toFixed(3);

                item.value = item.value.toFixed(0);
                item.investment = item.investment.toFixed(0);
                if (item.previousValue > 0) {
                    item.previousValueP = ((item.value - item.previousValue) * 100 / item.previousValue).toFixed(3);
                }
                else {
                    item.previousValueP = 0;
                }
				
				if(item.previousValue > 0) {
					item.previousValue = (item.value - item.previousValue).toFixed(0);
				}
				else{
					item.previousValue = 0;
				}
            }
        });
        fund.isActive = fund.investment > 0 ? true : false;
        fund.net = (fund.value - fund.investment).toFixed(0);
        fund.netP = ((fund.value - fund.investment) * 100 / fund.investment).toFixed(3);
        fund.previousValueP = ((fund.value - fund.previousValue) * 100 / fund.previousValue).toFixed(3);
        fund.previousValue = (fund.value - fund.previousValue).toFixed(0);
        fund.investment = Number(fund.investment.toFixed(0));
        fund.value = fund.value.toFixed(0);
		
    }
}

function calculateFundHistNav(item, hist, refDates, ref) {
    if (refDates[ref].getTime() === hist.date.getTime()) {
        let refKey = ref + 'Nav';
        let histRef = {};
        histRef.refKey = refKey;
        histRef.nav = hist.nav;
        histRef.value = hist.nav * item.quantity;
        if (refKey === 'previousNav') {
            item.previousValue = histRef.value;
        }
        item.histPerf.push(histRef);
    }
}

function calculateFundHist(item, hist) {
    let refDates = getSummaryDates(hist.data[0].date, hist);
	item.date = new Date(item.date);
    for (var i = 0; i < hist.data.length; i++) {
        if (item.date.getTime() > hist.data[i].date.getTime()) {
            break;
        }

        Object.keys(refDates).forEach(function (ref) {
            calculateFundHistNav(item, hist.data[i], refDates, ref);
        });
    }
}

function prepareHistData(hist) {
    hist.data.forEach(function (data) {
        data.nav = Number(data.nav);
        var dateparts = data.date.split('-');
        var newDateSting = dateparts[2] + '-' + dateparts[1] + '-' + dateparts[0];
        data.date = new Date(newDateSting);
    });

    var data = hist.data;
    data.sort(function (a, b) {
        if (a.date > b.date) {
            return -1;
        }
        else if (a.date < b.date) {
            return 1;
        }
        else {
            return 0;
        }
    });
}

function calculatePortfolio(funds, fundHist) {
    Object.keys(funds).forEach(function (fundId) {
        calculateFund(funds[fundId], fundHist[fundId]);
    });
}

function fetchApi(fundId) {
	
	return new Promise(function (resolve, reject) {
		try {
			// Creating the XMLHttpRequest object
			var request = new XMLHttpRequest();

			
			var mfApi  = "https://api.mfapi.in/mf/" + fundId; 
			// Instantiating the request object
			request.open("GET", mfApi);

			// Defining event listener for readystatechange event
			request.onreadystatechange = function() {
				// Check if the request is compete and was successful
				if(this.readyState === 4 && this.status === 200) {
					// Inserting the response from server into an HTML element
					resolve(this.responseText);
				}
			};

			// Sending the request to the server
			request.send();
			
      } catch (e) {
            console.error(e);
            reject('Error in API Call');
        }
    });		
	

}


function navHistPromise(fundId) {
    return new Promise(function (resolve, reject) {
        try {
            fetchApi(fundId).
                then((response) =>  JSON.parse(response)).
                then((body) => {
                    let response = {};
                    response.fundId = fundId;
                    response.hist = body;
                    resolve(response);
                }).catch((error) => reject(' : Http Invocation Error  : ' + error));
        } catch (e) {
            console.error(e);
            reject('Error in API Call');
        }
    });
}


function getSummaryDates(inDate, hist) {
    var refDates = {};
    var date = inDate ? new Date(inDate) : new Date();

    var previous = new Date(hist.data.length > 1 ? hist.data[1].date : inDate);
    refDates.previous = (previous);

    var lastWeek = new Date(inDate);
    lastWeek.setDate(lastWeek.getDate() - 7);
    refDates.lastWeek = (lastWeek);

    var lastMonth = new Date(date);
    lastMonth.setDate(lastMonth.getDate() - 30);
    refDates.lastMonth = (lastMonth);

    var lastQuarter = new Date(date);
    lastQuarter.setDate(lastQuarter.getDate() - 90);
    refDates.lastQuarter = (lastQuarter);

    var lastHalfYear = new Date(date);
    lastHalfYear.setDate(lastHalfYear.getDate() - 182);
    refDates.lastHalfYear = (lastHalfYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - 365);
    refDates.lastYear = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 2));
    refDates.last2Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 3));
    refDates.last3Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 4));
    refDates.last4Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 5));
    refDates.last5Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 6));
    refDates.last6Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 7));
    refDates.last7Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 8));
    refDates.last8Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 9));
    refDates.last9Year = (lastYear);

    var lastYear = new Date(date);
    lastYear.setDate(lastYear.getDate() - (365 * 10));
    refDates.last10Year = (lastYear);

    return refDates;
}
