"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import type { ExamTerm } from "@/lib/models/exam-models"

interface ExamTermAdapterProps {
  examTerms: ExamTerm[]
  onEdit: (examTerm: ExamTerm) => void
  onDelete: (examTerm: ExamTerm) => void
}

export function ExamTermAdapter({ examTerms, onEdit, onDelete }: ExamTermAdapterProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-4">
      {examTerms.map((examTerm) => (
        <Card key={examTerm.id} className={examTerm.isActive ? "border-primary" : ""}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center">
                  {examTerm.name}
                  {examTerm.isActive && (
                    <Badge variant="default" className="ml-2">
                      Active
                    </Badge>
                  )}
                </h2>
                <p className="text-muted-foreground">
                  {formatDate(examTerm.startDate)} - {formatDate(examTerm.endDate)}
                </p>
                <p className="text-sm text-muted-foreground">Academic Year: {examTerm.academicYear}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(examTerm)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-500" onClick={() => onDelete(examTerm)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
