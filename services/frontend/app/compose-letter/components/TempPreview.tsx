// This is a helper context to manage template preview state separate from actual selection
import React, { createContext, useContext, useState } from 'react';

interface TempPreviewContextType {
  previewState: {
    backgroundColor: string;
    fontColor: string;
    lineConfig: any;
    fontOpacity: number;
    backgroundOpacity: number;
  } | null;
  setPreviewState: (state: {
    backgroundColor: string;
    fontColor: string;
    lineConfig: any;
    fontOpacity: number;
    backgroundOpacity: number;
  } | null) => void;
  savedState: {
    backgroundColor: string;
    fontColor: string;
    lineConfig: any;
    fontOpacity: number;
    backgroundOpacity: number;
  } | null;
  setSavedState: (state: {
    backgroundColor: string;
    fontColor: string;
    lineConfig: any;
    fontOpacity: number;
    backgroundOpacity: number;
  } | null) => void;
}

export const TempPreviewContext = createContext<TempPreviewContextType | undefined>(undefined);

export const TempPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [previewState, setPreviewState] = useState<{
    backgroundColor: string;
    fontColor: string;
    lineConfig: any;
    fontOpacity: number;
    backgroundOpacity: number;
  } | null>(null);

  const [savedState, setSavedState] = useState<{
    backgroundColor: string;
    fontColor: string;
    lineConfig: any;
    fontOpacity: number;
    backgroundOpacity: number;
  } | null>(null);

  return (
    <TempPreviewContext.Provider value={{ previewState, setPreviewState, savedState, setSavedState }}>
      {children}
    </TempPreviewContext.Provider>
  );
};

export const useTempPreview = () => {
  const context = useContext(TempPreviewContext);
  if (context === undefined) {
    throw new Error('useTempPreview must be used within a TempPreviewProvider');
  }
  return context;
};