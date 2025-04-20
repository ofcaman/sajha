"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { NepaliDatePicker } from "@/components/nepali-date-picker"
import { BsCalendar, type BsDate } from "@/lib/nepali-date"
import type { ExamTerm } from "@/lib/models/exam-models"

interface ExamTermDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  examTerm?: ExamTerm | null
  onSave: (examTerm: Partial<ExamTerm>) => Promise<void>
  isLoading: boolean
  title: string
  description: string
  buttonText: string
}

export function ExamTermDialog({
  isOpen,
  onOpenChange,
  examTerm,
  onSave,
  isLoading,
  title,
  description,
  buttonText,
}: ExamTermDialogProps) {
  const [termName, setTermName] = useState("First Term")
  const [startDate, setStartDate] = useState<BsDate>(BsCalendar.getCurrentBsDate())
  const [endDate, setEndDate] = useState<BsDate>(() => {
    const date = BsCalendar.getCurrentBsDate()
    // Add 14 days to the current date
    let nextDate = date
    for (let i = 0; i < 14; i++) {
      const next = BsCalendar.getNextBsDate(nextDate)
      if (next) nextDate = next
    }
    return nextDate
  })
  const [isActive, setIsActive] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (examTerm) {
      setTermName(examTerm.name)

      // Convert Date objects to BsDate
      const startBsDate = BsCalendar.getBsDate(examTerm.startDate)
      const endBsDate = BsCalendar.getBsDate(examTerm.endDate)

      if (startBsDate) setStartDate(startBsDate)
      if (endBsDate) setEndDate(endBsDate)

      setIsActive(examTerm.isActive)
    } else {
      // Reset form for new exam term
      setTermName("First Term")
      setStartDate(BsCalendar.getCurrentBsDate())

      // Set end date to 14 days after start date
      let nextDate = BsCalendar.getCurrentBsDate()
      for (let i = 0; i < 14; i++) {
        const next = BsCalendar.getNextBsDate(nextDate)
        if (next) nextDate = next
      }
      setEndDate(nextDate)

      setIsActive(false)
    }
    setFormErrors({})
  }, [examTerm, isOpen])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!termName) errors.termName = "Term name is required"

    // Check if end date is after start date
    const startAdDate = startDate.adDate
    const endAdDate = endDate.adDate
    if (endAdDate < startAdDate) {
      errors.endDate = "End date must be after start date"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    const updatedExamTerm = {
      name: termName,
      startDate: startDate.adDate,
      endDate: endDate.adDate,
      isActive,
    }

    await onSave(updatedExamTerm)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="termName">Term Name</Label>
            <Select value={termName} onValueChange={setTermName}>
              <SelectTrigger id="termName" className={formErrors.termName ? "border-red-500" : ""}>
                <SelectValue placeholder="Select term name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First Term">First Term</SelectItem>
                <SelectItem value="Second Term">Second Term</SelectItem>
                <SelectItem value="Third Term">Third Term</SelectItem>
                <SelectItem value="Final Term">Final Term</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.termName && <p className="text-red-500 text-sm">{formErrors.termName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <NepaliDatePicker value={startDate} onChange={setStartDate} showNepaliDigits={true} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <NepaliDatePicker value={endDate} onChange={setEndDate} showNepaliDigits={true} />
            {formErrors.endDate && <p className="text-red-500 text-sm">{formErrors.endDate}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="isActive">Active Term</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
