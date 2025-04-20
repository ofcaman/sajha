"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { ClassRoutine } from "@/lib/models/class-routine-models"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import Image from "next/image"

interface Teacher {
  id: string
  name: string
}

interface PeriodRow {
  startTime: string
  endTime: string
  subject: string
  teacherId: string
  teacherName: string
}

export default function AddClassRoutinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [grade, setGrade] = useState("Grade 1")
  const [day, setDay] = useState("Sunday")

  const [tiffinStartTime, setTiffinStartTime] = useState("")
  const [tiffinEndTime, setTiffinEndTime] = useState("")

  const [diaryCheckStartTime, setDiaryCheckStartTime] = useState("")
  const [diaryCheckEndTime, setDiaryCheckEndTime] = useState("")

  const [periods, setPeriods] = useState<PeriodRow[]>(
    Array(7)
      .fill(null)
      .map(() => ({
        startTime: "",
        endTime: "",
        subject: "Math",
        teacherId: "",
        teacherName: "",
      })),
  )

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  const grades = [
    "Class P.G.",
    "Class Nursery",
    "Class LKG",
    "Class UKG",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
  ]
  const subjects = [
    "Math",
    "Science",
    "English",
    "Serofero",
    "Computer",
    "Nepali",
    "Samajik",
    "Health",
    "O.PT",
    "Grammar",
    "Translation",
  ]

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "teachers"))
      const teachersList: Teacher[] = []

      querySnapshot.forEach((doc) => {
        teachersList.push({
          id: doc.id,
          name: doc.data().name || "Unknown",
        })
      })

      setTeachers(teachersList)

      // Set default teacher for each period
      if (teachersList.length > 0) {
        setPeriods(
          periods.map((period) => ({
            ...period,
            teacherId: teachersList[0].id,
            teacherName: teachersList[0].name,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching teachers:", error)
      toast({
        title: "Error",
        description: "Failed to load teachers",
        variant: "destructive",
      })
    }
  }

  const handlePeriodChange = (index: number, field: keyof PeriodRow, value: string) => {
    const updatedPeriods = [...periods]

    if (field === "teacherId" && value) {
      const selectedTeacher = teachers.find((t) => t.id === value)
      if (selectedTeacher) {
        updatedPeriods[index] = {
          ...updatedPeriods[index],
          teacherId: value,
          teacherName: selectedTeacher.name,
        }
      }
    } else {
      updatedPeriods[index] = {
        ...updatedPeriods[index],
        [field]: value,
      }
    }

    setPeriods(updatedPeriods)
  }

  const validateForm = () => {
    // Check tiffin times
    if (!tiffinStartTime || !tiffinEndTime) {
      toast({
        title: "Missing Information",
        description: "Please set times for Tiffin Break",
        variant: "destructive",
      })
      return false
    }

    // Check diary check times
    if (!diaryCheckStartTime || !diaryCheckEndTime) {
      toast({
        title: "Missing Information",
        description: "Please set times for Diary Check",
        variant: "destructive",
      })
      return false
    }

    // Check all periods have times
    for (let i = 0; i < periods.length; i++) {
      if (!periods[i].startTime || !periods[i].endTime) {
        toast({
          title: "Missing Information",
          description: `Please set times for Period ${i + 1}`,
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)

    try {
      const gradeValue = grade.replace("Grade ", "")
      const routines: ClassRoutine[] = []

      // Add regular periods
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i]

        const routine: ClassRoutine = {
          grade: gradeValue,
          day,
          startTime: period.startTime,
          endTime: period.endTime,
          isTiffin: false,
          isDiaryCheck: false,
          subject: period.subject,
          teacherId: period.teacherId,
          teacherName: period.teacherName,
        }

        routines.push(routine)

        // Add tiffin break after the 4th period
        if (i === 3) {
          const tiffinRoutine: ClassRoutine = {
            grade: gradeValue,
            day,
            startTime: tiffinStartTime,
            endTime: tiffinEndTime,
            isTiffin: true,
            isDiaryCheck: false,
          }
          routines.push(tiffinRoutine)
        }
      }

      // Add diary check after the last period
      const diaryCheckRoutine: ClassRoutine = {
        grade: gradeValue,
        day,
        startTime: diaryCheckStartTime,
        endTime: diaryCheckEndTime,
        isTiffin: false,
        isDiaryCheck: true,
      }
      routines.push(diaryCheckRoutine)

      // Save each routine individually
      for (const routine of routines) {
        await addDoc(collection(db, "class_routines"), routine)
      }

      toast({
        title: "Success",
        description: "Class routine saved successfully!",
      })

      router.push("/teacher/class-routine")
    } catch (error) {
      console.error("Error saving routine:", error)
      toast({
        title: "Error",
        description: "Failed to save class routine",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Image src="/class-routine.png" alt="Class Routine" width={40} height={40} className="mr-2" />
        <h1 className="text-2xl font-bold">Create Class Routine</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grade">Select Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="day">Select Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger id="day">
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Periods</h2>
            <div className="space-y-4">
              {periods.map((period, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center mb-2">
                      <h3 className="font-medium">Period {index + 1}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`start-time-${index}`}>Start Time</Label>
                        <Input
                          id={`start-time-${index}`}
                          type="time"
                          value={period.startTime}
                          onChange={(e) => handlePeriodChange(index, "startTime", e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`end-time-${index}`}>End Time</Label>
                        <Input
                          id={`end-time-${index}`}
                          type="time"
                          value={period.endTime}
                          onChange={(e) => handlePeriodChange(index, "endTime", e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`subject-${index}`}>Subject</Label>
                        <Select
                          value={period.subject}
                          onValueChange={(value) => handlePeriodChange(index, "subject", value)}
                        >
                          <SelectTrigger id={`subject-${index}`}>
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`teacher-${index}`}>Teacher</Label>
                        <Select
                          value={period.teacherId}
                          onValueChange={(value) => handlePeriodChange(index, "teacherId", value)}
                        >
                          <SelectTrigger id={`teacher-${index}`}>
                            <SelectValue placeholder="Select Teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Tiffin Break Time</h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tiffin-start">Start Time</Label>
                    <Input
                      id="tiffin-start"
                      type="time"
                      value={tiffinStartTime}
                      onChange={(e) => setTiffinStartTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tiffin-end">End Time</Label>
                    <Input
                      id="tiffin-end"
                      type="time"
                      value={tiffinEndTime}
                      onChange={(e) => setTiffinEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Diary Check Time</h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="diary-start">Start Time</Label>
                    <Input
                      id="diary-start"
                      type="time"
                      value={diaryCheckStartTime}
                      onChange={(e) => setDiaryCheckStartTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="diary-end">End Time</Label>
                    <Input
                      id="diary-end"
                      type="time"
                      value={diaryCheckEndTime}
                      onChange={(e) => setDiaryCheckEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>

        <CardFooter>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Routine"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
