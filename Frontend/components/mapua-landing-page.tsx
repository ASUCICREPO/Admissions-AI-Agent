"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

interface MapuaLandingPageProps {
  onInquireNow: () => void
}

const programs = [
  {
    title: "Graduate",
    description: "Advanced degrees for career advancement and specialized expertise.",
    image: "/images/graduate.jpg",
  },
  {
    title: "Fully Online",
    description: "Flexible learning that fits your schedule, anywhere in the world.",
    image: "/images/online.jpg",
  },
  {
    title: "Senior High School",
    description: "Prepare for university with our comprehensive senior high school programs.",
    image: "/images/shs.jpg",
  },
  {
    title: "Undergraduate",
    description: "Begin your journey with our world-class undergraduate programs.",
    image: "/images/undergrad.jpg",
  },
]

export function MapuaLandingPage({ onInquireNow }: MapuaLandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedDegree, setSelectedDegree] = useState("")
  const [selectedArea, setSelectedArea] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % 2)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + 2) % 2)

  return (
    <div className="min-h-screen bg-white">
      {/* Top Announcement Banner */}
      <div className="bg-gray-800 text-white py-3 px-4 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-center flex-1">
            The A.Y. 2025-2026 online enrollment for incoming Grade 11 and college freshmen are now open. Click here to begin!
          </p>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300">
            ✕
          </button>
        </div>
      </div>

      {/* Header/Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/mapua-univ-logo.png" alt="Mapúa University" className="h-12" />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="border-[#9a1c14] text-[#9a1c14] hover:bg-[#9a1c14] hover:text-white">
              GET HELP
            </Button>
            <Button className="bg-[#9a1c14] hover:bg-[#7a1510] text-white">
              APPLY NOW
            </Button>
            <button className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Carousel */}
      <div className="relative bg-gray-900 overflow-hidden">
        <div className="relative h-[600px]">
          {/* Slide 1 */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              currentSlide === 0 ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/hero-enrollment.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
              <div className="text-white max-w-2xl">
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  SENIOR HIGH SCHOOL &<br />
                  UNDERGRADUATE<br />
                  ENROLLMENT NOW OPEN
                </h1>
                <p className="text-xl mb-8">
                  Gain a senior high school and college education at a top institution that builds learners for
                  academic and career success. Online enrollment for incoming Grade 11 and college freshmen this A.Y. 2025-2026 are now open!
                </p>
                <Button className="bg-[#9a1c14] hover:bg-[#7a1510] text-white px-8 py-6 text-lg rounded-md">
                  ENROLL NOW →
                </Button>
              </div>
              <div className="mt-4 text-white">
                <p className="text-sm">1 / 5</p>
                <p className="text-lg font-semibold mt-2">Next</p>
                <p className="text-sm uppercase">ACCESS WORLD-CLASS ONLINE EDUCATION ANYTIME, ANYWHERE</p>
              </div>
            </div>
          </div>

          {/* Slide 2 */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              currentSlide === 1 ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/hero-online.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
              <div className="text-white max-w-2xl">
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  ACCESS WORLD-CLASS<br />
                  ONLINE EDUCATION<br />
                  ANYTIME, ANYWHERE
                </h1>
                <p className="text-xl mb-8">
                  Experience flexible learning with our comprehensive online programs designed for your success.
                </p>
                <Button className="bg-[#9a1c14] hover:bg-[#7a1510] text-white px-8 py-6 text-lg rounded-md">
                  LEARN MORE →
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-colors z-10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-colors z-10"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Program Finder Section */}
      <div className="bg-[#c41e3a] py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            BE BUILT FOR THE WORLD AND FIND THE<br />RIGHT PROGRAM FOR YOU
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <select
              value={selectedDegree}
              onChange={(e) => setSelectedDegree(e.target.value)}
              className="px-6 py-4 rounded-md text-gray-700 bg-white border-2 border-gray-300 focus:border-[#9a1c14] focus:outline-none"
            >
              <option value="">Select Degree</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="senior-high">Senior High School</option>
            </select>

            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-6 py-4 rounded-md text-gray-700 bg-white border-2 border-gray-300 focus:border-[#9a1c14] focus:outline-none"
            >
              <option value="">Area of Study</option>
              <option value="engineering">Engineering</option>
              <option value="architecture">Architecture & Design</option>
              <option value="it">Information Technology</option>
              <option value="business">Business</option>
              <option value="science">Science</option>
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-6 py-4 rounded-md text-gray-700 bg-white border-2 border-gray-300 focus:border-[#9a1c14] focus:outline-none"
            >
              <option value="">Select Location</option>
              <option value="manila">Manila</option>
              <option value="makati">Makati</option>
              <option value="laguna">Laguna</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="text-center">
            <Button className="bg-[#f5a623] hover:bg-[#e09515] text-white px-12 py-6 text-lg rounded-md font-bold">
              FIND YOUR PROGRAM
            </Button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-[#1e293b] mb-6">
                IGNITING EXCELLENCE AS A PREMIER<br />ENGINEERING SCHOOL IN THE PHILIPPINES
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Mapúa University, founded in 1925 by Don Tomas Mapúa, is a world-class higher education institution in the Philippines dedicated to
                providing a learning environment rooted in discipline, excellence, commitment, integrity, and relevance. Recognized by the 2025 Times
                Higher Education (THE) World University Rankings (WUR) as one of the best schools in the world, our academic stronghold provides a
                diverse array of programs grounded in engineering and science, architecture and design, information technology, business and health
                sciences, and media studies.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mb-8">
                Our goal is to foster an atmosphere that promotes academic rigor and practical expertise, enabling students to compete on a global scale.
                And with strong moral fibers and first-rate student support, graduates are empowered to make a lasting and meaningful impact.
              </p>
              <div className="flex gap-4">
                <Button onClick={onInquireNow} className="bg-[#9a1c14] hover:bg-[#7a1510] text-white px-8 py-3 rounded-md">
                  INQUIRE NOW
                </Button>
                <Button variant="outline" className="border-[#9a1c14] text-[#9a1c14] hover:bg-[#9a1c14] hover:text-white px-8 py-3 rounded-md">
                  ABOUT US →
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src="/img-mapua-sec-1.webp"
                alt="Mapúa Students"
                className="rounded-lg shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Program Categories */}
      <div className="bg-[#c41e3a] py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            BE A PART OF THE GROUNDBREAKING<br />ACADEMIC SUCCESS
          </h2>

          <p className="text-white text-center text-lg mb-12 max-w-4xl mx-auto leading-relaxed">
            Highly regarded as an engineering and technological institution in the Philippines, Mapúa provides a comprehensive curriculum for senior high school students, undergraduates,
            graduates, and those interested in fully online programs.
          </p>

          <p className="text-white text-center text-lg mb-16 max-w-4xl mx-auto leading-relaxed">
            A world-class education is at the heart of every degree and program, ensuring students are well-prepared to compete on a global scale. The university's rigorous academic
            program emphasizes practical skills and character development to position students for industry leadership and environmental stewardship. Explore your options today and join
            one of the many programs offered by Mapúa University.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {programs.map((program) => (
              <Card key={program.title} className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer group">
                <div className="relative h-64 bg-gray-200 overflow-hidden">
                  <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">{program.title}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <h3 className="text-2xl font-bold text-[#f5a623]">{program.title}</h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-gray-700 text-sm leading-relaxed">{program.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#1e293b] mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-gray-700 text-lg mb-8">
            Have questions about admissions, programs, or campus life? Our team is here to help you every step of the way.
          </p>
          <Button
            onClick={onInquireNow}
            className="bg-[#9a1c14] hover:bg-[#7a1510] text-white px-12 py-6 text-xl rounded-md font-bold"
          >
            INQUIRE NOW
          </Button>
        </div>
      </div>
    </div>
  )
}
