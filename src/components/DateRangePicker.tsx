
"use client"

import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

type Preset = 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

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
  
  const handlePresetChange = (value: Preset) => {
    const selectedPreset = presets.find(p => p.value === value);
    if (selectedPreset) {
      onDateChange(selectedPreset.getRange());
    }
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 w-full", className)}>
        <Select onValueChange={(value: Preset) => handlePresetChange(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Pilih rentang cepat" />
            </SelectTrigger>
            <SelectContent>
                {presets.map(preset => (
                     <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal flex-1",
              !date && "text-muted-foreground",
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
