import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useComposeLetter, Preset, ComposeConfig, LineConfig, LineType } from "./ComposeLetterContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TempPreviewProvider, useTempPreview } from "./TempPreview";
import { motion } from 'motion/react'

interface TemplateSidePanelProps {
  open: boolean;
  currentId?: string;
  onSelect: (id: string | null) => void;
  onPreview?: (id: string | null) => void;
  onClose?: () => void;
  thumbSize?: number;
  lineConfig?: LineConfig;
  onLineConfigChange?: (config: LineConfig) => void;
  fontColor?: string;
  onFontColorChange?: (color: string) => void;
  fontOpacity?: number;
  onFontOpacityChange?: (opacity: number) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  backgroundOpacity?: number;
  onBackgroundOpacityChange?: (opacity: number) => void;
  anchorWithinSidebar?: boolean; // when true, overlay absolute inside sidebar like FontSidePanel
  showCloseButton?: boolean; // when false, hide the header X (use parent Sheet close)
}



// Templates are managed via context

// Memoized template item component to avoid unnecessary re-renders
// Use TemplateItem component with React.memo for performance
const TemplateItem = React.memo(({ 
  preset, 
  thumbSize, 
  onSelect, 
  onPreview,
  toggleFavorite,
  deletePreset,
  applyPreset,
  onLineConfigChange,
  onBackgroundColorChange,
  onBackgroundOpacityChange,
  onFontColorChange,
  onFontOpacityChange,
  currentId,
  timeoutsRef
}: { 
  preset: Preset, 
  thumbSize: number,
  onSelect: (id: string | null) => void,
  onPreview?: (id: string | null) => void,
  toggleFavorite: (id: string) => void,
  deletePreset: (id: string) => void,
  applyPreset: (id: string) => Preset | undefined,
  onLineConfigChange?: (config: LineConfig) => void,
  onBackgroundColorChange?: (color: string) => void,
  onBackgroundOpacityChange?: (opacity: number) => void,
  onFontColorChange?: (color: string) => void,
  onFontOpacityChange?: (opacity: number) => void,
  currentId?: string,
  timeoutsRef: React.RefObject<{
    debounce: NodeJS.Timeout | null;
    lineColor: NodeJS.Timeout | null;
    fontOpacity: NodeJS.Timeout | null;
    backgroundOpacity: NodeJS.Timeout | null;
    bgColor: NodeJS.Timeout | null;
    hoverRevert: NodeJS.Timeout | null;
  }>
}) => {
  // Track if this template is being hovered
  const [isHovering, setIsHovering] = React.useState(false);
  return (
    <div className={`border rounded transition-colors ${
        isHovering ? 'border-blue-400 bg-blue-50' : 
        preset.id === currentId ? 'border-amber-500 bg-amber-50' : ''
      }`}>
      <div 
        className="cursor-pointer p-2 relative group"
        onMouseEnter={() => {
          setIsHovering(true);
          onPreview?.(preset.id);
        }}
        onMouseLeave={() => {
          setIsHovering(false);
          onPreview?.(null);
        }}
        onClick={() => {
          // Remove the onSelect call that was closing the panel
          // Just apply the preset without closing the panel
          const appliedPreset = applyPreset(preset.id);
          if (appliedPreset && onLineConfigChange) {
            onLineConfigChange(appliedPreset.config?.pattern?.params || {
              type: 'none',
              spacing: 24,
              thickness: 1,
              color: '#e5e7eb',
              opacity: 0.5,
              rotation: 0
            });
          }
          if (appliedPreset && onBackgroundColorChange) {
            onBackgroundColorChange(appliedPreset.config?.background?.color || '#ffffff');
          }
          if (appliedPreset && onBackgroundOpacityChange) {
            onBackgroundOpacityChange(appliedPreset.config?.background?.opacity || 1);
          }
          if (appliedPreset && onFontColorChange) {
            onFontColorChange(appliedPreset.config?.fontColor || '#000000');
          }
          if (appliedPreset && onFontOpacityChange) {
            onFontOpacityChange(appliedPreset.config?.fontOpacity || 1);
          }
        }}
      >
        <div className="flex justify-center mb-2 relative">
          {/* Removed the Preview tooltip */}
          <div 
            style={{ 
              width: thumbSize, 
              height: thumbSize,
              backgroundColor: preset.config?.background?.color ? `rgba(${parseInt(preset.config.background.color.slice(1, 3), 16)}, ${parseInt(preset.config.background.color.slice(3, 5), 16)}, ${parseInt(preset.config.background.color.slice(5, 7), 16)}, ${preset.config.background.opacity || 1})` : '#ffffff',
              position: 'relative',
              overflow: 'hidden'
            }} 
            className="rounded border border-gray-300 shadow-sm"
          >
            {/* Template preview visualization */}
            <div className="absolute inset-0 flex flex-col p-2">
              {/* Background color already set as the container background */}
              
              {/* Pattern indicator based on line type */}
              {preset.config?.pattern?.type && preset.config.pattern.type !== 'none' && (
                <div className="flex-grow mb-1">
                  {preset.config.pattern.type === 'straight' && (
                    <div className="h-full flex flex-col justify-around">
                      {[...Array(3)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-full" 
                          style={{
                            height: `${Math.min(3, preset.config?.pattern?.params?.thickness || 1)}px`,
                            backgroundColor: preset.config?.pattern?.params?.color || '#cccccc',
                            opacity: preset.config?.pattern?.params?.opacity || 0.5,
                            transform: `rotate(${preset.config?.pattern?.params?.rotation || 0}deg)`
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                  {preset.config.pattern.type === 'dotted' && (
                    <div className="h-full flex items-center justify-center relative overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        <g transform={`rotate(${preset.config?.pattern?.params?.rotation || 0} 50 50)`}>
                          {/* Generate a simple grid of dots for the preview */}
                          {Array.from({ length: 6 }, (_, row) => 
                            Array.from({ length: 6 }, (_, col) => {
                              const spacing = Math.max(10, 16); // Fixed spacing for preview
                              const x = (col - 2.5) * spacing + 50;
                              const y = (row - 2.5) * spacing + 50;
                              // Use thickness directly for radius in preview, scaled down for the small preview
                              const radius = Math.max(1, Math.min(6, (preset.config?.pattern?.params?.thickness || 4) / 2));
                              
                              // Only show dots that are within the viewBox
                              if (x >= 5 && x <= 95 && y >= 5 && y <= 95) {
                                return (
                                  <circle
                                    key={`${row}-${col}`}
                                    cx={x}
                                    cy={y}
                                    r={radius}
                                    fill={preset.config?.pattern?.params?.color || '#cccccc'}
                                    opacity={preset.config?.pattern?.params?.opacity || 0.5}
                                  />
                                );
                              }
                              return null;
                            })
                          ).flat().filter(Boolean)}
                        </g>
                      </svg>
                    </div>
                  )}
                  
                  {preset.config.pattern.type === 'wavy' && (
                    <div className="h-full flex flex-col justify-around">
                      {[...Array(3)].map((_, i) => (
                        <svg key={i} className="w-full h-3" viewBox="0 0 100 10" preserveAspectRatio="none">
                          <path
                            d="M0,5 C10,0 15,10 25,5 C35,0 40,10 50,5 C60,0 65,10 75,5 C85,0 90,10 100,5"
                            fill="none"
                            stroke={preset.config?.pattern?.params?.color || '#cccccc'}
                            strokeWidth={Math.min(3, preset.config?.pattern?.params?.thickness || 1)}
                            style={{ opacity: preset.config?.pattern?.params?.opacity || 0.5 }}
                          />
                        </svg>
                      ))}
                    </div>
                  )}
                  
                  {preset.config.pattern.type === 'zigzag' && (
                    <div className="h-full flex flex-col justify-around">
                      {[...Array(3)].map((_, i) => (
                        <svg key={i} className="w-full h-3" viewBox="0 0 100 10" preserveAspectRatio="none">
                          <polyline
                            points="0,5 10,0 20,10 30,0 40,10 50,0 60,10 70,0 80,10 90,0 100,10"
                            fill="none"
                            stroke={preset.config?.pattern?.params?.color || '#cccccc'}
                            strokeWidth={Math.min(3, preset.config?.pattern?.params?.thickness || 1)}
                            style={{ opacity: preset.config?.pattern?.params?.opacity || 0.5 }}
                          />
                        </svg>
                      ))}
                    </div>
                  )}
                  
                  {preset.config.pattern.type === 'swirls' && (
                    <div className="h-full flex flex-col justify-around">
                      {[...Array(2)].map((_, i) => (
                        <svg key={i} className="w-full h-5" viewBox="0 0 100 20" preserveAspectRatio="none">
                          <path
                            d="M0,10 C10,0 25,20 35,10 S50,0 65,10 S80,20 100,10"
                            fill="none"
                            stroke={preset.config?.pattern?.params?.color || '#cccccc'}
                            strokeWidth={Math.min(3, preset.config?.pattern?.params?.thickness || 1)}
                            style={{ opacity: preset.config?.pattern?.params?.opacity || 0.5 }}
                          />
                        </svg>
                      ))}
                    </div>
                  )}
                  
                  {preset.config.pattern.type === 'arc' && (
                    <div className="h-full flex flex-col justify-around">
                      {[...Array(2)].map((_, i) => (
                        <svg key={i} className="w-full h-5" viewBox="0 0 100 20" preserveAspectRatio="none">
                          <path
                            d="M0,20 Q50,0 100,20"
                            fill="none"
                            stroke={preset.config?.pattern?.params?.color || '#cccccc'}
                            strokeWidth={Math.min(3, preset.config?.pattern?.params?.thickness || 1)}
                            style={{ opacity: preset.config?.pattern?.params?.opacity || 0.5 }}
                          />
                        </svg>
                      ))}
                    </div>
                  )}
                  
                  {preset.config.pattern.type === 'spiral' && (
                    <div className="h-full flex justify-center items-center">
                      <svg className="w-10 h-10" viewBox="0 0 50 50">
                        <path
                          d="M25,25 m0,-20 a20,20 0 1,1 0,40 a20,20 0 1,1 0,-40 m0,3 a17,17 0 1,0 0,34 a17,17 0 1,0 0,-34 m0,3 a14,14 0 1,1 0,28 a14,14 0 1,1 0,-28 m0,3 a11,11 0 1,0 0,22 a11,11 0 1,0 0,-22 m0,3 a8,8 0 1,1 0,16 a8,8 0 1,1 0,-16 m0,3 a5,5 0 1,0 0,10 a5,5 0 1,0 0,-10 m0,3 a2,2 0 1,1 0,4 a2,2 0 1,1 0,-4"
                          fill="none"
                          stroke={preset.config?.pattern?.params?.color || '#cccccc'}
                          strokeWidth={Math.min(2, preset.config?.pattern?.params?.thickness || 1)}
                          style={{ opacity: preset.config?.pattern?.params?.opacity || 0.5 }}
                        />
                      </svg>
                    </div>
                  )}
                  
                  {preset.config.pattern.type === 'floral' && (
                    <div className="h-full flex justify-center items-center">
                      <svg className="w-12 h-12" viewBox="0 0 50 50">
                        <g
                          fill="none"
                          stroke={preset.config?.pattern?.params?.color || '#cccccc'}
                          strokeWidth={Math.min(1.5, preset.config?.pattern?.params?.thickness || 1)}
                          style={{ opacity: preset.config?.pattern?.params?.opacity || 0.5 }}
                        >
                          <path d="M25,10 C30,15 35,15 40,10 C35,20 35,25 40,30 C30,25 25,25 20,30 C25,20 25,15 20,10 C25,15 30,15 35,10" />
                          <path d="M25,10 C20,15 15,15 10,10 C15,20 15,25 10,30 C20,25 25,25 30,30 C25,20 25,15 30,10 C25,15 20,15 15,10" />
                          <circle cx="25" cy="20" r="3" />
                        </g>
                      </svg>
                    </div>
                  )}
                </div>
              )}
              
              {/* Text color indicator */}
              <div 
                className="text-center font-serif text-xs font-bold"
                style={{
                  color: preset.config?.fontColor || '#000000',
                  opacity: preset.config?.fontOpacity || 1
                }}
              >
                Aa
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-center font-medium truncate px-1">{preset.name}</div>
        <div className="flex justify-center space-x-2 mt-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(preset.id);
            }}
            className="text-gray-500 hover:text-amber-500 p-1"
          >
            {preset.isFavorite ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-yellow-400">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            )}
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-gray-500 hover:text-red-500 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  template &quot;{preset.name}&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePreset(preset.id);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
});

// Add display name
TemplateItem.displayName = 'TemplateItem';

export default function TemplateSidePanel({
  open,
  currentId,
  onSelect,
  onPreview,
  onClose,
  thumbSize = 80,
  lineConfig: propLineConfig,
  onLineConfigChange,
  fontColor = "#000000",
  onFontColorChange,
  fontOpacity = 1,
  onFontOpacityChange,
  backgroundColor = "#ffffff",
  onBackgroundColorChange,
  backgroundOpacity = 1,
  onBackgroundOpacityChange,
  anchorWithinSidebar = false,
  showCloseButton = true,
}: TemplateSidePanelProps) {
  const [lineConfig, setLineConfig] = useState<LineConfig>({
    type: 'none',
    spacing: 24,
    thickness: 1,
    color: '#e5e7eb',
    opacity: 0.5,
    rotation: 0,
    ...propLineConfig
  });
  // Sync external prop updates
  useEffect(() => {
    if (propLineConfig) setLineConfig(propLineConfig);
  }, [propLineConfig]);
  // Local state for background color
  const [localBackgroundColor, setLocalBackgroundColor] = useState(backgroundColor);
  
  useEffect(() => {
    setLocalBackgroundColor(backgroundColor);
  }, [backgroundColor]);
  
  // Debounced background change
  const handleBackgroundColorChange = useCallback((color: string) => {
    // Update local state immediately
    setLocalBackgroundColor(color);
    
    if (timeoutsRef.current.bgColor) clearTimeout(timeoutsRef.current.bgColor);
    timeoutsRef.current.bgColor = setTimeout(() => {
      onBackgroundColorChange?.(color);
    }, 100);
  }, [onBackgroundColorChange]);

  // Touch gesture handling for mobile drag-to-close
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY === null) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY;

    // Only allow downward dragging
    if (deltaY > 0) {
      setTouchCurrentY(currentY);
      setIsDragging(true);
      e.preventDefault(); // Prevent scrolling
    }
  }, [touchStartY]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || touchStartY === null || touchCurrentY === null) {
      setTouchStartY(null);
      setTouchCurrentY(null);
      setIsDragging(false);
      return;
    }

    const deltaY = touchCurrentY - touchStartY;

    // Close panel if dragged down more than 100px
    if (deltaY > 100) {
      onClose?.();
    }

    setTouchStartY(null);
    setTouchCurrentY(null);
    setIsDragging(false);
  }, [isDragging, touchStartY, touchCurrentY, onClose]);

  // Calculate drag distance for visual feedback
  const dragDistance = touchStartY && touchCurrentY ? Math.max(0, touchCurrentY - touchStartY) : 0;
  const dragOpacity = Math.max(0.7, 1 - (dragDistance / 200)); // Fade out as dragged down
  const dragTransform = dragDistance > 0 ? `translateY(${dragDistance * 0.3}px)` : 'translateY(0px)';
  // Refs for scroll-triggered animations
  const presetsRef = useRef<HTMLDivElement>(null);
  const fontColorRef = useRef<HTMLDivElement>(null);
  const backgroundColorRef = useRef<HTMLDivElement>(null);
  const pageLinesRef = useRef<HTMLDivElement>(null);
  
  // State for tracking which sections are visible
  const [visibleSections, setVisibleSections] = useState({
    presets: true, // Start with presets visible
    fontColor: false,
    backgroundColor: false,
    pageLines: false,
  });

  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-50px 0px -50px 0px', // Trigger when element is 50px from viewport
      threshold: 0.1,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.getAttribute('data-section');
        if (entry.isIntersecting && sectionId) {
          setVisibleSections(prev => ({
            ...prev,
            [sectionId]: true,
          }));
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    if (presetsRef.current) observer.observe(presetsRef.current);
    if (fontColorRef.current) observer.observe(fontColorRef.current);
    if (backgroundColorRef.current) observer.observe(backgroundColorRef.current);
    if (pageLinesRef.current) observer.observe(pageLinesRef.current);

    return () => observer.disconnect();
  }, []);
  
  // Inactivity detection
  useEffect(() => {
    if (!open) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      setIsFading(false);
      inactivityTimerRef.current = setTimeout(() => {
        setIsFading(true);
        // Close after fade animation
        setTimeout(() => {
          onClose?.();
        }, 300); // Match animation duration
      }, 5000); // 5 seconds
    };

    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keydown', 'touchstart', 'touchmove'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer(); // Start timer initially

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [open, onClose]);
  
  // Ensure we're showing the correct template when component first loads
  // This ensures we start with the right template state
  useEffect(() => {
    // When the panel opens or the currentId changes, make sure the preview shows the current template
    if (open && currentId) {
      onPreview?.(currentId);
    }
  }, [open, currentId, onPreview]);
  // Preset context
  const { presets, applyPreset, savePreset, deletePreset, toggleFavorite } = useComposeLetter();
  const [activeTab, setActiveTab] = useState<'all'|'favorites'|'recent'>('favorites');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Initial number of templates to display
  const INITIAL_TEMPLATE_COUNT = 4;
  const [visibleCount, setVisibleCount] = useState(INITIAL_TEMPLATE_COUNT);
  
  const filteredPresets = useMemo(() => {
    let list = presets;
    // Apply tab filtering
    if (activeTab === 'favorites') list = presets.filter(p => p.isFavorite);
    else if (activeTab === 'recent') list = [...presets].sort((a,b) => b.updatedAt - a.updatedAt).slice(0,12);
    
    // Apply search filtering if there is a search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(term)
      );
    }
    
    return list;
  }, [presets, activeTab, searchTerm]);
  
  // Reset visible count when tab or search changes
  useEffect(() => {
    setVisibleCount(INITIAL_TEMPLATE_COUNT);
  }, [activeTab, searchTerm, INITIAL_TEMPLATE_COUNT]);

  // Consolidated timeouts using a single object for all debounced operations
  const timeoutsRef = useRef<{
    debounce: NodeJS.Timeout | null;
    lineColor: NodeJS.Timeout | null;
    fontOpacity: NodeJS.Timeout | null;
    backgroundOpacity: NodeJS.Timeout | null;
    bgColor: NodeJS.Timeout | null;
    hoverRevert: NodeJS.Timeout | null;
  }>({
    debounce: null,
    lineColor: null,
    fontOpacity: null,
    backgroundOpacity: null,
    bgColor: null,
    hoverRevert: null
  });
  
  const handleLineConfigChange = useCallback((newConfig: Partial<LineConfig>) => {
    const updatedConfig = { ...lineConfig, ...newConfig };
    setLineConfig(updatedConfig);
    
    // If this is an opacity change, use a shorter debounce
    if ('opacity' in newConfig) {
      if (timeoutsRef.current.debounce) {
        clearTimeout(timeoutsRef.current.debounce);
      }
      timeoutsRef.current.debounce = setTimeout(() => {
        onLineConfigChange?.(updatedConfig);
      }, 50);
    } else {
      // For other changes, update immediately
      onLineConfigChange?.(updatedConfig);
    }
  }, [lineConfig, onLineConfigChange]);

  const [localFontColor, setLocalFontColor] = useState(fontColor);
  
  useEffect(() => {
    setLocalFontColor(fontColor);
  }, [fontColor]);
  
  const handleFontColorChange = useCallback((color: string) => {
    // Update local state immediately
    setLocalFontColor(color);
    
    if (timeoutsRef.current.debounce) {
      clearTimeout(timeoutsRef.current.debounce);
    }
    timeoutsRef.current.debounce = setTimeout(() => {
      onFontColorChange?.(color);
    }, 100); // Reduced debounce time for better responsiveness
  }, [onFontColorChange]);

  const [localFontOpacity, setLocalFontOpacity] = useState(fontOpacity);
  const [localBackgroundOpacity, setLocalBackgroundOpacity] = useState(backgroundOpacity);

  // Update local state when props change
  useEffect(() => {
    setLocalFontOpacity(fontOpacity);
  }, [fontOpacity]);

  useEffect(() => {
    setLocalBackgroundOpacity(backgroundOpacity);
  }, [backgroundOpacity]);

  const handleFontOpacityChange = useCallback((opacity: number) => {
    // Update local state immediately for a responsive feel
    setLocalFontOpacity(opacity);
    
    // Debounce the actual update to parent component
    if (timeoutsRef.current.fontOpacity) {
      clearTimeout(timeoutsRef.current.fontOpacity);
    }
    timeoutsRef.current.fontOpacity = setTimeout(() => {
      onFontOpacityChange?.(opacity);
    }, 50); // Reduced timeout for better responsiveness
  }, [onFontOpacityChange]);

  const handleBackgroundOpacityChange = useCallback((opacity: number) => {
    // Update local state immediately for a responsive feel
    setLocalBackgroundOpacity(opacity);
    
    // Debounce the actual update to parent component
    if (timeoutsRef.current.backgroundOpacity) {
      clearTimeout(timeoutsRef.current.backgroundOpacity);
    }
    timeoutsRef.current.backgroundOpacity = setTimeout(() => {
      onBackgroundOpacityChange?.(opacity);
    }, 50); // Reduced timeout for better responsiveness
  }, [onBackgroundOpacityChange]);

  const handleLineColorChange = useCallback((color: string) => {
    if (timeoutsRef.current.lineColor) {
      clearTimeout(timeoutsRef.current.lineColor);
    }
    timeoutsRef.current.lineColor = setTimeout(() => {
      handleLineConfigChange({ color });
    }, 250); // 250ms debounce for line color
  }, [handleLineConfigChange]);

  const handleLineTypeChange = useCallback((type: LineConfig['type']) => {
    const newConfig: Partial<LineConfig> = { type };
    
    // Set default blue color when switching from 'none' to any line type
    if (type !== 'none' && lineConfig.type === 'none') {
      newConfig.color = '#3b82f6'; // Blue color
    }
    
    // Set default thickness when switching to dotted type
    if (type === 'dotted') {
      newConfig.thickness = lineConfig.thickness || 4; // Use existing thickness or default
    }
    
    handleLineConfigChange(newConfig);
  }, [lineConfig.type, lineConfig.thickness, handleLineConfigChange]);

  // Removed duplicate cleanup as it's now handled by the single cleanup effect above


  const [templateName, setTemplateName] = useState('');
  const [templateNameError, setTemplateNameError] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSaveTemplate = () => {
    if (templateName.trim().length < 4) {
      setTemplateNameError('Template name must be at least 4 characters long.');
      return;
    }

    const config: ComposeConfig = {
      background: {
        color: backgroundColor,
        filterKey: '',
        opacity: backgroundOpacity,
      },
      pattern: {
        type: lineConfig.type,
        params: lineConfig,
      },
      patternBlendMode: 'normal',
      fontColor: fontColor,
      fontOpacity: fontOpacity,
    };

    savePreset(templateName, config);
    setTemplateName('');
    setTemplateNameError('');
    setIsSaveDialogOpen(false);
  };

  const baseClasses = anchorWithinSidebar
    ? 'absolute inset-0 w-full h-full bg-white backdrop-blur-sm border-r border-amber-200 shadow-lg flex flex-col z-50'
    : 'w-full h-full bg-white border-0 shadow-none flex flex-col min-h-0';

  return (
    <motion.div 
      className={baseClasses}
      initial={{ x: 0 }}
      animate={{ x: isFading ? -300 : 0, opacity: isFading ? 0 : 1 }}
      transition={{ duration: 0.3 }}
      style={{
        opacity: isDragging ? dragOpacity : 1,
        transform: isDragging ? dragTransform : 'translateY(0px)',
        transition: isDragging ? 'none' : 'opacity 0.2s ease-out, transform 0.2s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 relative">
        {/* Drag indicator for mobile */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full opacity-60 md:hidden"></div>
        
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Page Settings
          </h2>
          {showCloseButton && (
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-amber-100 transition-colors"
              aria-label="Close panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className={`flex-1 min-h-0 px-4 py-4 space-y-6 scroll-smooth custom-scrollbar transition-all duration-700 ease-out ${
        visibleSections.presets 
          ? 'opacity-100 animate-scrollbars' 
          : 'opacity-0'
      }`}>
        {/* Presets */}
        <div 
          ref={presetsRef}
          data-section="presets"
          className={`space-y-3 transition-all duration-700 ease-out ${
            visibleSections.presets 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Search bar and filter tabs */}
          <div className="space-y-2">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                value={searchTerm}
                placeholder="Search templates..." 
                className="w-full pl-8 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:scale-105 transition-all duration-200"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-2">
              {['favorites','recent','all'].map((tab, index) => (
                <Button 
                  key={tab} 
                  size="sm" 
                  variant={activeTab===tab?'default':'outline'} 
                  onClick={() => setActiveTab(tab as any)} 
                  className={`hover:scale-105 transition-transform duration-200 transition-all duration-500 ease-out ${
                    visibleSections.presets 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-2'
                  }`}
                  style={{
                    transitionDelay: visibleSections.presets ? `${200 + index * 100}ms` : '0ms'
                  }}
                >
                  {tab.charAt(0).toUpperCase()+tab.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Template grid with show more functionality */}
          <div className="space-y-3">
            {/* Templates display with limited count */}
            <div className="grid grid-cols-2 gap-2">
              {filteredPresets.slice(0, visibleCount).map((preset, index) => (
                <motion.div 
                  key={preset.id}
                  initial={{ 
                    opacity: 0, 
                    x: 50,
                    scale: 0.9
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    scale: 1
                  }}
                  transition={{ 
                    duration: 0.5, 
                    ease: "easeOut", 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                >
                  <TemplateItem
                    preset={preset}
                    thumbSize={thumbSize}
                    onSelect={onSelect}
                    onPreview={onPreview}
                    toggleFavorite={toggleFavorite}
                    deletePreset={deletePreset}
                    applyPreset={applyPreset}
                    onLineConfigChange={onLineConfigChange}
                    onBackgroundColorChange={onBackgroundColorChange}
                    onBackgroundOpacityChange={onBackgroundOpacityChange}
                    onFontColorChange={onFontColorChange}
                    onFontOpacityChange={onFontOpacityChange}
                    currentId={currentId}
                    timeoutsRef={timeoutsRef}
                  />
                </motion.div>
              ))}
            </div>
            
            {/* Show more button - only if there are more templates to show */}
            {filteredPresets.length > visibleCount && (
              <Button 
                variant="outline" 
                size="sm" 
                className={`w-full text-xs hover:scale-105 hover:bg-amber-50 transition-all duration-200 transition-all duration-500 ease-out ${
                  visibleSections.presets 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-2'
                }`}
                style={{
                  transitionDelay: visibleSections.presets ? '600ms' : '0ms'
                }}
                onClick={() => setVisibleCount(prev => prev + INITIAL_TEMPLATE_COUNT)}
              >
                Show more templates...
              </Button>
            )}
            
            {/* Show less button - only if showing more than initial count */}
            {visibleCount > INITIAL_TEMPLATE_COUNT && (
              <Button 
                variant="outline" 
                size="sm" 
                className={`w-full text-xs mt-2 hover:scale-105 hover:bg-amber-50 transition-all duration-200 transition-all duration-500 ease-out ${
                  visibleSections.presets 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-2'
                }`}
                style={{
                  transitionDelay: visibleSections.presets ? '700ms' : '0ms'
                }}
                onClick={() => setVisibleCount(INITIAL_TEMPLATE_COUNT)}
              >
                Show fewer templates
              </Button>
            )}
          </div>
          
          {/* Save template button */}
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className={`w-full mt-2 hover:scale-105 hover:shadow-md transition-all duration-200 transition-all duration-500 ease-out ${
                  visibleSections.presets 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-2'
                }`}
                style={{
                  transitionDelay: visibleSections.presets ? '800ms' : '0ms'
                }}
                onClick={() => {
                  setTemplateName('');
                  setTemplateNameError('');
                }}
              >
                Save Current Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] animate-in fade-in-0 zoom-in-95 duration-200">
              <DialogHeader>
                <DialogTitle>Save Template</DialogTitle>
                <DialogDescription>
                  Enter a descriptive name for your new template. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right select-none">
                    Name
                  </Label>
                  <Input
                    id="template-name-input"
                    placeholder="My Custom Template"
                    className={`col-span-3 ${templateNameError ? 'border-red-500' : ''}`}
                    value={templateName}
                    onChange={(e) => {
                      setTemplateName(e.target.value);
                      if (templateNameError) setTemplateNameError('');
                    }}
                  />
                </div>
                {templateNameError && <p className="col-span-4 text-red-500 text-xs text-right">{templateNameError}</p>}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={handleSaveTemplate}
                >
                  Save Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Font Color Section */}
        <div 
          ref={fontColorRef}
          data-section="fontColor"
          className={`border-t border-gray-200 pt-4 transition-all duration-700 ease-out delay-100 ${
            visibleSections.fontColor 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2 mb-4 select-none hover:text-amber-700 transition-colors duration-200 cursor-default">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-600 hover:scale-110 transition-transform duration-200">
              <circle cx="13.5" cy="6.5" r=".5"></circle>
              <circle cx="17.5" cy="10.5" r=".5"></circle>
              <circle cx="8.5" cy="7.5" r=".5"></circle>
              <circle cx="6.5" cy="12.5" r=".5"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
            Font Color
          </h3>

          <div className="space-y-2">
            <label className={`text-xs font-medium text-gray-700 select-none transition-all duration-500 ease-out ${
              visibleSections.fontColor 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{
              transitionDelay: visibleSections.fontColor ? '200ms' : '0ms'
            }}>Choose Text Color</label>
            <div className={`flex items-center gap-3 transition-all duration-500 ease-out ${
              visibleSections.fontColor 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{
              transitionDelay: visibleSections.fontColor ? '300ms' : '0ms'
            }}>
              <input
                type="color"
                value={localFontColor}
                onChange={(e) => handleFontColorChange(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-200"
                title="Select text color"
              />
              <div className="flex items-center gap-2 ml-2">
                <Slider
                  value={[localFontOpacity]}
                  onValueChange={(value) => handleFontOpacityChange(value[0])}
                  min={0.1}
                  max={1}
                  step={0.01}
                  className="w-24"
                />
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded select-none hover:bg-amber-100 hover:text-amber-700 transition-all duration-200 cursor-default">{Math.round(localFontOpacity * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background Color Section */}
        <div 
          ref={backgroundColorRef}
          data-section="backgroundColor"
          className={`border-t border-gray-200 pt-4 transition-all duration-700 ease-out delay-200 ${
            visibleSections.backgroundColor 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2 mb-4 select-none hover:text-amber-700 transition-colors duration-200 cursor-default">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-600 hover:scale-110 transition-transform duration-200">
              <circle cx="13.5" cy="6.5" r=".5"></circle>
              <circle cx="17.5" cy="10.5" r=".5"></circle>
              <circle cx="8.5" cy="7.5" r=".5"></circle>
              <circle cx="6.5" cy="12.5" r=".5"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
            Background Color
          </h3>
          <div className="space-y-2">
            <label className={`text-xs font-medium text-gray-700 select-none transition-all duration-500 ease-out ${
              visibleSections.backgroundColor 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{
              transitionDelay: visibleSections.backgroundColor ? '200ms' : '0ms'
            }}>Choose Background Color</label>
            <div className={`flex items-center gap-3 transition-all duration-500 ease-out ${
              visibleSections.backgroundColor 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{
              transitionDelay: visibleSections.backgroundColor ? '300ms' : '0ms'
            }}>
              <input
                type="color"
                value={localBackgroundColor}
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-200"
                title="Select background color"
              />
              <div className="flex items-center gap-2 ml-2">
                <Slider
                  value={[localBackgroundOpacity]}
                  onValueChange={(value) => handleBackgroundOpacityChange(value[0])}
                  min={0.1}
                  max={1}
                  step={0.01}
                  className="w-24"
                />
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded select-none hover:bg-amber-100 hover:text-amber-700 transition-all duration-200 cursor-default">{Math.round(localBackgroundOpacity * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Lines Section */}
        <div 
          ref={pageLinesRef}
          data-section="pageLines"
          className={`border-t border-gray-200 pt-4 transition-all duration-700 ease-out delay-300 ${
            visibleSections.pageLines 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2 mb-4 select-none hover:text-amber-700 transition-colors duration-200 cursor-default">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-600 hover:scale-110 transition-transform duration-200">
              <path d="M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"></path>
              <line x1="6" y1="6" x2="18" y2="6"></line>
              <line x1="6" y1="10" x2="18" y2="10"></line>
              <line x1="6" y1="14" x2="18" y2="14"></line>
              <line x1="6" y1="18" x2="18" y2="18"></line>
            </svg>
            Page Lines
          </h3>

          {/* Line Style */}
          <div className="space-y-3 mb-4">
            <label className={`text-xs font-medium text-gray-700 select-none transition-all duration-500 ease-out ${
              visibleSections.pageLines 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{
              transitionDelay: visibleSections.pageLines ? '200ms' : '0ms'
            }}>Line Style</label>
            <div className={`grid grid-cols-3 gap-2 transition-all duration-500 ease-out ${
              visibleSections.pageLines 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{
              transitionDelay: visibleSections.pageLines ? '300ms' : '0ms'
            }}>
              {[
                { type: 'none', label: 'None' },
                { type: 'straight', label: 'Straight' },
                { type: 'dotted', label: 'Dotted' },
                { type: 'wavy', label: 'Wavy' },
                { type: 'zigzag', label: 'Zigzag' },
                { type: 'swirls', label: 'Swirls' },
                { type: 'arc', label: 'Arc' }
              ].map((style, index) => (
                <Button
                  key={style.type}
                  size="sm"
                  variant={lineConfig.type === style.type ? 'default' : 'outline'}
                  onClick={() => style.type === 'none' ? handleLineConfigChange({ type: 'none' }) : handleLineTypeChange(style.type as LineType)}
                  className={`text-xs hover:scale-105 transition-all duration-300 ease-out ${
                    lineConfig.type === style.type ? 'bg-amber-100 text-amber-900 border-amber-300' : ''
                  } ${
                    visibleSections.pageLines 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-2 scale-95'
                  }`}
                  style={{
                    transitionDelay: visibleSections.pageLines ? `${400 + index * 50}ms` : '0ms'
                  }}
                >
                  {style.label}
                </Button>
              ))}
            </div>
          </div>

          {lineConfig.type !== 'none' && (
            <>
              {/* Colour */}
              <div className={`space-y-2 mb-4 transition-all duration-500 ease-out ${
                visibleSections.pageLines 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-2'
              }`}
              style={{
                transitionDelay: visibleSections.pageLines ? '500ms' : '0ms'
              }}>
                <label className="text-xs font-medium text-gray-700 select-none">Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={lineConfig.color}
                    onChange={(e) => handleLineColorChange(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-200"
                    title="Select line color"
                  />
                  <div className="flex items-center gap-2 ml-2">
                    <Slider
                      value={[lineConfig.opacity]}
                      onValueChange={(value) => handleLineConfigChange({ opacity: value[0] })}
                      min={0.1}
                      max={1}
                      step={0.01}
                      className="w-24"
                    />
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded select-none hover:bg-amber-100 hover:text-amber-700 transition-all duration-200 cursor-default">{Math.round(lineConfig.opacity * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Spacing */}
              <div className={`space-y-2 mb-4 transition-all duration-500 ease-out ${
                visibleSections.pageLines 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-2'
              }`}
              style={{
                transitionDelay: visibleSections.pageLines ? '600ms' : '0ms'
              }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700 select-none">Spacing</label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded select-none hover:bg-amber-100 hover:text-amber-700 transition-all duration-200 cursor-default">{lineConfig.spacing}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentStep = lineConfig.spacing <= 10 ? 1 : lineConfig.spacing <= 40 ? 2 : lineConfig.spacing <= 100 ? 5 : lineConfig.spacing <= 300 ? 10 : 20;
                      handleLineConfigChange({ spacing: Math.max(2, lineConfig.spacing - currentStep) });
                    }}
                    disabled={lineConfig.spacing <= 2}
                    className="h-6 w-6 p-0 hover:scale-110 hover:bg-amber-50 transition-all duration-200"
                  >
                    <span className="w-3 h-3 flex items-center justify-center font-bold">-</span>
                  </Button>
                  <Slider
                    value={[lineConfig.spacing]}
                    onValueChange={(value) => handleLineConfigChange({ spacing: value[0] })}
                    min={2}
                    max={600}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentStep = lineConfig.spacing < 10 ? 1 : lineConfig.spacing < 40 ? 2 : lineConfig.spacing < 100 ? 5 : lineConfig.spacing < 300 ? 10 : 20;
                      handleLineConfigChange({ spacing: Math.min(600, lineConfig.spacing + currentStep) });
                    }}
                    disabled={lineConfig.spacing >= 600}
                    className="h-6 w-6 p-0 hover:scale-110 hover:bg-amber-50 transition-all duration-200"
                  >
                    <span className="w-3 h-3 flex items-center justify-center font-bold">+</span>
                  </Button>
                </div>
              </div>

              {/* Thickness */}
              <div className={`space-y-2 mb-4 transition-all duration-500 ease-out ${
                visibleSections.pageLines 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-2'
              }`}
              style={{
                transitionDelay: visibleSections.pageLines ? '700ms' : '0ms'
              }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700 select-none">Thickness</label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded select-none hover:bg-amber-100 hover:text-amber-700 transition-all duration-200 cursor-default">{lineConfig.thickness}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentStep = lineConfig.thickness <= 10 ? 1 : lineConfig.thickness <= 40 ? 2 : lineConfig.thickness <= 100 ? 5 : lineConfig.thickness <= 300 ? 10 : 20;
                      handleLineConfigChange({ thickness: Math.max(2, lineConfig.thickness - currentStep) });
                    }}
                    disabled={lineConfig.thickness <= 2}
                    className="h-6 w-6 p-0 hover:scale-110 hover:bg-amber-50 transition-all duration-200"
                  >
                    <span className="w-3 h-3 flex items-center justify-center font-bold">-</span>
                  </Button>
                  <Slider
                    value={[lineConfig.thickness]}
                    onValueChange={(value) => handleLineConfigChange({ thickness: value[0] })}
                    min={2}
                    max={300}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentStep = lineConfig.thickness < 10 ? 1 : lineConfig.thickness < 40 ? 2 : lineConfig.thickness < 100 ? 5 : lineConfig.thickness < 300 ? 10 : 20;
                      handleLineConfigChange({ thickness: Math.min(300, lineConfig.thickness + currentStep) });
                    }}
                    disabled={lineConfig.thickness >= 300}
                    className="h-6 w-6 p-0 hover:scale-110 hover:bg-amber-50 transition-all duration-200"
                  >
                    <span className="w-3 h-3 flex items-center justify-center font-bold">+</span>
                  </Button>
                </div>
              </div>

              {/* Rotation */}
              <div className={`space-y-2 transition-all duration-500 ease-out ${
                visibleSections.pageLines 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-2'
              }`}
              style={{
                transitionDelay: visibleSections.pageLines ? '800ms' : '0ms'
              }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700 select-none">Rotation</label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded select-none hover:bg-amber-100 hover:text-amber-700 transition-all duration-200 cursor-default">{lineConfig.rotation}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentStep = 5;
                      const newRotation = (lineConfig.rotation - currentStep + 360) % 360;
                      handleLineConfigChange({ rotation: newRotation });
                    }}
                    className="h-6 w-6 p-0 hover:scale-110 hover:bg-amber-50 transition-all duration-200"
                  >
                    <span className="w-3 h-3 flex items-center justify-center font-bold">-</span>
                  </Button>
                  <Slider
                    value={[lineConfig.rotation]}
                    onValueChange={(value) => handleLineConfigChange({ rotation: value[0] })}
                    min={0}
                    max={360}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentStep = 5;
                      const newRotation = (lineConfig.rotation + currentStep) % 360;
                      handleLineConfigChange({ rotation: newRotation });
                    }}
                    className="h-6 w-6 p-0 hover:scale-110 hover:bg-amber-50 transition-all duration-200"
                  >
                    <span className="w-3 h-3 flex items-center justify-center font-bold">+</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}