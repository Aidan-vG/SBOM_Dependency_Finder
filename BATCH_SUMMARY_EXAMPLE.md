# Batch Trace Summary Feature

## Overview

The batch trace results now include a concise summary section that appears after the statistics and before the detailed results. This provides a quick one-liner overview of each traced dependency with direct links to the Mendix Marketplace.

## Example Output

### Summary Section

Each dependency gets a single line showing:
- **Dependency name**: The JAR library that was traced
- **Relationship**: Direct, transitive, or root module
- **Marketplace module**: Which module contains it (with version)
- **Marketplace link**: Direct link to the component page (when available)

### Sample Summary Lines

```
commons-lang3: Direct dependency of CommunityCommons v10.0.2         [View in Marketplace →]
jackson-databind: Transitive dependency (depth 2) of Email_Connector v5.3.0    [View in Marketplace →]
log4j-core: Not found in SBOM
guava: Transitive dependency (depth 1) of DataGrid v2.15.1          [View in Marketplace →]
freemarker: Direct dependency of EmailTemplate v3.2.1               [View in Marketplace →]
```

## Marketplace Links

When a marketplace module is found, the summary includes a clickable link that opens the module's page in a new tab:

**Format**: `https://marketplace.mendix.com/link/component/{appstorepackageid}`

**Example**: 
- Email Connector (ID: 120739) → `https://marketplace.mendix.com/link/component/120739`
- CommunityCommons (ID: 170) → `https://marketplace.mendix.com/link/component/170`

## How It Works

The component extracts the `appstorepackageid` parameter from the marketplace module's purl:

```
pkg:mendix/Email_Connector@98426?appstorepackageid=120739&type=module
                                 ^^^^^^^^^^^^^^^^^^^^^^
```

If no `appstorepackageid` is found (e.g., for custom modules or very old SBOMs), no link is shown.

## Dependency Types

### Direct Dependency
The JAR is directly included by the marketplace module (depth 1).

**Example**: `commons-lang3: Direct dependency of CommunityCommons v10.0.2`

### Transitive Dependency
The JAR is pulled in through other dependencies (depth > 1).

**Example**: `jackson-core: Transitive dependency (depth 2) of Email_Connector v5.3.0`

### Not Found
The dependency doesn't exist in the SBOM.

**Example**: `xyz-library: Not found in SBOM`

### Orphan Dependency
The component exists but has no path to any marketplace module.

**Example**: `standalone-lib: No marketplace module found (orphan dependency)`

## UI Screenshot Layout

```
╔════════════════════════════════════════════════════════════════════╗
║                     Batch Trace Summary                            ║
╠════════════════════════════════════════════════════════════════════╣
║  Statistics:                                                       ║
║    Total: 5  |  Found: 4  |  Not Found: 1                         ║
║    With Marketplace Paths: 4  |  Without: 0                       ║
║                                                                    ║
║  [Export CSV]  [Export JSON]                                      ║
╠════════════════════════════════════════════════════════════════════╣
║                          Summary                                   ║
╠════════════════════════════════════════════════════════════════════╣
║  commons-lang3: Direct dependency of CommunityCommons v10.0.2     ║
║                                        [View in Marketplace →]    ║
║  jackson-databind: Transitive dependency (depth 2) of Email...    ║
║                                        [View in Marketplace →]    ║
║  log4j-core: Not found in SBOM                                    ║
║  guava: Transitive dependency (depth 1) of DataGrid v2.15.1      ║
║                                        [View in Marketplace →]    ║
║  freemarker: Direct dependency of EmailTemplate v3.2.1            ║
║                                        [View in Marketplace →]    ║
╠════════════════════════════════════════════════════════════════════╣
║                      Detailed Results                              ║
║  [Expandable trees for each dependency...]                        ║
╚════════════════════════════════════════════════════════════════════╝
```

## Benefits

1. **Quick Scanning**: See all results at a glance without expanding details
2. **Direct Action**: Click through to marketplace pages immediately
3. **Context Aware**: Understand whether dependencies are direct or nested
4. **Copy-Friendly**: Text format makes it easy to copy-paste into tickets
5. **Similar to CLI**: Matches the summary format users expect from the command-line tool
