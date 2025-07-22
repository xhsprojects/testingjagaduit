
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

  // Close speed dial when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        // A simple check to see if the click was outside the component's main div
        const target = event.target as HTMLElement;
        if (!target.closest(`[data-speed-dial-wrapper="${position}"]`)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, position]);


  return (
    <SpeedDialContext.Provider value={{ position }}>
        <div 
            className={cn(
                "fixed z-40",
                position === 'bottom-right' ? 'bottom-20 right-6' : 'bottom-20 left-6',
                className
            )}
            data-speed-dial-wrapper={position}
        >
        <div className={cn(
            "relative z-50 flex flex-col-reverse gap-3",
            position === 'bottom-right' ? 'items-end' : 'items-start'
        )}>
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
            <div
            className={cn(
                "flex flex-col gap-3 transition-all duration-300 ease-in-out",
                position === 'bottom-right' ? 'items-end' : 'items-start',
                isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
            >
             {React.Children.map(children, child => 
                React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { onClick: () => {
                    if (child.props.onClick) child.props.onClick();
                    setIsOpen(false);
                }}) : child
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
}

export function SpeedDialAction({ children, label, onClick }: SpeedDialActionProps) {
  const { position } = React.useContext(SpeedDialContext);
  return (
    <div className={cn(
        "flex items-center gap-4",
        position === 'bottom-left' && "flex-row-reverse"
    )}>
      {label && (
        <div className="whitespace-nowrap rounded-md bg-card px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm">
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
