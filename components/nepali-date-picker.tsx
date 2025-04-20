"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BsCalendar, type BsDate, nepaliMonths, toNepaliDigits, nepaliDays } from "@/lib/nepali-date"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface NepaliDatePickerProps {
  value?: BsDate
  onChange?: (date: BsDate) => void
  showNepaliDigits?: boolean
  className?: string
}

export function NepaliDatePicker({ value, onChange, showNepaliDigits = false, className = "" }: NepaliDatePickerProps) {
  const [currentDate, setCurrentDate] = useState<BsDate>(value || BsCalendar.getCurrentBsDate())
  const [isOpen, setIsOpen] = useState(false)
  const [viewingYear, setViewingYear] = useState(currentDate.year)
  const [viewingMonth, setViewingMonth] = useState(currentDate.month)

  useEffect(() => {
    if (value) {
      setCurrentDate(value)
      setViewingYear(value.year)
      setViewingMonth(value.month)
    }
  }, [value])

  const handlePreviousDay = () => {
    const prevDate = BsCalendar.getPreviousBsDate(currentDate)
    if (prevDate) {
      setCurrentDate(prevDate)
      onChange?.(prevDate)
    }
  }

  const handleNextDay = () => {
    const nextDate = BsCalendar.getNextBsDate(currentDate)
    if (nextDate) {
      setCurrentDate(nextDate)
      onChange?.(nextDate)
    }
  }

  const handleToday = () => {
    const today = BsCalendar.getCurrentBsDate()
    setCurrentDate(today)
    setViewingYear(today.year)
    setViewingMonth(today.month)
    onChange?.(today)
  }

  const handleYearChange = (year: string) => {
    setViewingYear(Number.parseInt(year))
  }

  const handleMonthChange = (month: string) => {
    setViewingMonth(Number.parseInt(month))
  }

  const handleDateSelect = (day: number) => {
    const newDate = BsCalendar.calendar.find(
      (date) => date.year === viewingYear && date.month === viewingMonth && date.day === day,
    )

    if (newDate) {
      setCurrentDate(newDate)
      onChange?.(newDate)
    }

    setIsOpen(false)
  }

  const renderCalendarDays = () => {
    const daysInMonth = BsCalendar.getDaysInMonth(viewingYear, viewingMonth)
    const firstDayDate = BsCalendar.getAdDate(viewingYear, viewingMonth, 1)
    const firstDayOfWeek = firstDayDate ? firstDayDate.getDay() : 0 // 0 = Sunday, 6 = Saturday

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        currentDate.year === viewingYear && currentDate.month === viewingMonth && currentDate.day === day

      days.push(
        <button
          key={day}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
            isSelected ? "bg-primary text-primary-foreground" : "hover:bg-gray-100"
          }`}
          onClick={() => handleDateSelect(day)}
        >
          {showNepaliDigits ? toNepaliDigits(day) : day}
        </button>,
      )
    }

    return days
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={handlePreviousDay}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous day</span>
        </Button>

        <Button
          variant="outline"
          className="flex-1 justify-start text-left font-normal"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          <span>{BsCalendar.formatBsDate(currentDate, showNepaliDigits)}</span>
        </Button>

        <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={handleNextDay}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next day</span>
        </Button>
      </div>

      {isOpen && (
        <Card className="absolute z-10 mt-1 w-full">
          <CardHeader className="p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{showNepaliDigits ? "मिति छान्नुहोस्" : "Select Date"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                {showNepaliDigits ? "आज" : "Today"}
              </Button>
            </div>
            <div className="flex space-x-2">
              <Select value={viewingYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => 2081 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {showNepaliDigits ? toNepaliDigits(year) : year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={viewingMonth.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nepaliMonths.map((month, index) => (
                    <SelectItem key={month} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center">
              {nepaliDays.map((day, index) => (
                <div key={index} className="text-xs font-medium text-muted-foreground">
                  {day.charAt(0)}
                </div>
              ))}
              {renderCalendarDays()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
