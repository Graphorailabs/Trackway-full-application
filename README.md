# Trackway Web

## Development Rules

Developers **must follow** the structure and conventions below:

1. **Feature-based Architecture**
   - All features or application parts **must be placed inside the `src/features` folder**.
   - Anything that needs to be used outside a feature **must be exported through that feature’s `index.ts` file**.

2. **Separation of Responsibility**
   - **UI components** must remain separate from **business logic**.
   - All **state** must be held in **React Contexts**.
   - All **operations on state** must happen through **Service Classes** (not directly inside components).

3. **Component Structure**
   - Break down large UI components into **smaller, reusable components**.
   - Only **main/full pages** are allowed inside the `src/pages` folder.
   - Each page should have its own folder with an `index.tsx` file exporting the final page component.

4. **Constants & Types**
   - Constants should be placed in `constants.ts` either inside a feature folder or globally in `src/`, depending on usage.
   - The `types/` folder can hold shared or non-component prop types. These can exist globally under `src/` or within feature folders.

5. **Electron Compatibility**
   - All code must remain **Electron-friendly** — avoid browser-only APIs unless wrapped with proper environment checks.

---

## Development Commands

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

