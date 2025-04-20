import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="container flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sajha School Results</CardTitle>
          <CardDescription>Welcome to the school results management system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Link href="/teacher/login" className="w-full">
              <Button className="w-full">Teacher Login</Button>
            </Link>
            <Link href="/student" className="w-full">
              <Button variant="outline" className="w-full">
                Student Portal
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
