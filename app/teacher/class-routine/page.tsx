"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { ClassRoutine } from "@/lib/models/class-routine-models"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusCircle } from "lucide-react"
import Image from "next/image"

export default function ClassRoutinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState("Grade 1")
  const [selectedDay, setSelectedDay] = useState("Sunday")
  const [routines, setRoutines] = useState<ClassRoutine[]>([])

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

  useEffect(() => {
    fetchRoutines()
  }, [selectedGrade, selectedDay])

  const fetchRoutines = async () => {
    setLoading(true)
    try {
      const grade = selectedGrade.replace("Grade ", "")
      const routineQuery = query(
        collection(db, "class_routines"),
        where("grade", "==", grade),
        where("day", "==", selectedDay),
      )

      const querySnapshot = await getDocs(routineQuery)
      const routineData: ClassRoutine[] = []

      querySnapshot.forEach((doc) => {
        routineData.push({ id: doc.id, ...doc.data() } as ClassRoutine)
      })

      // Sort routines by start time
      routineData.sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0
        return a.startTime.localeCompare(b.startTime)
      })

      setRoutines(routineData)
    } catch (error) {
      console.error("Error fetching routines:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Image src="/class-routine.png" alt="Class Routine" width={40} height={40} className="mr-2" />
          <h1 className="text-2xl font-bold">Class Routine</h1>
        </div>
        <Button onClick={() => router.push("/teacher/add-class-routine")} className="flex items-center">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Routine
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium mb-1">Select Grade</label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
              {days.map((day) => (
                <TabsTrigger key={day} value={day}>
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {days.map((day) => (
              <TabsContent key={day} value={day}>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : routines.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No routine found for {selectedDay}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => router.push("/teacher/add-class-routine")}
                    >
                      Create Routine
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {routines.map((routine, index) => (
                      <Card
                        key={routine.id || index}
                        className={`
                        ${routine.isTiffin ? "bg-yellow-50 border-yellow-200" : ""}
                        ${routine.isDiaryCheck ? "bg-blue-50 border-blue-200" : ""}
                      `}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {routine.isTiffin
                                  ? "Tiffin Break"
                                  : routine.isDiaryCheck
                                    ? "Diary Check"
                                    : routine.subject}
                              </p>
                              {!routine.isTiffin && !routine.isDiaryCheck && (
                                <p className="text-sm text-gray-500">
                                  Teacher: {routine.teacherName || "Not assigned"}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {routine.startTime} - {routine.endTime}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
