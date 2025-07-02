var prodMode = true;
var accessToken  = '';	

// TrentAngularAppController.js or new app.js
var app = angular.module('TrentAngularApp', ['ngRoute']);

function getDateString(d){
	return (d instanceof Date)
                ? d.getFullYear() + '-' +
                  ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                  ('0' + d.getDate()).slice(-2)
                : date
}


app.config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'home.html',
            controller: 'TrentAngularAppController'
        })
        .when('/maintain-book', {
            templateUrl: 'maintain-book.html',
            controller: 'MaintainBookController'
        })
        .when('/maintain-fund', {
            templateUrl: 'maintain-fund.html',
            controller: 'MaintainFundController'
        })
        .otherwise({redirectTo: '/'});
}]);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
    $httpProvider.defaults.headers.common['Content-Type'] = 'application/json';
}]);

app.run(['$rootScope', '$location', function($rootScope, $location) {
    $rootScope.isActive = function(route) {
        return route === $location.path();
    };

    $rootScope.setActive = function(route) {
        $location.path(route);
    };
}]);

app.controller('MaintainBookController', ['$scope', '$http', '$q', function($scope, $http, $q) {
    $scope.books = [];
    $scope.filter = {
        fundId: '',
        date: ''
    };

    // 15 sample books for pagination demo
    var localBooks = [
        { fundId: 101, quantity: 10.5, price: 100.25, date: "2025-06-25" },
        { fundId: 102, quantity: -5.0, price: 200.00, date: "2025-06-24" },
        { fundId: 101, quantity: 7.25, price: 150.75, date: "2025-06-23" },
        { fundId: 103, quantity: 12.0, price: 110.00, date: "2025-06-22" },
        { fundId: 104, quantity: 8.5, price: 120.50, date: "2025-06-21" },
        { fundId: 105, quantity: 15.0, price: 130.00, date: "2025-06-20" },
        { fundId: 106, quantity: 9.0, price: 140.75, date: "2025-06-19" },
        { fundId: 107, quantity: 11.5, price: 150.25, date: "2025-06-18" },
        { fundId: 108, quantity: 13.0, price: 160.00, date: "2025-06-17" },
        { fundId: 109, quantity: 14.5, price: 170.50, date: "2025-06-16" },
        { fundId: 110, quantity: 16.0, price: 180.00, date: "2025-06-15" },
        { fundId: 111, quantity: 17.5, price: 190.25, date: "2025-06-14" },
        { fundId: 112, quantity: 18.0, price: 200.00, date: "2025-06-13" },
        { fundId: 113, quantity: 19.5, price: 210.75, date: "2025-06-12" },
        { fundId: 114, quantity: 20.0, price: 220.00, date: "2025-06-11" }
    ];

    // Pagination variables
    $scope.currentPage = 1;
    $scope.pageSize = 5;

    // Fetch books
    $scope.loadBooks = function () {
        if (window.prodMode) {
            $http.get("https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/book", {
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                }
            })
            .then(function (response) {
                // If API returns { body: [...] }
                $scope.books = response.data && response.data.funds ? response.data.funds.Items : [];
            }, function (error) {
                alert("Failed to load books from API.");
                $scope.books = [];
            });
        } else {
            $scope.books = angular.copy(localBooks);
        }
    };

    // Filter function for ng-repeat
    $scope.bookFilter = function(book) {
        $scope.currentPage = 1;
		var match = true;
        if ($scope.filter.fundId) {
            match = match && (book.fundId == $scope.filter.fundId);
        }
        if ($scope.filter.date) {
            // Convert JS Date object to YYYY-MM-DD string
            var d = $scope.filter.date;
            var dateStr = getDateString(d);
            match = match && (book.date == dateStr);
        }
        return match;
    };

    $scope.clearFilter = function() {
        $scope.filter.fundId = '';
        $scope.filter.date = '';
    };

    // Pagination helpers
    $scope.getPagedBooks = function(filteredBooks) {
        var start = ($scope.currentPage - 1) * $scope.pageSize;
        return filteredBooks.slice(start, start + $scope.pageSize);
    };

    $scope.pageCount = function(filteredBooks) {
        return Math.ceil(filteredBooks.length / $scope.pageSize) || 1;
    };

    $scope.setPage = function(page) {
        $scope.currentPage = page;
    };

    // Inline edit
    $scope.editBook = function(book) {
        book.editing = true;
        book._backup = angular.copy(book);
    };

    // Save after edit
    $scope.saveBook = function(book, delFlag) {
        if (window.prodMode) {
			const record = {
					"fundId": book.fundId.toString(),
					"quantity": book.quantity.toString(),
					"price": book.price.toString(),
					"date": getDateString(book.date)
				};
			if(delFlag) {
				record.action="remove";
			}				
            $http.post("https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/book", record, {
	                headers: {
	                    'Authorization': 'Bearer ' + accessToken,
	                    'Content-Type': 'application/json'
	                }
            	})
                .then(function(response) {
                    book.editing = false;
                    delete book._backup;
                    $scope.loadBooks();
                }, function(error) {
                    alert("Failed to update book.");
                });
        } else {
            book.editing = false;
            delete book._backup;
        }
    };

    // Cancel edit
    $scope.cancelEdit = function(book) {
        if (book._backup) {
            angular.extend(book, book._backup);
            delete book._backup;
        }
        book.editing = false;
    };

    // Modal variables
    $scope.showModal = false;
    $scope.newBook = { fundId: '', quantity: '', price: '', date: '' };

    $scope.openModal = function() {
        $scope.showModal = true;
    };

    $scope.closeModal = function() {
        $scope.showModal = false;
        $scope.newBook = { fundId: '', quantity: '', price: '', date: '' }; // Reset form
    };

    $scope.addBook = function() {
        if (prodMode) {
				const record = {
					"fundId": $scope.newBook.fundId.toString(),
					"quantity": $scope.newBook.quantity.toString(),
					"price": $scope.newBook.price.toString(),
					"date": getDateString($scope.newBook.date)
				};		
            $http.post('https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/book', $scope.newBook, {
	                headers: {
	                    'Authorization': 'Bearer ' + accessToken,
	                    'Content-Type': 'application/json'
	                }
            	})
                .then(function(response) {
                    $scope.books.push(response.data);
                    $scope.closeModal();
                })
                .catch(function(error) {
                    console.error('Error adding book:', error);
                });
        } else {
            $scope.books.push(angular.copy($scope.newBook));
            $scope.closeModal();
        }
    };

    // Initial load
    $scope.loadBooks();
}]);

app.controller('MaintainFundController', ['$scope', '$http', '$q', function($scope, $http, $q) {
    $scope.funds = [];
    $scope.newFund = {};

    // Local fallback data for non-prodMode
    var localFunds = [
        { fund_id: "F001", fund_name: "Alpha Fund", fund_type: "Equity", fund_family: "Family A" },
        { fund_id: "F002", fund_name: "Beta Fund", fund_type: "Debt", fund_family: "Family B" }
    ];

    // Fetch funds
    $scope.loadFunds = function() {
        if (window.prodMode) {
            // Use $http for GET
            $http.get("https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/funds", {
	                headers: {
	                    'Authorization': 'Bearer ' + accessToken,
	                    'Content-Type': 'application/json'
	                }
            	})
                .then(function(response) {
                    // If API returns { body: [...] }
                    $scope.funds = response.data && response.data.funds ? response.data.funds.Items : []
                }, function(error) {
                    alert("Failed to load funds from API.");
                });
        } else {
            // Use local data
            $scope.funds = angular.copy(localFunds);
        }
    };

    // Add a new fund
    $scope.addFund = function() {
        if (window.prodMode) {
            $http.post("https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/funds", $scope.newFund, {
	                headers: {
	                    'Authorization': 'Bearer ' + accessToken,
	                    'Content-Type': 'application/json'
	                }
            	})
                .then(function(response) {
                    $scope.loadFunds();
                    $scope.newFund = {};
                }, function(error) {
                    alert("Failed to add fund.");
                });
        } else {
            $scope.funds.push(angular.copy($scope.newFund));
            $scope.newFund = {};
        }
    };

    // Edit fund (enable editing mode)
    $scope.editFund = function(fund) {
        fund.editing = true;
        fund._backup = angular.copy(fund);
    };

    // Save fund (after editing)
    $scope.saveFund = function(fund, delFlag) {
        if (window.prodMode) {
			const record = {
                        "fundId": fund.fund_id.toString(),
                        "fundName": fund.fund_name,
                        "fundType": fund.fund_type,
                        "fundFamily": fund.fund_family
                    };
			if(delFlag) {
				record.action="remove";
			}				
            // For demo, just POST as add (real API should support PUT/PATCH)
            $http.post("https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/funds", record, {
	                headers: {
	                    'Authorization': 'Bearer ' + accessToken,
	                    'Content-Type': 'application/json'
	                }
            	})
                .then(function(response) {
                    fund.editing = false;
                    delete fund._backup;
                    $scope.loadFunds();
                }, function(error) {
                    alert("Failed to update fund.");
                });
        } else {
            fund.editing = false;
            delete fund._backup;
        }
    };

    // Cancel editing
    $scope.cancelEdit = function(fund) {
        if (fund._backup) {
            angular.extend(fund, fund._backup);
            delete fund._backup;
        }
        fund.editing = false;
    };

    // Initial load
    $scope.loadFunds();

    $scope.showModal = false;

    $scope.openModal = function() {
        $scope.showModal = true;
    };

    $scope.closeModal = function() {
        $scope.showModal = false;
        $scope.newBook = { fundId: '', quantity: '', price: '', date: '' }; // Reset form
    };


}]);
