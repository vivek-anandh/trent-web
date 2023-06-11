(function() {
	'use strict';

	var app = angular.module('TrentAngularApp', []);
	app.controller('TrentAngularAppController', ['$scope', '$filter', '$q', function($scope, $filter, $q) {
	var prodMode = true;	



	
	$scope.numberClass	= function(value) {
		if(value){
			value = Number(value);
			return value >=0 ? "text-success" : "text-danger";
		}
		return "";
	};
	
	
	
	$scope.data	= {};
	
	$scope.loadFundsDataPromise = function(allFundsData) {
		var deferred = $q.defer();
		initaializePortfolioPromise(allFundsData).then((response) => {
			deferred.resolve(response);
		});
		return deferred.promise;
	};
	
	$scope.loadFundsData = function(allFundsData) {
		var promise = $scope.loadFundsDataPromise(allFundsData);
		promise.then(function(response) {
			$scope.data = response;
			console.log(response)
        });		
	};

	$scope.getAllDataPromise = function(token) {
	
		return new Promise(function (resolve, reject) {
			try {
				// Creating the XMLHttpRequest object
				var request = new XMLHttpRequest();
				
				var api = "api.json";
				if(prodMode){
					api  = "https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/holdings"; 					
				}
				request.open("GET", api);
				
				if(prodMode){
					request.setRequestHeader("Authorization", "Bearer " + token);
					request.setRequestHeader("X-API-KEY", "CcVLdqEx0s2MR4bsnnIQ19p4mMc1a5ai48HuwZVD")
				}
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

	};
	$scope.getAllData = function(token) {
		var promise = $scope.getAllDataPromise(token);
		promise.then(function(response) {
			var json = JSON.parse(response);
			$scope.loadFundsData(json.body ? json.body : json);
        	});		
	};

	$scope.signInAndLoadScreen = function () {
		if(prodMode) {
			initAuthFlow().then(function(response) {
				$scope.getAllData(response.access_token);
			});	
		}
		else{
			$scope.getAllData();
		}
	};
	
	$scope.signInAndLoadScreen();


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
	
	$scope.showFundDtl = function (fund){
		$scope.fundDtl = fund;
	};


	}]);
})();
