app.controller('FundDetailController', ['$scope', '$http', '$routeParams', function($scope, $http, $routeParams) {

    $scope.loading = true;
    $scope.error = null;
    $scope.timePeriod = 'quarterly';
    $scope.range = 5; // years

    $scope.fund = null;
    $scope.transactions = [];

    // Chart instances
    var charts = {};
    var chartFactories = {};
    var canvasToKey = {
        navPerformanceChart: 'navPerformance',
        investedValueChart: 'investedValue'
    };

    $scope.formatCurrency = function(value) {
        if (value == null || isNaN(value)) return '₹0';
        return '₹' + Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    $scope.numberClass = function(value) {
        if (value) {
            value = Number(value);
            return value >= 0 ? 'text-success' : 'text-danger';
        }
        return '';
    };

    $scope.formatDate = function(date) {
        if (!date) return '';
        if (date instanceof Date) {
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
        }
        return String(date);
    };

    $scope.formatTxnDate = function(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        return $scope.formatDate(d);
    };

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

    function getNetInvestmentAtDate(transactions, targetDate) {
        var target = new Date(targetDate);
        var investment = 0;
        transactions.forEach(function(t) {
            if (new Date(t.date) <= target) {
                investment += t.quantity * t.price;
            }
        });
        return investment;
    }

    function getHoldingAtDate(transactions, targetDate) {
        var target = new Date(targetDate);
        var qty = 0;
        transactions.forEach(function(t) {
            if (new Date(t.date) <= target) {
                qty += t.quantity;
            }
        });
        return qty;
    }

    function getQuarterLabel(date) {
        var d = new Date(date);
        var quarter = Math.ceil((d.getMonth() + 1) / 3);
        return d.getFullYear() + ' Q' + quarter;
    }

    function getYearLabel(date) {
        return new Date(date).getFullYear().toString();
    }

    function generatePeriods(timePeriod, rangeYears) {
        var periods = [];
        var now = new Date();
        var start = new Date();
        start.setFullYear(start.getFullYear() - rangeYears);

        if (timePeriod === 'quarterly') {
            var current = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
            while (current <= now) {
                var qEnd = new Date(current.getFullYear(), current.getMonth() + 3, 0);
                if (qEnd > now) qEnd = now;
                periods.push({
                    label: getQuarterLabel(current),
                    start: new Date(current),
                    end: qEnd
                });
                current.setMonth(current.getMonth() + 3);
            }
        } else {
            var current = new Date(start.getFullYear(), 0, 1);
            while (current <= now) {
                var yEnd = new Date(current.getFullYear(), 11, 31);
                if (yEnd > now) yEnd = now;
                periods.push({
                    label: getYearLabel(current),
                    start: new Date(current),
                    end: yEnd
                });
                current.setFullYear(current.getFullYear() + 1);
            }
        }
        return periods;
    }

    function buildPeriodData(transactions, navs, periods) {
        return periods.map(function(p) {
            var qty = getHoldingAtDate(transactions, p.end);
            var nav = getNavForDate(navs, p.end);
            var investment = getNetInvestmentAtDate(transactions, p.end);
            var value = (qty > 0 && nav) ? qty * nav : 0;
            return { label: p.label, investment: investment, value: value, qty: qty, nav: nav };
        }).filter(function(p) { return p.investment !== 0 || p.value > 0; });
    }

    function buildNavData(navs, periods) {
        if (!navs || navs.length === 0) return { labels: [], data: [] };
        var earliest = periods[0] ? periods[0].start : new Date();
        var filtered = navs.filter(function(n) { return new Date(n.date) >= earliest; });
        return {
            labels: filtered.map(function(n) { return n.date; }),
            data: filtered.map(function(n) { return n.nav; })
        };
    }

    // Create charts
    $scope.createCharts = function() {
        $scope.destroyCharts();
        if (!$scope.periodData || $scope.periodData.length === 0) return;

        var pd = $scope.periodData;
        var labels = pd.map(function(p) { return p.label; });
        var investments = pd.map(function(p) { return p.investment; });
        var values = pd.map(function(p) { return p.value; });
        var navs = pd.map(function(p) { return p.nav || 0; });

        function createAndStore(key, canvasId, configFactory) {
            var config = configFactory();
            var el = document.getElementById(canvasId);
            if (!el) return;
            var ctx = el.getContext('2d');
            charts[key] = new Chart(ctx, config);
            chartFactories[key] = configFactory;
        }

        function getAxisLabel() {
            return $scope.timePeriod === 'quarterly' ? 'Quarter' : 'Year';
        }

        // Chart 1: NAV Performance
        if ($scope.navSeries && $scope.navSeries.data.length > 0) {
            var navLabels = $scope.navSeries.labels;
            var navData = $scope.navSeries.data;
            var navMin = Math.min.apply(null, navData) * 0.95;
            var navMax = Math.max.apply(null, navData) * 1.05;

            createAndStore('navPerformance', 'navPerformanceChart', function() {
                return {
                    type: 'line',
                    data: {
                        labels: navLabels,
                        datasets: [{
                            label: 'NAV',
                            data: navData,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.2,
                            fill: true,
                            pointRadius: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'NAV History (' + $scope.range + ' Years)' },
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return 'NAV: ₹' + ctx.parsed.y.toFixed(4);
                                    },
                                    title: function(ctx) {
                                        return new Date(ctx[0].label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                title: { display: true, text: 'NAV (₹)' },
                                ticks: { callback: function(v) { return '₹' + v.toFixed(2); } },
                                suggestedMin: navMin,
                                suggestedMax: navMax,
                                beginAtZero: false
                            },
                            x: {
                                title: { display: true, text: 'Date' },
                                ticks: {
                                    maxTicksLimit: 20,
                                    callback: function(value, index) {
                                        var label = this.getLabelForValue(index);
                                        if (!label) return '';
                                        var d = new Date(label);
                                        return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                                    }
                                }
                            }
                        }
                    }
                };
            });
        }

        // Chart 2: Invested vs Value
        var allValues = investments.concat(values).filter(function(v) { return v > 0; });
        var yMin = allValues.length ? Math.min.apply(null, allValues) * 0.95 : 0;
        var yMax = allValues.length ? Math.max.apply(null, allValues) * 1.05 : 1000;

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
    };

    // Expand/collapse
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

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && $scope.expandedChart) {
            $scope.$apply(function() { $scope.collapseChart(); });
        }
    });

    $scope.destroyCharts = function() {
        Object.values(charts).forEach(function(chart) { if (chart) chart.destroy(); });
        charts = {};
        chartFactories = {};
    };

    // Controls
    $scope.setTimePeriod = function(period) {
        $scope.timePeriod = period;
        rebuildData();
    };

    $scope.setRange = function(years) {
        $scope.range = years;
        rebuildData();
    };

    function rebuildData() {
        if (!$scope.rawNavs || !$scope.fund) return;
        var periods = generatePeriods($scope.timePeriod, $scope.range);
        $scope.periodData = buildPeriodData($scope.fund.transactions, $scope.rawNavs, periods);
        $scope.navSeries = buildNavData($scope.rawNavs, periods);
        $scope.createCharts();
    }

    // Fetch raw NAV history (DD-MM-YYYY format as expected by calculateFund)
    function fetchNavRaw(fundId) {
        var parseRaw = function(responseText) {
            if (!responseText || typeof responseText !== 'string') return null;
            try {
                var body = JSON.parse(responseText);
                if (body.data && Array.isArray(body.data)) {
                    return body; // { data: [{date: "DD-MM-YYYY", nav: "123.45"}, ...] }
                }
                return null;
            } catch (e) {
                return null;
            }
        };

        if (typeof fetchApi === 'function') {
            return fetchApi(fundId)
                .then(function(response) { return parseRaw(response) || { data: [] }; })
                .catch(function() { return { data: [] }; });
        }

        return $http.get('https://api.mfapi.in/mf/' + fundId, { timeout: 15000 })
            .then(function(response) { return response.data && response.data.data ? response.data : { data: [] }; })
            .catch(function() { return { data: [] }; });
    }

    // Load fund data
    function loadFundData() {
        var fundId = $routeParams.fundId;
        if (!fundId) {
            $scope.error = 'No fund ID specified.';
            $scope.loading = false;
            return;
        }

        var apiPath = 'data/api.json';
        if (window.prodMode) {
            apiPath = 'https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/holdings';
        }

        var request = new XMLHttpRequest();
        request.open('GET', apiPath);
        if (window.prodMode) {
            request.setRequestHeader('Authorization', 'Bearer ' + window.accessToken);
            request.setRequestHeader('X-API-KEY', 'CcVLdqEx0s2MR4bsnnIQ19p4mMc1a5ai48HuwZVD');
        }

        request.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    var json = JSON.parse(this.responseText);
                    var body = json.body ? json.body : json;
                    var fundData = body[fundId];

                    if (!fundData) {
                        $scope.$apply(function() {
                            $scope.error = 'Fund not found (ID: ' + fundId + ')';
                            $scope.loading = false;
                        });
                        return;
                    }

                    fundData.fundId = fundId;

                    // Fetch NAV history (raw format for calculateFund)
                    fetchNavRaw(fundId).then(function(rawHist) {
                        $scope.$apply(function() {
                            // Run DashboardController's calculateFund to populate all computed fields
                            if (rawHist && rawHist.data && rawHist.data.length > 0 && typeof calculateFund === 'function') {
                                calculateFund(fundData, rawHist);
                            }

                            $scope.fund = fundData;

                            // Also build processed navs for charts (ascending order)
                            var navs = [];
                            if (rawHist && rawHist.data) {
                                rawHist.data.forEach(function(entry) {
                                    var nav = parseFloat(entry.nav);
                                    if (!isNaN(nav)) {
                                        var dateStr = entry.date;
                                        if (dateStr instanceof Date) {
                                            dateStr = dateStr.getFullYear() + '-' +
                                                ('0' + (dateStr.getMonth() + 1)).slice(-2) + '-' +
                                                ('0' + dateStr.getDate()).slice(-2);
                                        }
                                        navs.push({ date: dateStr, nav: nav });
                                    }
                                });
                                navs.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
                            }

                            $scope.rawNavs = navs;
                            var periods = generatePeriods($scope.timePeriod, $scope.range);
                            $scope.periodData = buildPeriodData(fundData.transactions, navs, periods);
                            $scope.navSeries = buildNavData(navs, periods);
                            $scope.loading = false;
                            setTimeout(function() { $scope.createCharts(); }, 100);
                        });
                    });
                } else {
                    $scope.$apply(function() {
                        $scope.error = 'Failed to load fund data.';
                        $scope.loading = false;
                    });
                }
            }
        };

        request.onerror = function() {
            $scope.$apply(function() {
                $scope.error = 'Network error loading fund data.';
                $scope.loading = false;
            });
        };

        request.send();
    }

    loadFundData();

    $scope.$on('$destroy', function() {
        $scope.destroyCharts();
    });
}]);
