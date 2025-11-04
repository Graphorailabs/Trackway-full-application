# Open Source Software (OSS) Compliance Statement

This project includes and depends on several open-source components that are
licensed under permissive, commercially friendly licenses such as Apache-2.0,
MIT, and BSD. These components are used in accordance with their respective
licenses.

## 1. Deployment Model

This application is deployed as a **hosted web service** (SaaS model).  
Users access the running service via a web browser; no distribution of
source code or compiled binaries to end-users occurs.  
Accordingly, under the Apache License 2.0 and similar permissive licenses,
the obligation to redistribute license texts applies **only upon distribution
of copies** of the software, not when the software is merely executed or
served to users over a network.

Because this application is not distributed to end-users, license texts are
**retained in the project repository** and internal build artifacts rather
than bundled into the deployed web output.

## 2. Third-Party Components

All third-party dependencies are managed via package managers such as `npm`
and `cargo`. These tools automatically include license metadata in their
lockfiles and manifest files.

When a dependency requires explicit attribution, the corresponding license
text is preserved under:

```
/licenses/
    └─ serde_kicad_sexpr.txt        (Apache-2.0)
THIRD_PARTY_NOTICES.md
```

These files remain part of the source distribution and any internal build
artifacts, satisfying the "retention of license text" requirement of
the Apache-2.0 license.

## 3. Future Distributions

If this project (or components such as the WASM module) are ever
**distributed** as downloadable binaries, SDKs, or packaged executables
(e.g., Electron or CLI builds), the distribution will include:

- A `LICENSE` file for this project.
- A `THIRD_PARTY_NOTICES.md` enumerating all included open-source components
  and their licenses.
- The full text of each third-party license.

## 4. Summary

- ✅ Current use (SaaS / hosted deployment) – compliant by retaining licenses
  in source repository.
- ⚠️ Future distributions – license texts will be bundled.
- ⚖️ All open-source dependencies used under their original terms.

_Last updated: 2025_
