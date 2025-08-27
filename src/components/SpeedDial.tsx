
"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

interface SpeedDialProps {
  children: React.ReactNode[] | React.ReactNode
  mainIcon?: React.ReactNode
  position?: 'bottom-right' | 'bottom-left'
  className?: string
}

const SpeedDialContext = React.createContext<{ position: 'bottom-right' | 'bottom-left' }>({ position: 'bottom-right' });

export function SpeedDial({ children, mainIcon, position = "bottom-right", className }: SpeedDialProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Close speed dial when clicking outside (on the overlay)
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);


  return (
    <SpeedDialContext.Provider value={{ position }}>
        {isOpen && (
            <div 
                className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm animate-in fade-in-0"
                onClick={() => setIsOpen(false)}
            />
        )}
        <div 
            className={cn(
                "fixed z-40",
                position === 'bottom-right' ? 'bottom-20 right-6' : 'bottom-20 left-6',
                className
            )}
        >
          <div 
              className={cn(
                  "flex flex-col-reverse items-center",
                  position === 'bottom-right' ? 'items-end' : 'items-start'
              )}
          >
            <div className="pointer-events-auto">
              <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                aria-expanded={isOpen}
                aria-label="Toggle Actions"
              >
                <div className={cn("transition-transform duration-300 ease-in-out", isOpen && "rotate-45")}>
                    {mainIcon || <Plus className="h-6 w-6" />}
                </div>
              </Button>
            </div>
            <div
                className={cn(
                    "flex flex-col-reverse transition-all duration-300 ease-in-out",
                    isOpen ? "mb-3" : "hidden"
                )}
            >
              {React.Children.map(children, child => 
                  React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { 
                      onClick: () => {
                          if (child.props.onClick) child.props.onClick();
                          setIsOpen(false);
                      }
                  }) : child
              )}
            </div>
          </div>
        </div>
    </SpeedDialContext.Provider>
  )
}

interface SpeedDialActionProps {
  children: React.ReactNode
  label?: string
  onClick?: () => void
  className?: string;
}

export function SpeedDialAction({ children, label, onClick, className }: SpeedDialActionProps) {
  const { position } = React.useContext(SpeedDialContext);
  return (
    <div className={cn(
        "flex items-center pointer-events-auto mt-3",
        position === 'bottom-left' && "flex-row-reverse",
        className
    )}>
      {label && (
        <div className={cn(
            "whitespace-nowrap rounded-md bg-card px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm",
            position === 'bottom-right' ? 'mr-4' : 'ml-4'
        )}>
          {label}
        </div>
      )}
      <Button
        size="icon"
        variant="secondary"
        className="h-12 w-12 rounded-full shadow-md"
        onClick={onClick}
      >
        {children}
      </Button>
    </div>
  )
}
