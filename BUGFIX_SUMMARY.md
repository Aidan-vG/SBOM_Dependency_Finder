# Bug Fixes - Summary

## Bug #1: No Results Message in Search

**Issue:** When searching for components that don't exist in the SBOM, the search panel showed nothing (blank space).

**Fix:** Added "No components found matching '{query}'" message when search returns zero results.

**Files Changed:**
- `src/web/components/SearchPanel.tsx` - Added conditional rendering for empty results
- `src/web/App.css` - Added `.no-results` styling

**Before:**
```
[Search: "xyz"]
[blank space - confusing]
```

**After:**
```
[Search: "xyz"]
No components found matching "xyz"
```

---

## Bug #2: Summary Showing Wrong Component

**Issue:** The batch trace summary was showing the target dependency as the "parent module" instead of the actual marketplace module.

**Example of Bug:**
```
angus-mail: Direct dependency of angus-mail v2.0.4
jakarta.mail: Transitive dependency (depth 1) of jakarta.mail-api v2.1.3
```

**Root Cause:** 
The dependency path array is ordered from target (index 0) to marketplace module (last index). The code was incorrectly accessing `components[0]` (the target) instead of `components[components.length - 1]` (the marketplace module).

**Fix:** Changed both summary generation and CSV export to access the last component in the path array.

**Files Changed:**
- `src/web/components/BatchResults.tsx` 
  - Line 86: Changed `components[0]` to `components[components.length - 1]` in `generateSummaryLine()`
  - Line 41: Changed `components[0]` to `components[components.length - 1]` in `exportCSV()`

**After Fix:**
```
angus-mail: Direct dependency of Email_Connector v5.3.0    [View in Marketplace →]
jakarta.mail: Transitive dependency (depth 1) of Email_Connector v5.3.0    [View in Marketplace →]
```

---

## Technical Notes

### Path Component Order

The `DependencyPath.components` array is structured as:
```
[0] = Target dependency (e.g., angus-mail)
[1] = Intermediate dependency (if any)
[2] = Another intermediate (if any)
...
[n-1] = Marketplace module (e.g., Email_Connector)
```

The CLI formatter reverses this for display (line 53 of `batch-formatter.ts`), but the underlying data structure always goes from target → root.

### References in Codebase

The CLI does this correctly:
```typescript
// src/output/batch-formatter.ts, line 87-89
const rootComponents = completePaths.map(p => {
  const root = p.components[p.components.length - 1];  // ← Correct!
  return root.name + (root.version ? ' v' + root.version : '');
});
```

---

## Testing

**Manual Testing:**
1. ✅ Search for non-existent component → Shows "No components found" message
2. ✅ Batch trace angus-mail and jakarta.mail → Summary shows Email_Connector
3. ✅ Marketplace links point to correct component IDs
4. ✅ CSV export shows correct marketplace module names

**Automated Testing:**
```bash
npm test
# ✓ 24 tests passed
```

**Build Verification:**
```bash
npm run build:web
# ✓ Built successfully in 527ms
```

---

## Deployment

Changes are ready to deploy:
1. Commit the changes
2. Push to main
3. GitHub Actions will automatically build and deploy

No configuration changes or database migrations needed.
