# `hiddenValue` Function Documentation

---

## Overview

The `hiddenValue` function is a robust utility for managing experiment tracking in A/B/n and CRO tests. It ensures that experiment identifiers and their values are correctly stored and propagated across both "squeeze" pages (pages with a specific hidden field for tracking, e.g., lead forms) and "flow-through" (non-squeeze) pages, using cookies and/or hidden fields as appropriate.

---

## Features

- **Auto-detects** whether the current page is a squeeze page or not.
- **Populates hidden fields** on squeeze pages without writing cookies.
- **Stores experiment data in cookies** on non-squeeze pages for persistence across the site.
- **Handles multiple experiments** running on the same or different pages.
- **Supports special prefix handling** for certain experiment naming conventions.
- **Synchronizes hidden field values** with cookies when needed.
- **Handles dynamically loaded forms** (waits for fields to appear).
- **Configurable for special cases** (squeeze-only, forced flow-through).
- **Defensive coding** with error handling and safe fallbacks.

---

## Parameters

| Name                    | Type      | Default | Description                                                                                   |
|-------------------------|-----------|---------|-----------------------------------------------------------------------------------------------|
| `currentHiddenFieldName`  | `string`  |         | The experiment's unique identifier (e.g., `"SPZ_1038"`).                                      |
| `currentHiddenFieldValue` | `string`  |         | The value to store for the experiment (e.g., `"SPZ_1038_variant1"`).                          |
| `forSqueezPageOnly`       | `boolean` | `false` | If `true`, always treat as a squeeze page (never write cookies).                              |
| `forcedFlowThroughPage`   | `boolean` | `false` | If `true`, always treat as a flow-through page (always write cookies, even if field present). |

---

## Core Logic

### 1. **Squeeze Page Handling**
- If the hidden field is present (or `forSqueezPageOnly` is `true`):
  - **Does not write cookies.**
  - Combines any existing cookie values with the current value, ensuring the current value is last.
  - Injects the combined value into all matching hidden fields in the DOM.
  - Handles dynamically loaded fields by waiting for them to appear.

### 2. **Flow-Through (Non-Squeeze) Page Handling**
- If the hidden field is not present (or `forcedFlowThroughPage` is `true`):
  - **Writes/updates cookies** (`ExperimentName` and `ExperimentValue`).
  - Appends new experiment data, handling special prefixes by removing previous entries with the same prefix.
  - Synchronizes any hidden fields that appear later with the cookie value.

### 3. **Auto Detection**
- By default, waits 2.5 seconds, then checks for the hidden field.
  - If present: runs squeeze logic.
  - If not: runs flow-through logic, but also sets up a watcher to run squeeze logic if the field appears later.

---

## Special Handling

- **Special Prefixes:**  
  Experiments with certain prefixes (e.g., `SPZ_10`, `SPZ_30`) will replace any previous entries with the same prefix in the cookies.
- **Dynamic Forms:**  
  Uses a `waitForElmLoad` helper to handle forms that load after the initial page render.
- **Cookie Management:**  
  Handles creation, updating, and (optionally) deletion of experiment cookies.

---

## Example Usage

### **Basic (Auto Detection)**
```javascript
// Will auto-detect if the page is a squeeze page or not
hiddenValue('SPZ_1038', 'SPZ_1038_variant1');
```

### **Squeeze Page Only**
```javascript
// Will only update the hidden field, never write cookies
hiddenValue('SPZ_1038', 'SPZ_1038_variant1', true);
```

### **Forced Flow-Through Page**
```javascript
// Will always write cookies, even if the hidden field is present
hiddenValue('SPZ_28009', 'SPZ_28009_control', false, true);
```

### **Sitewide and Page-Specific Test Example**
```javascript
if (window.location.pathname === '/en/contact/demo') {
    // Squeeze page test
    hiddenValue('SPZ_1038', 'SPZ_1038_variant1', true);
    // Sitewide test, but on squeeze page, treat as squeeze
    hiddenValue('SPZ_28009', 'SPZ_28009_control', true);
} else {
    // Sitewide test on non-squeeze page
    hiddenValue('SPZ_28009', 'SPZ_28009_control');
}
```

### **Multiple Tests on Same Page**
```javascript
hiddenValue('SPZ_28005', 'SPZ_28005_tc');
hiddenValue('SPZ_28009', 'SPZ_28009_control');
```

---

## Notes & Recommendations

- **For multiple tests on the same page:**  
  Always call `hiddenValue` for each test. The function is designed to handle multiple calls and will merge values as needed.
- **For dynamically loaded forms:**  
  The function will wait for the field to appear and update it when ready.
- **For cookie size management:**  
  If you run many experiments sitewide, consider trimming old entries to avoid exceeding browser cookie limits.
- **For debugging:**  
  Uncomment the `console.log` lines for detailed execution tracing.

---

## Maintenance

- **To change the hidden field selector:**  
  Edit the `hiddenFieldSelector` variable at the top of the function.
- **To change the cookie domain:**  
  Edit the `cookieDomain` variable at the top of the function.
- **To update special prefixes:**  
  Edit the `specialPrefixes` array.

---

## License & Attribution

- **Author:** Abir Maiti  
- **Company:** Spiralyze  
- **Version:** 1.0.0

---