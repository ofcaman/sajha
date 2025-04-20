// Subject Configuration model
export interface SubjectConfig {
  name: string
  maxTheoryMarks: number
  maxPracticalMarks: number
  hasPractical: boolean
  totalMarks: number
  applicableGrades: string[]
}

// Subject Configurations object
export const SUBJECT_CONFIGS: Record<string, SubjectConfig> = {
  Mathematics: {
    name: "Mathematics",
    maxTheoryMarks: 100,
    maxPracticalMarks: 0,
    hasPractical: false,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Computer: {
    name: "Computer",
    maxTheoryMarks: 50,
    maxPracticalMarks: 0,
    hasPractical: false,
    totalMarks: 50,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Health: {
    name: "Health",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["6"],
  },
  English: {
    name: "English",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Nepali: {
    name: "Nepali",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Science: {
    name: "Science",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  "Social Studies": {
    name: "Social Studies",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Serofero: {
    name: "Serofero",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Grammar: {
    name: "Grammar",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Translation: {
    name: "Translation",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  "Moral Education": {
    name: "Moral Education",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  Art: {
    name: "Art",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  "Physical Education": {
    name: "Physical Education",
    maxTheoryMarks: 75,
    maxPracticalMarks: 25,
    hasPractical: true,
    totalMarks: 100,
    applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
}

// Utility functions
export function getSubjectConfig(subjectName: string): SubjectConfig {
  return (
    SUBJECT_CONFIGS[subjectName] || {
      name: subjectName,
      maxTheoryMarks: 75,
      maxPracticalMarks: 25,
      hasPractical: true,
      totalMarks: 100,
      applicableGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    }
  )
}

export function getAllSubjects(): string[] {
  return Object.keys(SUBJECT_CONFIGS)
}

export function getSubjectsForGrade(grade: string): string[] {
  return Object.entries(SUBJECT_CONFIGS)
    .filter(([_, config]) => config.applicableGrades.includes(grade))
    .map(([name, _]) => name)
}

// Grade calculation utility
export function calculateGrade(percentage: number): { grade: string; gradePoint: number } {
  if (percentage >= 90) return { grade: "A+", gradePoint: 4.0 }
  if (percentage >= 80) return { grade: "A", gradePoint: 3.6 }
  if (percentage >= 70) return { grade: "B+", gradePoint: 3.2 }
  if (percentage >= 60) return { grade: "B", gradePoint: 2.8 }
  if (percentage >= 50) return { grade: "C+", gradePoint: 2.4 }
  if (percentage >= 40) return { grade: "C", gradePoint: 2.0 }
  if (percentage >= 30) return { grade: "D+", gradePoint: 1.6 }
  if (percentage >= 20) return { grade: "D", gradePoint: 1.2 }
  return { grade: "E", gradePoint: 0.8 }
}
