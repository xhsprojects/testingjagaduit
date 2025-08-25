
"use client"

import * as React from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns'

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

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetClick = (preset: '7d' | '30d' | 'month') => {
      const today = new Date();
      let fromDate: Date;
      if (preset === '7d') {
          fromDate = startOfDay(subDays(today, 6));
      } else if (preset === '30d') {
          fromDate = startOfDay(subDays(today, 29));
      } else { // month
          fromDate = startOfMonth(today);
      }
      onDateChange({ from: fromDate, to: endOfDay(today) });
      setIsOpen(false);
  }


  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal md:w-[300px]",
              !date && "text-muted-foreground"
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
        <PopoverContent className="w-auto p-0" align="start">
           <div className="flex flex-col sm:flex-row">
            <div className="p-2 border-b sm:border-r">
              <div className="grid grid-cols-1 gap-2">
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetClick('7d')}>7 Hari Terakhir</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetClick('30d')}>30 Hari Terakhir</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetClick('month')}>Bulan Ini</Button>
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={1}
              locale={idLocale}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
