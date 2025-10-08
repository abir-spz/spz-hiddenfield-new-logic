function hiddenValue(currentHiddenFieldName, currentHiddenFieldValue, forSqueezPageOnly = false, forcedFlowThroughPage = false) {
    var hiddenFieldSelector = 'form input[name="coveoTestID"]'; // The main hidden field selector (e.g. .hbspt-form form input[name="cro1"], form input[name="cro1"], form input[name="coveoTestID"], etc.)
    var cookieDomain = 'www.coveo.com'; // The domain name of the test (for cookie) (e.g. 'www.coveo.com', '.moorepay.co.uk', '.greenlight.guru')
    var specialPrefixes = ['SPZ_10', 'SPZ_30', 'spz_10', 'spz_30']; // Special prefixes original code previously had special handling for 

    var waitForElmLoad = window.waitForElmLoad || function (selector) {
        return new Promise(function (resolve) {
            var el = document.querySelector(selector);
            if (el) { resolve(el); return; }
            var observer = new MutationObserver(function (mutations, obs) {
                var found = document.querySelector(selector);
                if (found) { obs.disconnect(); resolve(found); }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(function () { observer.disconnect(); resolve(false); }, 10000);
        });
    };
    function setCookie(e,i,o){var t="";if(o){var n=new Date;n.setTime(n.getTime()+864e5*o),t="; expires="+n.toUTCString()}document.cookie=e+"="+(i||"")+t+"; path=/; domain="+cookieDomain+";"}
    function getCookie(n){for(var t=n+"=",e=document.cookie?document.cookie.split(";"):[],o=0;o<e.length;o++){for(var r=e[o];" "==r.charAt(0);)r=r.substring(1,r.length);if(0==r.indexOf(t))return r.substring(t.length,r.length)}return null}
    function csvToArray(r){return r?r.split(",").map((function(r){return r.trim()})).filter(Boolean):[]}
    function arrayToCsv(arr) {return (arr && arr.length) ? arr.join(',') : '';}
    function mergeWithAppend(r,i){var n=Array.isArray(r)?r.slice():[],e=Array.isArray(i)?i.slice():[];return n=n.filter((function(r){return-1===e.indexOf(r)})),e.forEach((function(r){n.push(r)})),n}
    function handleSqueezeCase() {
        var ExistingHiddenFieldValue = getCookie('ExperimentValue');
        var combinedArr = [];
        if (ExistingHiddenFieldValue) {
            var existingArr = csvToArray(ExistingHiddenFieldValue);
            existingArr = existingArr.filter(function (item) { return item !== currentHiddenFieldValue; });
            existingArr.push(currentHiddenFieldValue);
            combinedArr = existingArr;
        } else combinedArr = [currentHiddenFieldValue];

        waitForElmLoad(hiddenFieldSelector).then(function () {
            setTimeout(function () {
                var hiddenFields = document.querySelectorAll(hiddenFieldSelector);
                if (!hiddenFields || hiddenFields.length === 0) return;
                var combinedCsv = arrayToCsv(combinedArr);
                hiddenFields.forEach(function (hiddenInputField) {
                    try {
                        var currentFieldCsv = '';
                        if (currentFieldCsv && currentFieldCsv.trim() !== '') {
                            var fieldArr = csvToArray(currentFieldCsv);
                            var finalArr = mergeWithAppend(fieldArr, combinedArr);
                            var finalCsv = arrayToCsv(finalArr);
                            hiddenInputField.value = finalCsv;
                            if (hiddenInputField.__vue__ && typeof hiddenInputField.__vue__.setUserInput === 'function')
                                hiddenInputField.__vue__.setUserInput(finalCsv);
                        } else {
                            hiddenInputField.value = combinedCsv;
                            if (hiddenInputField.__vue__ && typeof hiddenInputField.__vue__.setUserInput === 'function')
                                hiddenInputField.__vue__.setUserInput(combinedCsv);
                        }
                    } catch (err) { console.error('hiddenValue: error setting squeeze field value', err); }
                });
            }, 1500);
        });
    }
    function handleFlowThroughCase() {
        var ExistingHiddenFieldName = getCookie('ExperimentName');
        var ExistingHiddenFieldValue = getCookie('ExperimentValue');
        if (!ExistingHiddenFieldName) {
            setCookie('ExperimentName', currentHiddenFieldName, 1);
            setCookie('ExperimentValue', currentHiddenFieldValue, 1);
        } else {
            var nameAlreadyPresent = ExistingHiddenFieldName && ExistingHiddenFieldName.indexOf(currentHiddenFieldName) !== -1;
            var valueAlreadyPresent = ExistingHiddenFieldValue && ExistingHiddenFieldValue.indexOf(currentHiddenFieldValue) !== -1;
            if (!nameAlreadyPresent && !valueAlreadyPresent) {
                var isSpecialPrefix = specialPrefixes.some(function (p) { return currentHiddenFieldName.indexOf(p) === 0; });
                if (isSpecialPrefix) {
                    var existingValueArray = csvToArray(ExistingHiddenFieldValue).filter(function (item) {
                        return !specialPrefixes.some(function (p) { return item.indexOf(p) === 0; });
                    });
                    var existingNameArray = csvToArray(ExistingHiddenFieldName).filter(function (item) {
                        return !specialPrefixes.some(function (p) { return item.indexOf(p) === 0; });
                    });
                    var newNameCsv = arrayToCsv(existingNameArray.length ? existingNameArray.concat([currentHiddenFieldName]) : [currentHiddenFieldName]);
                    var newValueCsv = arrayToCsv(existingValueArray.length ? existingValueArray.concat([currentHiddenFieldValue]) : [currentHiddenFieldValue]);
                    setCookie('ExperimentName', newNameCsv, 1);
                    setCookie('ExperimentValue', newValueCsv, 1);
                } else {
                    var newNames = ExistingHiddenFieldName + ',' + currentHiddenFieldName;
                    var newValues = (ExistingHiddenFieldValue ? ExistingHiddenFieldValue + ',' : '') + currentHiddenFieldValue;
                    setCookie('ExperimentName', newNames, 1);
                    setCookie('ExperimentValue', newValues, 1);
                }
            }
        }
        function setHiddenFieldValue() {
            waitForElmLoad(hiddenFieldSelector).then(function () {
                setTimeout(function () {
                    var fields = document.querySelectorAll(hiddenFieldSelector);
                    if (!fields || fields.length === 0) return;
                    var cookieValue = getCookie('ExperimentValue');
                    if (cookieValue != null) {
                        var cookieArr = csvToArray(cookieValue);
                        fields.forEach(function (field) {
                            try {
                                var currentFieldValue = field.value || '';
                                if (currentFieldValue && currentFieldValue.trim() !== '') {
                                    var fieldArr = csvToArray(currentFieldValue);
                                    var finalArr = mergeWithAppend(fieldArr, cookieArr);
                                    var finalCsv = arrayToCsv(finalArr);
                                    field.value = finalCsv;
                                    if (field.__vue__ && typeof field.__vue__.setUserInput === 'function')
                                        field.__vue__.setUserInput(finalCsv);
                                } else {
                                    var cookieCsv = arrayToCsv(cookieArr);
                                    field.value = cookieCsv;
                                    if (field.__vue__ && typeof field.__vue__.setUserInput === 'function')
                                        field.__vue__.setUserInput(cookieCsv);
                                }
                            } catch (err) { console.error('hiddenValue: error syncing field value', err); }
                        });
                    }
                }, 1500);
            });
        }
        setHiddenFieldValue();
    }
    if (forSqueezPageOnly) handleSqueezeCase();
    else if (forcedFlowThroughPage) handleFlowThroughCase();
    else {
        setTimeout(function () {
            var hasHiddenFieldOnPage = !!document.querySelector(hiddenFieldSelector);
            if (!hasHiddenFieldOnPage) {
                waitForElmLoad(hiddenFieldSelector).then(function (elm) {
                    if (elm != false) handleSqueezeCase();
                });
                handleFlowThroughCase();
            } else handleSqueezeCase();
        }, 2500);
    }
}