(function() {
	'use strict';

	var app = angular.module('TrentAngularApp', []);
	app.controller('TrentAngularAppController', ['$scope', '$filter', '$q', function($scope, $filter, $q) {
		
		
	/*this.$onInit = function () {
		$scope.name = 'W Superhero';
		$scope.data = {};
		this.loadFundsData();
	};*/
	
	$scope.numberClass	= function(value) {
		if(value){
			value = Number(value);
			return value >=0 ? "text-success" : "text-danger";
		}
		return "";
	};
	
	
	
	$scope.data	= {};
	$scope.loadFundsDataPromise = function() {
		var deferred = $q.defer();
		var allFundsData = getAllData();
		initaializePortfolioPromise(allFundsData).then((response) => {
			deferred.resolve(response);
		});
		return deferred.promise;
	};
	
	$scope.loadFundsData = function() {
		var promise = $scope.loadFundsDataPromise();
		promise.then(function(response) {
			$scope.data = response;
			console.log(response)
        });		
	};

	$scope.loadFundsData();


	$scope.formatDate = function (date) {
		if (!date) {
			return '';
		}
		let easyDay = $scope.getEasyDay(date);
		if (easyDay) {
			return 'NAV Date : ' + easyDay;
		}
		return (
			'NAV Date : ' + 
			date.getDate() +
			'/' +
			$scope.getMonth(date.getMonth()) +
			'/' +
			(Number(date.getFullYear()) - 2000)
		);
	};

	$scope.getEasyDay = function(date) {
		let today = new Date();
		if (
			today.getFullYear() === date.getFullYear() &&
			today.getMonth() === date.getMonth()
		) {
			if (today.getDate() === date.getDate()) {
				return 'Today';
			}
			if (today.getDate() - 1 === date.getDate()) {
				return 'Yesterday';
			}
			if (today.getDate() - 2 === date.getDate()) {
				return '2 Days ago';
			}
			if (today.getDate() - 3 === date.getDate()) {
				return '3 Days ago';
			}
		}
		return '';
	};
	
	$scope.getMonth = function (month) {
		let monthStr = '';
		switch (month) {
			case 0:
				return 'Jan';
			case 1:
				return 'Feb';
			case 2:
				return 'Mar';
			case 3:
				return 'Apr';
			case 4:
				return 'May';
			case 5:
				return 'Jun';
			case 6:
				return 'Jul';
			case 7:
				return 'Aug';
			case 8:
				return 'Sep';
			case 9:
				return 'Oct';
			case 10:
				return 'Nov';
			case 11:
				return 'Dec';
		}
		return monthStr;
	};



	}]);
})();
