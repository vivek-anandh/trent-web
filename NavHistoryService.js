// NavHistoryService.js
// Shared NAV history fetcher for https://api.mfapi.in/mf/{fundId}
// Caches responses in localStorage until 6:00 AM of each day (expires daily, not a rolling TTL).

var MF_API_BASE_URL = "https://api.mfapi.in/mf/";

function getNext6am() {
    var now = new Date();
    var next6am = new Date(now);
    next6am.setHours(6, 0, 0, 0);
    if (next6am.getTime() <= now.getTime()) {
        next6am.setDate(next6am.getDate() + 1);
    }
    return next6am.getTime();
}

function fetchApi(fundId) {
    return new Promise(function (resolve, reject) {
        try {
            var apiKey = 'nav_hist_' + fundId;

            var cachedApi = localStorage.getItem(apiKey);

            if (cachedApi) {
                cachedApi = JSON.parse(cachedApi);
                var now = Date.now();
                if (cachedApi.expiresAt > now) {
                    resolve(cachedApi.content);
                    return;
                } else {
                    localStorage.removeItem(apiKey);
                    cachedApi = null;
                }
            }

            if (!cachedApi) {
                var request = new XMLHttpRequest();
                var mfApi = MF_API_BASE_URL + fundId;
                request.open("GET", mfApi);

                request.onreadystatechange = function() {
                    if (this.readyState === 4) {
                        if (this.status === 200) {
                            var record = {
                                savedAt: new Date().toISOString(),
                                expiresAt: getNext6am(),
                                content: this.responseText
                            };
                            localStorage.setItem(apiKey, JSON.stringify(record));
                            resolve(this.responseText);
                        } else {
                            reject('HTTP ' + this.status + ': ' + this.statusText);
                        }
                    }
                };

                request.onerror = function() {
                    reject('Network error');
                };

                request.ontimeout = function() {
                    reject('Timeout');
                };

                request.timeout = 15000;

                request.send();
            }
        } catch (e) {
            console.error(e);
            reject('Error in API Call');
        }
    });
}
