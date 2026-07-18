app.controller('PortfolioPerformanceController', ['$scope', '$http', '$q', function($scope, $http, $q) {
    // Configuration
    $scope.prodMode = window.prodMode;
    $scope.accessToken = window.accessToken;

    // State
    $scope.loading = true;
    $scope.error = null;
    $scope.timePeriod = 'quarterly';

    // Data
    $scope.rawData = [];
    $scope.periodData = [];
    $scope.summary = { totalInvestment: 0, totalValue: 0, gain: 0, gainPercent: 0 };
    $scope.fundPerformance = [];

    // Chart instances
    var charts = {};
    var chartFactories = {};
    var canvasToKey = {
        investedValueChart: 'investedValue',
        fundPerformanceChart: 'fundPerformance',
        portfolioMetricsChart: 'portfolioMetrics',
        valueDistributionChart: 'valueDistribution'
    };

    // Format currency
    $scope.formatCurrency = function(value) {
        if (value == null || isNaN(value)) return '₹0';
        return '₹' + Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    // Get quarter label from date
    function getQuarterLabel(date) {
        var d = new Date(date);
        var quarter = Math.ceil((d.getMonth() + 1) / 3);
        return d.getFullYear() + ' Q' + quarter;
    }

    // Get year label from date
    function getYearLabel(date) {
        return new Date(date).getFullYear().toString();
    }

    // Parse API data into fund transactions
    function parseFundData(apiData) {
        var funds = [];
        Object.keys(apiData).forEach(function(fundId) {
            var fund = apiData[fundId];
            if (!fund.portfolio || fund.portfolio.length === 0) return;

            var transactions = [];
            if (fund.transactions) {
                fund.transactions.forEach(function(t) {
                    transactions.push({
                        fundId: fundId,
                        fundName: fund.name,
                        fundType: fund.fundType,
                        family: fund.family,
                        quantity: t.quantity,
                        price: t.price,
                        date: t.date.split('T')[0],
                        type: t.type
                    });
                });
            }
            if (transactions.length > 0) {
                funds.push({
                    fundId: fundId,
                    fundName: fund.name,
                    fundType: fund.fundType,
                    family: fund.family,
                    transactions: transactions,
                    portfolio: fund.portfolio
                });
            }
        });
        return funds;
    }

    // Calculate quarterly/yearly periods from a start date to today
    function generatePeriods(startDate, endDate) {
        var periods = [];
        var current = new Date(startDate);
        var end = new Date(endDate);

        if ($scope.timePeriod === 'quarterly') {
            current.setMonth(Math.floor(current.getMonth() / 3) * 3, 1);
            current.setHours(0, 0, 0, 0);
            while (current <= end) {
                var nextQuarter = new Date(current);
                nextQuarter.setMonth(nextQuarter.getMonth() + 3);
                var periodEnd = new Date(Math.min(nextQuarter - 1, end));
                periods.push({
                    label: getQuarterLabel(current),
                    start: new Date(current),
                    end: periodEnd
                });
                current.setMonth(current.getMonth() + 3);
            }
        } else {
            current = new Date(current.getFullYear(), 0, 1);
            while (current <= end) {
                var nextYear = new Date(current.getFullYear() + 1, 0, 1);
                var periodEnd = new Date(Math.min(nextYear - 1, end));
                periods.push({
                    label: getYearLabel(current),
                    start: new Date(current),
                    end: periodEnd
                });
                current.setFullYear(current.getFullYear() + 1);
            }
        }
        return periods;
    }

// Get NAV history for a fund (uses global fetchApi from DashboardController with 24h localStorage caching)
    function fetchNavHistory(fundId) {
        // Use the global fetchApi from DashboardController.js which handles caching
        if (typeof fetchApi === 'function') {
            return fetchApi(fundId)
                .then(function(response) {
                    // Validate response before parsing
                    if (!response || typeof response !== 'string') {
                        console.warn('Invalid response from fetchApi for ' + fundId, response);
                        return { fundId: fundId, navs: [] };
                    }
                    var body;
                    try {
                        body = JSON.parse(response);
                    } catch (e) {
                        console.warn('Failed to parse NAV response for ' + fundId, response);
                        return { fundId: fundId, navs: [] };
                    }
                    var navs = [];
                    if (body.data && Array.isArray(body.data)) {
                        body.data.forEach(function(entry) {
                            var nav = parseFloat(entry.nav);
                            if (!isNaN(nav)) {
                                navs.push({
                                    date: entry.date.split('-').reverse().join('-'),
                                    nav: nav
                                });
                            }
                        });
                        navs.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
                    }
                    return { fundId: fundId, navs: navs };
                })
                .catch(function(err) {
                    console.warn('Failed to fetch NAV for ' + fundId, err);
                    return { fundId: fundId, navs: [] };
                });
        }

        // Fallback if fetchApi not available (should not happen in normal flow)
        return $http.get('https://api.mfapi.in/mf/' + fundId, { timeout: 15000 })
            .then(function(response) {
                var data = response.data;
                if (!data.data || !Array.isArray(data.data)) {
                    return { fundId: fundId, navs: [] };
                }
                var navs = [];
                data.data.forEach(function(entry) {
                    var nav = parseFloat(entry.nav);
                    if (!isNaN(nav)) {
                        navs.push({
                            date: entry.date.split('-').reverse().join('-'),
                            nav: nav
                        });
                    }
                });
                navs.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
                return { fundId: fundId, navs: navs };
            })
            .catch(function(err) {
                console.warn('Failed to fetch NAV for ' + fundId, err);
                return { fundId: fundId, navs: [] };
            });
    }

    // Get NAV for a specific date (closest on or before)
    function getNavForDate(navs, targetDate) {
        var target = new Date(targetDate);
        var best = null;
        for (var i = 0; i < navs.length; i++) {
            var d = new Date(navs[i].date);
            if (d <= target) {
                best = navs[i].nav;
            } else {
                break;
            }
        }
        return best;
    }

    // Calculate holding quantity at a given date
    function getHoldingAtDate(transactions, targetDate) {
        var target = new Date(targetDate);
        var quantity = 0;
        transactions.forEach(function(t) {
            if (new Date(t.date) <= target) {
                quantity += t.quantity;
            }
        });
        return quantity;
    }

    // Get total net investment at a given date (buy - sell)
    function getNetInvestmentAtDate(transactions, targetDate) {
        var target = new Date(targetDate);
        var investment = 0;
        transactions.forEach(function(t) {
            if (new Date(t.date) <= target) {
                investment += t.quantity * t.price; // quantity is positive for buy, negative for sell
            }
        });
        return investment;
    }

    // Process all funds to build period data
    function processPeriodData(funds, periods, navHistories) {
        var periodMap = {};
        periods.forEach(function(p) {
            periodMap[p.label] = {
                label: p.label,
                investment: 0,
                value: 0,
                funds: {}
            };
        });

        var navMap = {};
        navHistories.forEach(function(h) { navMap[h.fundId] = h.navs; });

        funds.forEach(function(fund) {
            periods.forEach(function(p) {
                var qty = getHoldingAtDate(fund.transactions, p.end);
                if (qty <= 0) return;

                var nav = getNavForDate(navMap[fund.fundId] || [], p.end);
                if (!nav) return;

                var investment = getNetInvestmentAtDate(fund.transactions, p.end);
                var value = qty * nav;

                periodMap[p.label].investment += investment;
                periodMap[p.label].value += value;

                if (!periodMap[p.label].funds[fund.fundId]) {
                    periodMap[p.label].funds[fund.fundId] = {
                        fundId: fund.fundId,
                        fundName: fund.fundName,
                        investment: 0,
                        value: 0
                    };
                }
                periodMap[p.label].funds[fund.fundId].investment += investment;
                periodMap[p.label].funds[fund.fundId].value += value;
            });
        });

        return Object.values(periodMap).filter(function(p) { return p.investment > 0 || p.value > 0; });
    }

    // Calculate fund performance (current)
    function calculateFundPerformance(funds, navMap) {
        var perf = [];
        funds.forEach(function(fund) {
            var navs = navMap[fund.fundId];
            if (!navs || navs.length === 0) return;

            var latestNav = navs[navs.length - 1].nav;
            var totalQty = 0;
            var totalInvestment = 0;
            fund.transactions.forEach(function(t) {
                if (t.quantity > 0) {
                    totalQty += t.quantity;
                    totalInvestment += t.quantity * t.price;
                }
            });
            if (totalQty > 0) {
                var currentValue = totalQty * latestNav;
                var gain = currentValue - totalInvestment;
                var gainPct = totalInvestment > 0 ? (gain / totalInvestment) * 100 : 0;
                perf.push({
                    fundId: fund.fundId,
                    fundName: fund.fundName,
                    investment: totalInvestment,
                    value: currentValue,
                    gainLoss: gain,
                    gainPercent: gainPct
                });
            }
        });
        return perf;
    }

    // Build summary from period data - use FINAL period (current totals), not sum
    function buildSummary(periodData, funds, navMap) {
        if (!periodData || periodData.length === 0) {
            return { totalInvestment: 0, totalValue: 0, gain: 0, gainPercent: 0 };
        }
        
        // Use latest period for current totals
        var latest = periodData[periodData.length - 1];
        var totalInvestment = latest.investment;
        var totalValue = latest.value;
        
        // If period data seems wrong, calculate directly from funds
        if (totalInvestment === 0 && funds) {
            var inv = 0, val = 0;
            funds.forEach(function(f) {
                var navs = navMap[f.fundId];
                if (!navs || navs.length === 0) return;
                var latestNav = navs[navs.length - 1].nav;
                var totalQty = 0, totalInv = 0;
                f.transactions.forEach(function(t) {
                    if (t.quantity > 0) {
                        totalQty += t.quantity;
                        totalInv += t.quantity * t.price;
                    }
                });
                if (totalQty > 0) {
                    inv += totalInv;
                    val += totalQty * latestNav;
                }
            });
            totalInvestment = inv;
            totalValue = val;
        }
        
        var gain = totalValue - totalInvestment;
        var gainPercent = totalInvestment > 0 ? (gain / totalInvestment) * 100 : 0;
        return {
            totalInvestment: totalInvestment,
            totalValue: totalValue,
            gain: gain,
            gainPercent: gainPercent
        };
    }

    // Create charts
    $scope.createCharts = function() {
        $scope.destroyCharts();

        var pd = $scope.periodData;
        if (!pd || pd.length === 0) return;

        var labels = pd.map(function(p) { return p.label; });
        var investments = pd.map(function(p) { return p.investment; });
        var values = pd.map(function(p) { return p.value; });

        // Compute min/max for Y-axis scaling
        var allValues = investments.concat(values).filter(function(v) { return v > 0; });
        var yMin = allValues.length ? Math.min.apply(null, allValues) * 0.95 : 0;
        var yMax = allValues.length ? Math.max.apply(null, allValues) * 1.05 : 1000;

        function createAndStore(key, canvasId, configFactory) {
            var config = configFactory();
            var ctx = document.getElementById(canvasId).getContext('2d');
            charts[key] = new Chart(ctx, config);
            chartFactories[key] = configFactory;
        }

        function getAxisLabel() {
            return $scope.timePeriod === 'quarterly' ? 'Quarter' : 'Year';
        }

        // Fund values for chart 2
        var fundLabels = [...new Set(pd.flatMap(function(p) { return Object.keys(p.funds); }))];
        var fundDatasets = fundLabels.map(function(fundId, idx) {
            var colors = [
                'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)',
                'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)'
            ];
            var color = colors[idx % colors.length];
            var fundName = '';
            for (var i = 0; i < pd.length; i++) {
                if (pd[i].funds[fundId]) { fundName = pd[i].funds[fundId].fundName; break; }
            }
            return {
                label: fundName || fundId,
                data: pd.map(function(p) {
                    return p.funds[fundId] ? p.funds[fundId].value : null;
                }),
                borderColor: color,
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                tension: 0.1,
                fill: false,
                spanGaps: true
            };
        });

        var fundYMin = 0, fundYMax = 1000;
        if (fundDatasets.length > 0) {
            var fundValues = fundDatasets.flatMap(function(d) { return d.data.filter(function(x) { return x !== null && x > 0; }); });
            if (fundValues.length) {
                fundYMin = Math.min.apply(null, fundValues) * 0.95;
                fundYMax = Math.max.apply(null, fundValues) * 1.05;
            }
        }

        // Chart 1: Invested vs Value
        createAndStore('investedValue', 'investedValueChart', function() {
            return {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Invested',
                            data: investments.slice(),
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.1,
                            fill: true
                        },
                        {
                            label: 'Value',
                            data: values.slice(),
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.1)',
                            tension: 0.1,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Invested vs Value Over Time' },
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return ctx.dataset.label + ': ₹' + Math.round(ctx.raw).toLocaleString('en-IN');
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'Amount (₹)' },
                            ticks: { callback: function(v) { return '₹' + v.toLocaleString('en-IN'); } },
                            suggestedMin: yMin,
                            suggestedMax: yMax,
                            beginAtZero: false
                        },
                        x: { title: { display: true, text: getAxisLabel() } }
                    }
                }
            };
        });

        // Chart 2: Fund-wise Performance Over Time (Multi-line)
        if (fundDatasets.length > 0) {
            createAndStore('fundPerformance', 'fundPerformanceChart', function() {
                return {
                    type: 'line',
                    data: { labels: labels, datasets: fundDatasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Fund-wise Value Over Time' },
                            legend: { position: 'top' },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return ctx.dataset.label + ': ₹' + Math.round(ctx.raw).toLocaleString('en-IN');
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                title: { display: true, text: 'Value (₹)' },
                                ticks: { callback: function(v) { return '₹' + v.toLocaleString('en-IN'); } },
                                suggestedMin: fundYMin,
                                suggestedMax: fundYMax,
                                beginAtZero: false
                            },
                            x: { title: { display: true, text: getAxisLabel() } }
                        }
                    }
                };
            });
        }

        // Chart 3: Gain/Loss by Period (per-period delta, not cumulative)
        var gains = [];
        var prevGainLoss = 0;
        pd.forEach(function(p) {
            var cumulativeGL = p.value - p.investment;
            gains.push(cumulativeGL - prevGainLoss);
            prevGainLoss = cumulativeGL;
        });
        var gainColors = gains.map(function(g) { return g >= 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'; });
        var gainBorders = gains.map(function(g) { return g >= 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'; });

        var gainAbsMax = gains.length ? Math.max.apply(null, gains.map(Math.abs)) : 1000;

        createAndStore('portfolioMetrics', 'portfolioMetricsChart', function() {
            return {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gain/Loss',
                        data: gains.slice(),
                        backgroundColor: gainColors.slice(),
                        borderColor: gainBorders.slice(),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Gain/Loss by Period' },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    var v = Math.round(ctx.parsed.y);
                                    return (v >= 0 ? '+' : '') + '₹' + v.toLocaleString('en-IN');
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'Gain/Loss (₹)' },
                            ticks: { callback: function(v) { return (v >= 0 ? '+' : '') + '₹' + v.toLocaleString('en-IN'); } },
                            suggestedMin: -gainAbsMax * 1.1,
                            suggestedMax: gainAbsMax * 1.1,
                            beginAtZero: false
                        },
                        x: { title: { display: true, text: getAxisLabel() } }
                    }
                }
            };
        });

        // Chart 4: Value Distribution (latest period)
        if (pd.length > 0) {
            var latest = pd[pd.length - 1];
            var fundLabels = [];
            var fundValues = [];
            var totalValue = 0;
            Object.values(latest.funds).forEach(function(f) {
                if (f.value > 0) {
                    fundValues.push(f.value);
                    totalValue += f.value;
                }
            });
            Object.values(latest.funds).forEach(function(f, i) {
                if (f.value > 0) {
                    var pct = totalValue > 0 ? ((f.value / totalValue) * 100).toFixed(1) : '0.0';
                    fundLabels.push(f.fundName + ' (' + pct + '%)');
                }
            });
            if (fundLabels.length > 0) {
                createAndStore('valueDistribution', 'valueDistributionChart', function() {
                    return {
                        type: 'doughnut',
                        data: {
                            labels: fundLabels.slice(),
                            datasets: [{
                                label: 'Current Value',
                                data: fundValues.slice(),
                                backgroundColor: [
                                    'rgba(255, 99, 132, 0.8)',
                                    'rgba(54, 162, 235, 0.8)',
                                    'rgba(255, 205, 86, 0.8)',
                                    'rgba(75, 192, 192, 0.8)',
                                    'rgba(153, 102, 255, 0.8)',
                                    'rgba(255, 159, 64, 0.8)'
                                ],
                                borderColor: [
                                    'rgb(255, 99, 132)',
                                    'rgb(54, 162, 235)',
                                    'rgb(255, 205, 86)',
                                    'rgb(75, 192, 192)',
                                    'rgb(153, 102, 255)',
                                    'rgb(255, 159, 64)'
                                ],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                title: { display: true, text: 'Value Distribution (' + latest.label + ')' },
                                legend: { position: 'right' },
                                tooltip: {
                                    callbacks: {
                                        label: function(ctx) {
                                            var total = ctx.chart.data.datasets[0].data.reduce(function(a, b) { return a + b; }, 0);
                                            var pct = ((ctx.raw / total) * 100).toFixed(1);
                                            return ctx.label + ': ₹' + Math.round(ctx.raw).toLocaleString('en-IN') + ' (' + pct + '%)';
                                        }
                                    }
                                }
                            }
                        }
                    };
                });
            }
        }
    };

    // Destroy charts
    $scope.destroyCharts = function() {
        Object.values(charts).forEach(function(chart) {
            if (chart) chart.destroy();
        });
        charts = {};
        chartFactories = {};
    };

    // Expand chart to fullscreen overlay
    var expandedChartInstance = null;
    $scope.expandedChart = null;

    $scope.expandChart = function(canvasId) {
        var key = canvasToKey[canvasId];
        if (!key || !chartFactories[key]) return;

        $scope.expandedChart = key;

        setTimeout(function() {
            var overlayCanvas = document.getElementById('expandedChartCanvas');
            if (!overlayCanvas) return;
            expandedChartInstance = new Chart(overlayCanvas, chartFactories[key]());
        }, 50);
    };

    $scope.collapseChart = function() {
        if (expandedChartInstance) {
            expandedChartInstance.destroy();
            expandedChartInstance = null;
        }
        $scope.expandedChart = null;
    };

    // ESC key to close overlay
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && $scope.expandedChart) {
            $scope.$apply(function() { $scope.collapseChart(); });
        }
    });

    // Time period change handler
    $scope.setTimePeriod = function(period) {
        $scope.timePeriod = period;
        if ($scope.rawData.length > 0) {
            $scope.refreshData();
        }
    };

    // Refresh data
    $scope.refreshData = function() {
        $scope.loading = true;
        $scope.error = null;

        var apiUrl = $scope.prodMode
            ? 'https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/holdings'
            : 'data/api.json';

        var config = {};
        if ($scope.prodMode && $scope.accessToken) {
            config.headers = {
                'Authorization': 'Bearer ' + $scope.accessToken,
                'Content-Type': 'application/json',
                'X-API-KEY': 'CcVLdqEx0s2MR4bsnnIQ19p4mMc1a5ai48HuwZVD'
            };
        }

        $http.get(apiUrl, config)
            .then(function(response) {
                var apiData = response.data && response.data.body && response.data.body.Items
                    ? response.data.body.Items
                    : response.data;
                if (!apiData || Object.keys(apiData).length === 0) {
                    throw new Error('No data returned');
                }

                // Parse funds
                var funds = parseFundData(apiData);
                if (funds.length === 0) {
                    throw new Error('No valid fund data');
                }

                // Store raw data for reference
                $scope.rawData = funds;

                // Find earliest transaction date across all funds
                var earliestDate = null;
                funds.forEach(function(f) {
                    f.transactions.forEach(function(t) {
                        var d = new Date(t.date);
                        if (!earliestDate || d < earliestDate) earliestDate = d;
                    });
                });

                // Generate periods from earliest to today
                var periods = generatePeriods(earliestDate, new Date());

                // Fetch NAV histories in parallel
                var fundIds = [...new Set(funds.map(function(f) { return f.fundId; }))];
                var navPromises = fundIds.map(function(id) { return fetchNavHistory(id); });

                $q.all(navPromises).then(function(navHistories) {
                    // Process period data
                    $scope.periodData = processPeriodData(funds, periods, navHistories);
                    var navMap = navHistories.reduce(function(m, h) { m[h.fundId] = h.navs; return m; }, {});
                    $scope.summary = buildSummary($scope.periodData, funds, navMap);
                    $scope.fundPerformance = calculateFundPerformance(funds, navMap);

                    $scope.loading = false;
                    $scope.createCharts();
                });
            })
            .catch(function(error) {
                console.error('Failed to load data:', error);
                $scope.error = 'Failed to load portfolio data. Using demo data.';
                loadDemoData();
                $scope.loading = false;
                $scope.createCharts();
            });
    };

    // Demo fallback
    function loadDemoData() {
        var now = new Date();
        var labels = [];
        var investments = [];
        var values = [];
        for (var i = 7; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
            labels.push(getQuarterLabel(d));
            investments.push(Math.round(100000 + Math.random() * 50000));
            values.push(Math.round(100000 + Math.random() * 80000));
        }
        $scope.rawData = [{ label: 'demo', data: labels }];
        $scope.periodData = labels.map(function(l, i) {
            return { label: l, investment: investments[i], value: values[i], funds: {} };
        });
        $scope.summary = buildSummary($scope.periodData, [], {});
        $scope.fundPerformance = [
            { fundId: 'F001', fundName: 'Alpha Fund', investment: 100000, value: 125000, gainLoss: 25000, gainPercent: 25 },
            { fundId: 'F002', fundName: 'Beta Fund', investment: 80000, value: 72000, gainLoss: -8000, gainPercent: -10 },
            { fundId: 'F003', fundName: 'Gamma Fund', investment: 50000, value: 55000, gainLoss: 5000, gainPercent: 10 }
        ];
    }

    // Initialize
    function init() {
        $scope.refreshData();
    }

    $scope.$on('$destroy', function() {
        $scope.destroyCharts();
    });

    init();
}], function(error) {
    console.error('Error initializing PortfolioPerformanceController:', error);
    alert('Failed to initialize PortfolioPerformanceController');
});