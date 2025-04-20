import { format } from "date-fns"

// Custom BS Date class
export interface BsDate {
  year: number
  month: number // 1=Baishakh, 12=Chaitra
  day: number
  adDate: Date
}

// Nepali month names
export const nepaliMonths = [
  "Baishakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
]

// Nepali month names in Nepali
export const nepaliMonthsNp = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भदौ",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पौष",
  "माघ",
  "फाल्गुन",
  "चैत्र",
]

// Nepali day names
export const nepaliDays = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"]

// Nepali digits
export const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"]

// Convert number to Nepali digits
export function toNepaliDigits(num: number): string {
  return num
    .toString()
    .split("")
    .map((digit) => nepaliDigits[Number.parseInt(digit)] || digit)
    .join("")
}

// Custom BS Calendar for 2081–2086
export class BsCalendar {
  private static monthDays = [31, 31, 32, 32, 31, 30, 30, 29, 29, 30, 30, 30]
  private static leapYears = new Set([2082]) // Adjust Falgun/Chaitra for leap years
  private static calendar: BsDate[] = []

  static {
    let currentAdDate = new Date(2024, 3, 13) // 2081 Baishakh 1 (month is 0-indexed in JS)
    for (let year = 2081; year <= 2086; year++) {
      const isLeap = this.leapYears.has(year)
      for (let month = 1; month <= 12; month++) {
        let days
        if (month === 11 && isLeap) {
          days = 31 // Falgun in leap year
        } else if (month === 12 && isLeap) {
          days = 31 // Chaitra in leap year
        } else if (month === 12 && year === 2081) {
          days = 31 // Special case for Chaitra 2081
        } else {
          days = this.monthDays[month - 1]
        }

        for (let day = 1; day <= days; day++) {
          this.calendar.push({
            year,
            month,
            day,
            adDate: new Date(currentAdDate),
          })
          currentAdDate = new Date(currentAdDate)
          currentAdDate.setDate(currentAdDate.getDate() + 1)
        }
      }
    }
  }

  static getBsDate(adDate: Date): BsDate | undefined {
    // Format dates to compare only year, month, day (not time)
    const formattedAdDate = format(adDate, "yyyy-MM-dd")
    return this.calendar.find((bsDate) => format(bsDate.adDate, "yyyy-MM-dd") === formattedAdDate)
  }

  static getAdDate(year: number, month: number, day: number): Date | undefined {
    const bsDate = this.calendar.find((date) => date.year === year && date.month === month && date.day === day)
    return bsDate?.adDate
  }

  static getPreviousBsDate(current: BsDate): BsDate | undefined {
    const index = this.calendar.findIndex(
      (date) => date.year === current.year && date.month === current.month && date.day === current.day,
    )
    return index > 0 ? this.calendar[index - 1] : undefined
  }

  static getNextBsDate(current: BsDate): BsDate | undefined {
    const index = this.calendar.findIndex(
      (date) => date.year === current.year && date.month === current.month && date.day === current.day,
    )
    return index < this.calendar.length - 1 ? this.calendar[index + 1] : undefined
  }

  static getCurrentBsDate(): BsDate {
    const today = new Date()
    const bsDate = this.getBsDate(today)

    // If current date is not in our range, return the first date of our calendar
    if (!bsDate) {
      return this.calendar[0]
    }

    return bsDate
  }

  static formatBsDate(bsDate: BsDate, useNepaliDigits = false): string {
    if (useNepaliDigits) {
      return `${toNepaliDigits(bsDate.year)} ${nepaliMonthsNp[bsDate.month - 1]} ${toNepaliDigits(bsDate.day)}`
    }
    return `${bsDate.year} ${nepaliMonths[bsDate.month - 1]} ${bsDate.day}`
  }

  static getDaysInMonth(year: number, month: number): number {
    const isLeap = this.leapYears.has(year)

    if (month === 11 && isLeap) {
      return 31 // Falgun in leap year
    } else if (month === 12 && isLeap) {
      return 31 // Chaitra in leap year
    } else if (month === 12 && year === 2081) {
      return 31 // Special case for Chaitra 2081
    } else {
      return this.monthDays[month - 1]
    }
  }
}
