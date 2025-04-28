import { createContext, ReactNode, useContext, useState, useEffect } from 'react';

type CellarsContextType = {
  cellars: string[];
  addCellar: (cellar: string) => void;
};

const CellarsContext = createContext<CellarsContextType | undefined>(undefined);

export function CellarsProvider({ children }: { children: ReactNode }) {
  // Start with Main Cellar as the default option
  const [cellars, setCellars] = useState<string[]>(['Main Cellar']);

  // Load stored cellars from localStorage on component mount
  useEffect(() => {
    const storedCellars = localStorage.getItem('cellars');
    if (storedCellars) {
      try {
        const parsedCellars = JSON.parse(storedCellars);
        // Make sure Main Cellar is always included
        if (!parsedCellars.includes('Main Cellar')) {
          parsedCellars.unshift('Main Cellar');
        }
        setCellars(parsedCellars);
      } catch (error) {
        console.error('Error parsing stored cellars:', error);
      }
    }
  }, []);

  // Save cellars to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('cellars', JSON.stringify(cellars));
  }, [cellars]);

  // Function to add a new cellar
  const addCellar = (cellar: string) => {
    if (!cellars.includes(cellar)) {
      setCellars([...cellars, cellar]);
    }
  };

  return (
    <CellarsContext.Provider value={{ cellars, addCellar }}>
      {children}
    </CellarsContext.Provider>
  );
}

export function useCellars() {
  const context = useContext(CellarsContext);
  if (context === undefined) {
    throw new Error('useCellars must be used within a CellarsProvider');
  }
  return context;
}