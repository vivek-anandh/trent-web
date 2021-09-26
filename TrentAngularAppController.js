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

	$scope.getAllDataPromise = function() {
	
		return new Promise(function (resolve, reject) {
			try {
				// Creating the XMLHttpRequest object
				var request = new XMLHttpRequest();
				
				var api  = "https://49l6pwddid.execute-api.ap-south-1.amazonaws.com/UAT/funds"; 
				request.open("GET", api);
				request.setRequestHeader("Authorization", "Bearer eyJraWQiOiI2VkhPbnRRS3I5a2tsYjZHRTlseWFKUXlFZjVOdm9yTG9zRFRIYU1MSHVjPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxdjFvN3QyYmExdjNhaWplN2dzajR0NzlqdCIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYWxsLWFwaVwvYXBpIiwiYXV0aF90aW1lIjoxNjMyNjUwODMwLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGgtMS5hbWF6b25hd3MuY29tXC9hcC1zb3V0aC0xX0JKdExSUTMwNiIsImV4cCI6MTYzMjczNzE3MCwiaWF0IjoxNjMyNjUwODMwLCJ2ZXJzaW9uIjoyLCJqdGkiOiI2ODYzZTJjZi02NjczLTQ1OTMtYmYwYy0zNmY5MTk5NjdiY2EiLCJjbGllbnRfaWQiOiIxdjFvN3QyYmExdjNhaWplN2dzajR0NzlqdCJ9.ltXRuksEwR3yK0i2gHq1P2oLsqcAtYEByomQ0lsEMb2At-tl5QAiwFtqdkc_VwF2KS-s3wcigKaZ0RBR6AZnzpjGzrhCS9ZuO01GkVn2bX50-t-lCDJvPsuWVJvkSg6Jx-m4JAzn--C-Ddc2ZhqL4CjHarkp8sRCJVK5iCpp-cIIyrsD9EY1Hfwea89b4pxkPON_q6NnIiJXX6b6ZwA11loKvrBSYlhs7WL6Gmo8cHmGFAYV2G1UHPxsJ4E-przI-R3iZ7Tiq5jeuVK2GmirOOjfyA6geVwLuZMl8MwwO4LXF946bP6657R5IlsOoSIUkdOj__j_SVSOmPPfldtxpw");
				request.setRequestHeader("X-API-KEY", "CcVLdqEx0s2MR4bsnnIQ19p4mMc1a5ai48HuwZVD")

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
	$scope.getAllData = function() {
		var promise = $scope.getAllDataPromise();
		promise.then(function(response) {
			var json = JSON.parse(response);
			$scope.loadFundsData(json.body);
        });		
	};

	$scope.getAllData();


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
