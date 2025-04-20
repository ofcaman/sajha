"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { NepaliDatePicker } from "@/components/nepali-date-picker"
import { BsCalendar, type BsDate, nepaliMonths } from "@/lib/nepali-date"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NepaliDateDemoPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<BsDate>(BsCalendar.getCurrentBsDate())
  const [useNepaliDigits, setUseNepaliDigits] = useState(false)

  const handleDateChange = (date: BsDate) => {
    setSelectedDate(date)
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Nepali Date (BS) Calendar</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nepali Date Picker</CardTitle>
          <CardDescription>A calendar component for selecting dates in Bikram Sambat (BS) format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch id="nepali-digits" checked={useNepaliDigits} onCheckedChange={setUseNepaliDigits} />
            <Label htmlFor="nepali-digits">Use Nepali Digits</Label>
          </div>

          <div className="space-y-2">
            <Label>Select a Date</Label>
            <NepaliDatePicker value={selectedDate} onChange={handleDateChange} showNepaliDigits={useNepaliDigits} />
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium mb-2">Selected Date Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">BS Date:</p>
                <p className="font-medium">
                  {selectedDate.year} {nepaliMonths[selectedDate.month - 1]} {selectedDate.day}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AD Date:</p>
                <p className="font-medium">
                  {selectedDate.adDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-md font-medium mb-1">Supported Date Range</h3>
            <p>This calendar supports BS dates from 2081 Baishakh 1 to 2086 Chaitra 30.</p>
          </div>

          <div>
            <h3 className="text-md font-medium mb-1">Features</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Convert between AD and BS dates</li>
              <li>Navigate through days, months, and years</li>
              <li>Display dates in English or Nepali digits</li>
              <li>Proper handling of leap years (2082 BS)</li>
              <li>Month-specific day counts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
