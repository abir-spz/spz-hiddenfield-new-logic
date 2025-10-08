/**
 * Function hiddenValue() - SPZ method to set hidden test value in the appropriate field(s) for tracking.
 * 
 * @author Abir Maiti
 * @company Spiralyze LLC
 * @copyright Spiralyze LLC 2025
 * 
 * EXAMPLE(S)
 * - Normal Use (Auto Detection) - hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant'); or hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant', false, false);
 * - Specific for Squeeze Page - hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant', true, false);
 * - Specific for Flow Through Page - hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant', false, true);
 * - Side Wide Test (includes squeeze pages and flow through pages) - Can add conditionals for specific pages and add hidden value
 *      if ( page url contains - squeeze page url )
 *          hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant', true, false);
 *      else if ( page url contains - squeeze page url but should be treated as flow through page )
 *          hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant', false, true);
 *      else ( all other pages - choose auto detection or forced flow through page behavior )
 *          hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant'); or hiddenValue('SPZ_XXXX', 'SPZ_XXXX_variant', false, true);
 *
 * CORE DESCRIPTION AND LOGICAL SUMMARY
 * - On pages that contain a "squeeze" form input (example - .hbspt-form form input[name="cro1"], form input[name="cro1"], form input[name="coveoTestID"], etc.) we DO NOT write cookies.
 * 
 *   Instead we compute a combined value (based on the 'ExperimentValue' cookie, if present)
 *   where the 'currentHiddenFieldValue' is moved to the last position (if present) or appended (if not present)
 *   and inject that combined value into the hidden field(s).
 *
 * - On pages that do NOT contain the hidden field ("Non Squeeze Page" or "Flow Through Page"), we fall back to the original hiddenValue() cookie logic:
 *   create/append 'ExperimentName' and 'ExperimentValue' cookies 
 *   (with original special prefix handling - e.g. ['SPZ_10', 'SPZ_30', 'spz_10', 'spz_30'] kept as is, for additional layer of caution - This is optional and can be excluded).
 *
 * - The function also syncs the form hidden field(s) with the computed value(s).
 *
 * @param {string} currentHiddenFieldName  - current experiment hidden field name (e.g. "SPZ_10xx", "SPZ_20xx")
 * @param {string} currentHiddenFieldValue - current experiment hidden field value (e.g. "SPZ_10xx_variant", "SPZ_20xx_true_control")
 * @param {boolean} forSqueezPageOnly - explicitly declaring that this test is for squeez page only (false - default, true)
 * @param {boolean} forcedFlowThroughPage - explicitly declaring that this test should ignore squeez page even if CRO field may be present in the page (false - default, true)
 */
function hiddenValue(currentHiddenFieldName, currentHiddenFieldValue, forSqueezPageOnly = false, forcedFlowThroughPage = false) {

    /***************************************************************************
     * Local Variable - The main hidden field selector
     * 
     * - Can change from test to test (e.g. .hbspt-form form input[name="cro1"], form input[name="cro1"], form input[name="coveoTestID"], etc.)
     ***************************************************************************/
    var hiddenFieldSelector = 'form input[name="coveoTestID"]';

    /***************************************************************************
     * Local Variable - The domain name of the test (for cookie)
     * 
     * - Can change from test to test (e.g. 'www.coveo.com', '.moorepay.co.uk', '.greenlight.guru')
     ***************************************************************************/
    var cookieDomain = 'www.coveo.com';

    /***************************************************************************
     * Local Variable - Special prefixes original code previously had special handling for.
     * 
     * - This is kept from original code, but in a single place,
     *   so that it can be updated easily as per the test and client.
     * 
     * - This also works as fail safe for storing and removing cookie values.
     ***************************************************************************/
    var specialPrefixes = ['SPZ_10', 'SPZ_30', 'spz_10', 'spz_30'];

    /***************************************************************************
     * Helper Function - safe waiting function for DOM elements to load
     *
     * If a global waitForElmLoad already exists on the page we use it. Otherwise we
     * provide a small fallback that resolves when the selector appears
     * in the DOM (or after a short timeout).
     *
     * Returns a Promise that resolves with the found element (first match).
     ***************************************************************************/
    var waitForElmLoad = window.waitForElmLoad || function (selector) {
        return new Promise(function (resolve) {
            var el = document.querySelector(selector);
            if (el) {
                resolve(el);
                return;  
            }
            var observer = new MutationObserver(function (mutations, obs) {
                var found = document.querySelector(selector);
                if (found) {
                    obs.disconnect();
                    resolve(found);
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });

            // Safety fallback: resolve after 10s if element never appears (prevents hanging)
            setTimeout(function () {
                observer.disconnect();
                resolve(false);
            }, 10000);
        });
    };

    /***************************************************************************
     * Helper Function - cookie setters/getters (same as the original hiddenValue() code)
     *
     * NOTE: domain and expiry behaviour preserved from the original hiddenValue() code
     ***************************************************************************/
    function setCookie(name, value, days) {
        // probably we should have a 1 day or half day default here
        var expires = "";

        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }

        // domain can be dynamic if needed
        document.cookie = name + "=" + (value || "") + expires + "; path=/; domain=" + cookieDomain + ";";
    }

    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie ? document.cookie.split(';') : [];

        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }

        return null;
    }

    /***************************************************************************
     * Utility Function - split a comma-separated string into a cleaned array
     * 
     * - Trims each item and removes empty items.
     ***************************************************************************/
    function csvToArray(csv) {
        if (!csv) return [];
        
        return csv.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    /***************************************************************************
     * Utility Function - join array into comma-separated string (no spaces)
     * 
     * - Returns string
     ***************************************************************************/
    function arrayToCsv(arr) {
        return (arr && arr.length) ? arr.join(',') : '';
    }

    /***************************************************************************
     * Utility Function - merge two lists where items from `toAppend` should end up at the
     * end in the order they appear in `toAppend`, and duplicates are avoided.
     *
     * - preserves order of `base` items that are not in `toAppend`
     * - ensures each item from `toAppend` appears exactly once at the end
     ***************************************************************************/
    function mergeWithAppend(baseArr, toAppendArr) {
        var base = Array.isArray(baseArr) ? baseArr.slice() : [];
        var append = Array.isArray(toAppendArr) ? toAppendArr.slice() : [];

        base = base.filter(function (item) {
            return append.indexOf(item) === -1;
        });

        append.forEach(function (item) {
            base.push(item);
        });

        return base;
    }

    /***************************************************************************
     * Function handleSqueezeCase() - (field present)
     * 
     * SQUEEZE PAGE FOUND - DO NOT store cookies.
     *
     * - Build a "combined" value from the cookie (if any) + the current value,
     *   ensuring the current value ends up at the last position (if present),
     *   otherwise appended.
     * 
     * - Inject this combined value into form inputs without writing cookies.
     ***************************************************************************/
    function handleSqueezeCase() {
        // Local Variable - Read existing cookie values (Can be "null" if no previous data is stored)
        var ExistingHiddenFieldName = getCookie('ExperimentName');
        var ExistingHiddenFieldValue = getCookie('ExperimentValue');

        // Build combined array from cookie and currentHiddenFieldValue
        var combinedArr = [];

        if (ExistingHiddenFieldValue) {
            // Turn cookie value into array, move current value to last (or append)
            var existingArr = csvToArray(ExistingHiddenFieldValue);

            // Remove any existing instances of currentHiddenFieldValue from existingArr
            existingArr = existingArr.filter(function (item) {
                return item !== currentHiddenFieldValue;
            });

            // If 'currentHiddenFieldValue' exists in the cookie, remove it and its corresponding 'ExperimentName' key ( in case of - forSqueezPageOnly - TECH DEBT - not ideal for all usecases, to be improved later)
            if (forSqueezPageOnly) {
                /* try {
                    var expValueCookie = getCookie('ExperimentValue');
                    var expNameCookie = getCookie('ExperimentName');

                    if (expValueCookie && expNameCookie) {
                        var expValueArr = csvToArray(expValueCookie);
                        var expNameArr = csvToArray(expNameCookie);

                        // Find index of currentHiddenFieldValue in ExperimentValue cookie
                        var indexToRemove = expValueArr.indexOf(currentHiddenFieldValue);

                        if (indexToRemove !== -1) {
                            // Remove both the value and its corresponding ExperimentName entry
                            expValueArr.splice(indexToRemove, 1);
                            expNameArr.splice(indexToRemove, 1);

                            // Write updated arrays back to cookies (joined by commas)
                            if (expValueArr.length > 0 && expNameArr.length > 0) {
                                setCookie('ExperimentValue', arrayToCsv(expValueArr), 1);
                                setCookie('ExperimentName', arrayToCsv(expNameArr), 1);
                            } else {
                                // If no other values remain, remove the cookies entirely
                                deleteCookie('ExperimentValue');
                                deleteCookie('ExperimentName');
                            }
                        }
                    }
                } catch (cookieErr) {
                    console.error('Error updating ExperimentValue/ExperimentName cookies:', cookieErr);
                } */
            }

            // Add all existing items first, then currentHiddenFieldValue at end
            existingArr.push(currentHiddenFieldValue);
            combinedArr = existingArr;
        } 
        else {
            // No cookie present - just use the current value (do not write cookie).
            combinedArr = [currentHiddenFieldValue];
        }

        // Delay to match original hiddenValue() behavior of waiting briefly for form framework to initialize
        waitForElmLoad(hiddenFieldSelector).then(function () {
            setTimeout(function () {
                var hiddenFields = document.querySelectorAll(hiddenFieldSelector);
                if (!hiddenFields || hiddenFields.length === 0) return;

                // Combined CSV string (no spaces between commas)
                var combinedCsv = arrayToCsv(combinedArr);

                hiddenFields.forEach(function (hiddenInputField) {
                    try {
                        // Not including previous 'hiddenInputField' value, so that the squeez page test that runs at the last is the only value that appends
                        //var currentFieldCsv = hiddenInputField.value || '';
                        var currentFieldCsv = '';

                        if (currentFieldCsv && currentFieldCsv.trim() !== '') {
                            // If hiddenInputField already has values, merge them so that combinedArr items end up at the end and duplicates are removed.
                            var fieldArr = csvToArray(currentFieldCsv);
                            var finalArr = mergeWithAppend(fieldArr, combinedArr);
                            var finalCsv = arrayToCsv(finalArr);

                            hiddenInputField.value = finalCsv;

                            // If this input is controlled by Vue and exposes setUserInput, update it
                            if (hiddenInputField.__vue__ && typeof hiddenInputField.__vue__.setUserInput === 'function') {
                                hiddenInputField.__vue__.setUserInput(finalCsv);
                            }
                        } 
                        else {
                            // hiddenInputField is empty - set to combined value
                            hiddenInputField.value = combinedCsv;

                            if (hiddenInputField.__vue__ && typeof hiddenInputField.__vue__.setUserInput === 'function') {
                                hiddenInputField.__vue__.setUserInput(combinedCsv);
                            }
                        }
                    } 
                    catch (err) {
                        // Fail softly — do not prevent other form functionality
                        console.error('hiddenValue: error setting squeeze field value', err);
                    }
                });
            }, 1500);
        });
    }

    /***************************************************************************
     * Function handleFlowThroughCase() - (field NOT present)
     * 
     * NON-SQUEEZE PAGE FOUND - fall back to original hiddenValue() cookie logic.
     *
     * Behaviour:
     * - If ExperimentName cookie does not exist, create both cookies with current values.
     * - Else, if cookie exists but does not already include current name/value,
     *   append them (special handling when name starts with SPZ_10 or SPZ_30 variants (special cases)
     *   remove any existing cookie entries that start with those prefixes before appending).
     *
     * Note: checks are written defensively so null cookies won't throw.
     ***************************************************************************/
    function handleFlowThroughCase() {
        // Local Variable - Read existing cookie values (Can be "null" if no previous data is stored)
        var ExistingHiddenFieldName = getCookie('ExperimentName');
        var ExistingHiddenFieldValue = getCookie('ExperimentValue');

        // If no ExperimentName cookie at all - create both cookies
        if (!ExistingHiddenFieldName) {
            setCookie('ExperimentName', currentHiddenFieldName, 1);
            setCookie('ExperimentValue', currentHiddenFieldValue, 1);

        } else {
            // ExperimentName exists - check whether this current name/value pair is already stored.
            var nameAlreadyPresent = ExistingHiddenFieldName && ExistingHiddenFieldName.indexOf(currentHiddenFieldName) !== -1;
            var valueAlreadyPresent = ExistingHiddenFieldValue && ExistingHiddenFieldValue.indexOf(currentHiddenFieldValue) !== -1;

            // If current name or value already exists, move them to the end (reorder cookies - TECH DEBT - not working as expected, need to look into later)
            if (nameAlreadyPresent || valueAlreadyPresent) {
                /* try {
                    var expNameCookie = getCookie('ExperimentName');
                    var expValueCookie = getCookie('ExperimentValue');

                    if (expNameCookie && expValueCookie) {
                        var nameArr = csvToArray(expNameCookie);
                        var valueArr = csvToArray(expValueCookie);

                        // Find index of existing entry
                        var indexToMove = -1;

                        // Prefer matching name first, otherwise fallback to value
                        if (nameArr.indexOf(currentHiddenFieldName) !== -1) {
                            indexToMove = nameArr.indexOf(currentHiddenFieldName);
                        } 
                        else if (valueArr.indexOf(currentHiddenFieldValue) !== -1) {
                            indexToMove = valueArr.indexOf(currentHiddenFieldValue);
                        }

                        if (indexToMove !== -1) {
                            // Remove the existing entries
                            var removedName = nameArr.splice(indexToMove, 1)[0];
                            var removedValue = valueArr.splice(indexToMove, 1)[0];

                            // Append them to the end
                            nameArr.push(removedName);
                            valueArr.push(removedValue);

                            // Save back to cookies (1 day expiry same as original)
                            setCookie('ExperimentName', arrayToCsv(nameArr), 1);
                            setCookie('ExperimentValue', arrayToCsv(valueArr), 1);
                        }
                    }
                } catch (err) {
                    console.error('Error reordering cookies:', err);
                }

                // Exit early since we only needed to reorder
                return; */
            }

            // Only proceed to append if both name and value are not already present
            if (!nameAlreadyPresent && !valueAlreadyPresent) {

                // If the current name starts with any of the special prefixes, remove any existing ExperimentName/Value entries that start with those prefixes, then append the new name/value.
                var isSpecialPrefix = specialPrefixes.some(function (p) {
                    return currentHiddenFieldName.indexOf(p) === 0;
                });

                if (isSpecialPrefix) {
                    // Filter existing values / names to remove anything that starts with special prefixes
                    var existingValueArray = csvToArray(ExistingHiddenFieldValue).filter(function (item) {
                        return !specialPrefixes.some(function (p) { return item.indexOf(p) === 0; });
                    });
                    var existingNameArray = csvToArray(ExistingHiddenFieldName).filter(function (item) {
                        return !specialPrefixes.some(function (p) { return item.indexOf(p) === 0; });
                    });

                    // Compose new cookie values safely (avoid leading/trailing commas)
                    var newNameCsv = arrayToCsv(existingNameArray.length ? existingNameArray.concat([currentHiddenFieldName]) : [currentHiddenFieldName]);
                    var newValueCsv = arrayToCsv(existingValueArray.length ? existingValueArray.concat([currentHiddenFieldValue]) : [currentHiddenFieldValue]);

                    setCookie('ExperimentName', newNameCsv, 1);
                    setCookie('ExperimentValue', newValueCsv, 1);

                } 
                else {
                    // Normal append (no special prefix)
                    var newNames = ExistingHiddenFieldName + ',' + currentHiddenFieldName;
                    var newValues = (ExistingHiddenFieldValue ? ExistingHiddenFieldValue + ',' : '') + currentHiddenFieldValue;
                    setCookie('ExperimentName', newNames, 1);
                    setCookie('ExperimentValue', newValues, 1);
                }
            }
        }

        /***************************************************************************
         * After cookie updates (for non-squeeze pages) we also sync any hidden fields
         * on the page with the ExperimentValue cookie (original hiddenValue() function behaviour).
         *
         * This keeps forms in-sync for cases where the cookie was updated on the page
         * that also has the hidden field (rare in this branch because we are here only
         * if the field is not present when we started, but safe to do).
         ***************************************************************************/
        function setHiddenFieldValue() {
            waitForElmLoad(hiddenFieldSelector).then(function () {
                setTimeout(function () {
                    var fields = document.querySelectorAll(hiddenFieldSelector);
                    if (!fields || fields.length === 0) return;

                    var cookieValue = getCookie('ExperimentValue');

                    if (cookieValue != null) {
                        // Clean cookie into array
                        var cookieArr = csvToArray(cookieValue);

                        fields.forEach(function (field) {
                            try {
                                var currentFieldValue = field.value || '';

                                if (currentFieldValue && currentFieldValue.trim() !== '') {
                                    // Merge existing field values and cookie values so cookie values are appended but duplicates are avoided.
                                    var fieldArr = csvToArray(currentFieldValue);
                                    var finalArr = mergeWithAppend(fieldArr, cookieArr);
                                    var finalCsv = arrayToCsv(finalArr);

                                    field.value = finalCsv;

                                    if (field.__vue__ && typeof field.__vue__.setUserInput === 'function') {
                                        field.__vue__.setUserInput(finalCsv);
                                    }
                                } 
                                else {
                                    // Field empty - set cookie string
                                    var cookieCsv = arrayToCsv(cookieArr);

                                    field.value = cookieCsv;

                                    if (field.__vue__ && typeof field.__vue__.setUserInput === 'function') {
                                        field.__vue__.setUserInput(cookieCsv);
                                    }
                                }
                            } 
                            catch (err) {
                                console.error('hiddenValue: error syncing field value', err);
                            }
                        });
                    }
                }, 1500);
            });
        }

        // Trigger sync attempt (safe even if no fields present)
        setHiddenFieldValue();
    }

    /***************************************************************************
     * MAIN EXECUTION TYPE 1 (enable if only lazy execution needed)
     *
     * Wait for the squeeze field to appear, if it exists.
     * - If it appears (or is present), handle as squeeze page.
     * - Else, handle as non-squeeze page with cookies.
     * 
     * Update - if the test is for Squeez page only, we are directly executing handleSqueezeCase()
     * 
     * Update - if forced flow through is enabled, then execute handleFlowThroughCase() even if CRO field is present
     ***************************************************************************/
    /* if (forSqueezPageOnly) {
        console.log(`%cSqueez Page Only Test - handleSqueezeCase( ${ currentHiddenFieldName }, ${ currentHiddenFieldValue } )`, 'background: #ea4f43; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');
            
        // Field already on page
        handleSqueezeCase();
    }
    else if (forcedFlowThroughPage) {
        console.log(`%cExecute Forced Flow Through Behavior - handleFlowThroughCase( ${ currentHiddenFieldName }, ${ currentHiddenFieldValue } )`, 'background: #3969d1; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');
            
        // Field might be present on the page, but still treat as flow through page
        handleFlowThroughCase();
    }
    else {
        waitForElmLoad(hiddenFieldSelector).then(function (field) {
            if ( field != false ) {
                console.log('%cSqueez Page Found - handleSqueezeCase()', 'background: #4332ff; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');

                // Squeeze field exists - execute squeeze logic
                handleSqueezeCase();
            }
            else {
                console.log('%cNon Squeez Page Found - handleFlowThroughCase()', 'background: #e75a8f; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');

                // Timeout - treat as non-squeeze page
                handleFlowThroughCase();
            }
        });
    } */

    /***************************************************************************
     * MAIN EXECUTION TYPE 2 (enable if both lazy and fast & immediate execution needed as well)
     * 
     * Determine whether the page currently contains the squeeze hidden field.
     * 
     * We check synchronously here (this function assumes you call it at a point
     * where the DOM has the field on squeeze pages). If the field is added later
     * via JS, our waitForElmLoad call below still ensures the field is eventually
     * updated in either flow.
     * 
     * ADDITIONALLY
     * Wait for the squeeze field to appear, if it exists.
     * - If it appears (or is present), handle as squeeze page.
     * - Else, handle as non-squeeze page with cookies.
     * 
     * Update - Added a 2.5s delay intentionally to give some buffer time for the DOM to load
     * 
     * Update - if the test is for Squeez page only, we are directly executing handleSqueezeCase()
     * 
     * Update - if forced flow through is enabled, then execute handleFlowThroughCase() even if CRO field is present
     ***************************************************************************/
    if (forSqueezPageOnly) {
        //console.log(`%cSqueez Page Only Test - handleSqueezeCase( ${ currentHiddenFieldName }, ${ currentHiddenFieldValue } )`, 'background: #ea4f43; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');
            
        // Field already on page
        handleSqueezeCase();
    }
    else if (forcedFlowThroughPage) {
        //console.log(`%cExecute Forced Flow Through Behavior - handleFlowThroughCase( ${ currentHiddenFieldName }, ${ currentHiddenFieldValue } )`, 'background: #3969d1; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');
            
        // Field might be present on the page, but still treat as flow through page
        handleFlowThroughCase();
    }
    else {
        setTimeout(function() {
            var hasHiddenFieldOnPage = !!document.querySelector(hiddenFieldSelector);

            if (!hasHiddenFieldOnPage) {
                // Recheck after a few seconds in case form loads dynamically
                waitForElmLoad(hiddenFieldSelector).then(function (elm) {
                    // The field appeared later - run the squeeze logic now
                    if ( elm != false ) {
                        //console.log(`%cSqueez Page Found - handleSqueezeCase( ${ currentHiddenFieldName }, ${ currentHiddenFieldValue } )`, 'background: #4332ff; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');

                        handleSqueezeCase();
                    }
                });

                //console.log(`%cFlow Through Page Found - handleFlowThroughCase( ${ currentHiddenFieldName }, ${ currentHiddenFieldValue } )`, 'background: #e75a8f; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');

                // Meanwhile continue with the non-squeeze cookie logic (if needed)
                handleFlowThroughCase();
            } 
            else {
                //console.log(`%cSqueez Page Found - handleSqueezeCase( ${ currentHiddenFieldName }, ${ currentHiddenFieldValue } )`, 'background: #4332ff; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 13px; line-height: 18px;  font-weight: 600;');
            
                // Field already on page
                handleSqueezeCase();
            }
        }, 2500);
    }
}
// Do not touch above hidden field code for any Experiment over
