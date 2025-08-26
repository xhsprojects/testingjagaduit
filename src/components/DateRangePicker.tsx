
"use client"

import * as React from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

type Preset = 'last7' | 'thisMonth' | 'lastMonth';

const presets: { label: string; value: Preset; getRange: () => DateRange }[] = [
    { label: '7 Hari Terakhir', value: 'last7', getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
    { label: 'Bulan Ini', value: 'thisMonth', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: 'Bulan Lalu', value: 'lastMonth', getRange: () => {
        const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
        const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
        return { from: lastMonthStart, to: lastMonthEnd };
    }},
];

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  
  const [activePreset, setActivePreset] = React.useState<Preset | 'custom' | undefined>();
  
  React.useEffect(() => {
    // Determine active preset based on current date range
    let foundPreset: Preset | 'custom' | undefined = 'custom';
    for (const preset of presets) {
        const presetRange = preset.getRange();
        if (date?.from?.getTime() === presetRange.from?.getTime() && date?.to?.getTime() === presetRange.to?.getTime()) {
            foundPreset = preset.value;
            break;
        }
    }
    setActivePreset(foundPreset);
  }, [date]);


  const handlePresetClick = (presetValue: Preset) => {
    const selectedPreset = presets.find(p => p.value === presetValue);
    if (selectedPreset) {
      onDateChange(selectedPreset.getRange());
    }
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 items-center", className)}>
        <div className="flex gap-2">
            {presets.map(preset => (
                <Button
                    key={preset.value}
                    size="sm"
                    variant={activePreset === preset.value ? 'default' : 'outline'}
                    onClick={() => handlePresetClick(preset.value)}
                >
                    {preset.label}
                </Button>
            ))}
        </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal sm:w-auto",
              !date && "text-muted-foreground",
              activePreset === 'custom' && 'border-primary'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d MMM yyyy", { locale: idLocale })} -{" "}
                  {format(date.to, "d MMM yyyy", { locale: idLocale })}
                </>
              ) : (
                format(date.from, "d MMM yyyy", { locale: idLocale })
              )
            ) : (
              <span>Pilih rentang tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={1}
              locale={idLocale}
            />
        </PopoverContent>
      </Popover>
    </div>
  )
}
