

"use client"

import * as React from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, subMonths } from 'date-fns'

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

type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetChange = (value: Preset) => {
      const today = new Date();
      switch (value) {
          case 'today':
              onDateChange({ from: startOfDay(today), to: endOfDay(today) });
              break;
          case 'yesterday':
              const yesterday = subDays(today, 1);
              onDateChange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
              break;
          case 'last7':
              onDateChange({ from: startOfDay(subDays(today, 6)), to: endOfDay(today) });
              break;
          case 'last30':
              onDateChange({ from: startOfDay(subDays(today, 29)), to: endOfDay(today) });
              break;
          case 'thisMonth':
              onDateChange({ from: startOfMonth(today), to: endOfMonth(today) });
              break;
          case 'lastMonth':
              const lastMonthStart = startOfMonth(subMonths(today, 1));
              const lastMonthEnd = endOfMonth(subMonths(today, 1));
              onDateChange({ from: lastMonthStart, to: lastMonthEnd });
              break;
          default:
              break;
      }
      if (value !== 'custom') {
          setIsOpen(false);
      }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal md:w-auto",
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
        <PopoverContent className="w-auto p-0" align="end">
           <div className="p-2 border-b">
              <Select onValueChange={(value: Preset) => handlePresetChange(value)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Pilih rentang cepat..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="today">Hari Ini</SelectItem>
                      <SelectItem value="yesterday">Kemarin</SelectItem>
                      <SelectItem value="last7">7 Hari Terakhir</SelectItem>
                      <SelectItem value="last30">30 Hari Terakhir</SelectItem>
                      <SelectItem value="thisMonth">Bulan Ini</SelectItem>
                      <SelectItem value="lastMonth">Bulan Lalu</SelectItem>
                      <SelectItem value="custom">Rentang Kustom</SelectItem>
                  </SelectContent>
              </Select>
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
        </PopoverContent>
      </Popover>
    </div>
  )
}
