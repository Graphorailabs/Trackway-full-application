import { createContext, useContext } from "react";

export const GridContext = createContext({
  gridStep: 1, // default
});

export const useGrid = () => useContext(GridContext);
