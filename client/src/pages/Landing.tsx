import { Link } from "wouter";
import { Logo } from "@/components/Logo";
import {
  CheckCircle,
  BookOpen,
  TrendingUp,
  Users,
  ChevronRight,
  ClipboardList,
  Video,
  BarChart2,
  MessageSquare,
  GraduationCap,
  ShieldCheck,
  Heart,
  Star,
  CalendarDays,
  Award,
} from "lucide-react";
import parentChild1 from "../assets/parent_child_1.jpg";
import parentChild2 from "../assets/parent_child_2.jpg";
import parentChild3 from "../assets/parent_child_3.jpg";

const BotanicalPattern = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M100,400 C150,250 250,150 400,50" />
      <path d="M120,340 C90,320 80,280 110,260 C120,270 130,290 120,340" fill="currentColor" fillOpacity="0.1" />
      <path d="M150,260 C110,240 100,190 140,170 C155,185 165,210 150,260" fill="currentColor" fillOpacity="0.1" />
      <path d="M190,190 C150,160 140,110 180,90 C195,110 205,140 190,190" fill="currentColor" fillOpacity="0.1" />
      <path d="M240,130 C200,100 190,50 230,30 C245,50 255,80 240,130" fill="currentColor" fillOpacity="0.1" />
      <path d="M130,350 C160,370 200,360 210,320 C190,320 160,330 130,350" fill="currentColor" fillOpacity="0.1" />
      <path d="M165,270 C205,290 250,280 260,230 C235,235 200,245 165,270" fill="currentColor" fillOpacity="0.1" />
      <path d="M210,195 C250,210 295,190 300,140 C275,150 240,165 210,195" fill="currentColor" fillOpacity="0.1" />
      <path d="M0,350 C100,300 200,200 250,0" />
      <path d="M30,330 C10,300 -10,260 20,230 C35,250 45,280 30,330" fill="currentColor" fillOpacity="0.1" />
      <path d="M70,280 C40,240 20,190 60,160 C75,185 85,220 70,280" fill="currentColor" fillOpacity="0.1" />
      <path d="M40,335 C80,360 120,340 130,290 C105,295 70,310 40,335" fill="currentColor" fillOpacity="0.1" />
      <path d="M90,265 C135,285 180,260 185,200 C160,210 120,230 90,265" fill="currentColor" fillOpacity="0.1" />
      <path d="M250,400 C280,300 350,200 450,150" strokeWidth="1" />
      <path d="M300,400 C320,320 380,250 480,210" strokeWidth="1" />
      <path d="M-50,200 C50,180 150,100 200,-50" strokeWidth="1" />
    </g>
  </svg>
);

const OrganicBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[50%] w-[40rem] h-[40rem] rounded-full bg-emerald-100 opacity-20 blur-[100px]" />
    <div className="absolute top-[20%] left-[-15%] w-[35rem] h-[35rem] rounded-full bg-teal-50 opacity-30 blur-[80px]" />
    <div className="absolute top-[60%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-emerald-100 opacity-25 blur-[120px]" />
    <div className="absolute bottom-[-15%] left-[10%] w-[30rem] h-[30rem] rounded-full bg-teal-50 opacity-20 blur-[90px]" />
    <BotanicalPattern className="absolute top-[-5%] right-[-10%] w-[800px] h-[800px] text-primary transform rotate-12 opacity-[0.06]" />
    <BotanicalPattern className="absolute top-[5%] left-[-5%] w-[500px] h-[500px] text-primary transform rotate-[110deg] opacity-[0.04]" />
    <BotanicalPattern className="absolute bottom-[-5%] right-[-10%] w-[850px] h-[850px] text-primary transform rotate-[165deg] opacity-[0.07]" />
    <BotanicalPattern className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] text-primary transform rotate-[60deg] opacity-[0.05]" />
  </div>
);

const features = [
  {
    icon: ClipboardList,
    title: "Assignments & Grading",
    body: "Create assignments with form-based questions, file uploads, and weighted grading across four item types.",
    color: "text-primary",
    bg: "bg-emerald-50",
  },
  {
    icon: BookOpen,
    title: "Study Materials",
    body: "Upload PDFs, images, and resources organised by classroom. Students access everything in one place.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart2,
    title: "Progress Reports",
    body: "Visual grade breakdowns with weighted scoring give parents and teachers a clear picture of performance.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Video,
    title: "Live Sessions",
    body: "Schedule and run tutoring sessions directly inside the platform — no third-party tools needed.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: CalendarDays,
    title: "Attendance Tracking",
    body: "Mark and monitor attendance for every session. Parents see records instantly.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    body: "Teachers, parents, and students communicate in threaded, private conversations — all in one safe space.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

const whyCards = [
  {
    index: "01",
    icon: <GraduationCap size={20} className="text-primary" />,
    bg: "bg-emerald-50 border-emerald-200",
    title: "Built for home educators & tutors",
    body: "Designed from the ground up for small-group and one-on-one instruction — not a big-school LMS scaled down.",
  },
  {
    index: "02",
    icon: <Users size={20} className="text-blue-600" />,
    bg: "bg-blue-50 border-blue-200",
    title: "Teacher, parent & student connected",
    body: "Every role gets its own dashboard with the right information — without overwhelming anyone.",
  },
  {
    index: "03",
    icon: <ShieldCheck size={20} className="text-violet-600" />,
    bg: "bg-violet-50 border-violet-200",
    title: "Safe, private, invite-only",
    body: "Students join only with a code generated by their parent. No public signups, no strangers in your classroom.",
  },
  {
    index: "04",
    icon: <Award size={20} className="text-amber-600" />,
    bg: "bg-amber-50 border-amber-200",
    title: "Streaks, badges & rewards",
    body: "Gamified progress keeps students motivated — day streaks, points, and badges for completing work on time.",
  },
];

const benefits = [
  {
    icon: <Heart size={28} strokeWidth={1.5} />,
    bg: "bg-rose-50 border-rose-200 text-rose-500",
    title: "Less admin. More teaching.",
    body: "Stop spending evenings on paperwork. Lyra handles tracking, grading, and reporting so you can focus on what matters.",
  },
  {
    icon: <Users size={28} strokeWidth={1.5} />,
    bg: "bg-blue-50 border-blue-200 text-blue-500",
    title: "Parents who are truly in the loop.",
    body: "Real-time progress, assignment updates, and direct messaging — parents become partners in their child's education.",
  },
  {
    icon: <Star size={28} strokeWidth={1.5} />,
    bg: "bg-amber-50 border-amber-200 text-amber-500",
    title: "Students who stay motivated.",
    body: "Streaks, badges, and visible progress give students a reason to show up and do the work every single day.",
  },
];

const testimonials = [
  {
    image: parentChild1,
    quote: "Lyra has completely changed how I manage my classes. Grading and attendance used to take hours — now it's minutes.",
    name: "Sarah O.",
    role: "Home Educator · 6 years",
  },
  {
    image: parentChild3,
    quote: "As a parent I can finally see exactly what my son is working on and how he's progressing. It's given us so much more to talk about.",
    name: "Marcus T.",
    role: "Parent of 2 students",
  },
  {
    image: null,
    quote: "I love seeing my streak and earning badges — it actually makes me want to complete my work on time!",
    name: "Amara J.",
    role: "Student · Age 14",
    initial: "A",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">

      {/* ── HERO ── */}
      <section className="relative w-full pt-6 pb-20 overflow-hidden bg-white">
        <OrganicBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Nav */}
          <header className="flex justify-between items-center mb-12 md:mb-20">
            <Logo variant="transparent" />
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="text-sm font-semibold px-3 py-2.5 min-h-[44px] inline-flex items-center text-gray-700 hover:text-primary transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold px-5 py-2.5 min-h-[44px] inline-flex items-center bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-sm"
              >
                Get started free
              </Link>
            </div>
          </header>

          {/* Hero body */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Left — copy */}
            <div className="flex-[1.2] text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-emerald-200">
                <CheckCircle size={13} />
                Built for home educators &amp; private tutors
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-5 leading-tight">
                Learning made simple.{" "}
                <br className="hidden lg:block" />
                <span className="text-primary">Progress made visible.</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Lyra Preparatory connects teachers, parents, and students in one clean platform — with assignments, attendance, progress tracking, and live sessions.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-4">
                <Link
                  href="/signup"
                  className="px-8 py-3 min-h-[44px] inline-flex items-center bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all shadow-md"
                >
                  Start for free
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-3 min-h-[44px] inline-flex items-center bg-white text-gray-700 border border-gray-200 rounded-full font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                  Sign in
                </Link>
              </div>
              <p className="text-xs text-gray-400">
                Student?{" "}
                <Link href="/student-signup" className="text-primary hover:underline font-semibold">
                  Join with an invite code →
                </Link>
              </p>
            </div>

            {/* Right — image with floating badges */}
            <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-xl relative">
              <div className="absolute -top-6 -right-6 w-48 h-48 bg-emerald-100 rounded-full -z-10 opacity-60 blur-3xl" />
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <img
                  src={parentChild2}
                  alt="Parent and child learning together"
                  className="w-full h-auto max-h-[420px] sm:max-h-[480px] object-cover hover:scale-[1.02] transition-transform duration-500"
                />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              {/* Badge — bottom left */}
              <div className="absolute -bottom-5 -left-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3 z-20">
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Progress tracked</p>
                  <p className="text-[10px] text-gray-400">Every assignment, every day</p>
                </div>
              </div>
              {/* Badge — top left */}
              <div className="absolute -top-4 -left-2 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3 z-20">
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Star size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Streak: 12 days 🔥</p>
                  <p className="text-[10px] text-gray-400">Keep it going!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="w-full py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Simple by design</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">How Lyra Works</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              From first classroom to graded report — get your entire learning circle set up in under ten minutes.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-[42px] left-[calc(16.67%+22px)] right-[calc(16.67%+22px)] h-px bg-gradient-to-r from-emerald-200 via-primary/40 to-amber-200 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
              {[
                {
                  label: "Step 1",
                  icon: <GraduationCap size={22} strokeWidth={1.5} className="text-primary" />,
                  iconBg: "bg-emerald-50 border-emerald-100",
                  title: "Set up your classroom",
                  body: "Teachers create a classroom in minutes — add subjects, set grade levels, and upload materials from day one.",
                  featured: false,
                },
                {
                  label: "Step 2",
                  icon: <Users size={22} strokeWidth={1.5} className="text-primary" />,
                  iconBg: "bg-emerald-50 border-emerald-100",
                  title: "Invite students & parents",
                  body: "Parents generate secure invite codes for their children. Students join instantly with a 6-character code — no email needed.",
                  featured: true,
                },
                {
                  label: "Step 3",
                  icon: <TrendingUp size={22} strokeWidth={1.5} className="text-amber-600" />,
                  iconBg: "bg-amber-50 border-amber-100",
                  title: "Track progress together",
                  body: "Assignments get graded, reports generated, and everyone — teachers, parents, students — sees progress in real time.",
                  featured: false,
                },
              ].map(({ label, icon, iconBg, title, body, featured }) => (
                <div
                  key={label}
                  className={`bg-white border rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow relative ${featured ? "border-primary/30 shadow-md" : "border-gray-100"}`}
                >
                  {featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-3 py-1 rounded-full tracking-wider shadow">
                      YOUR FOUNDATION
                    </div>
                  )}
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 border shadow-sm ${iconBg}`}>
                    {icon}
                  </div>
                  <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1.5">{label}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="w-full py-20 bg-[#f8f9fa] border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Full toolkit</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">Everything you need to teach and learn</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              All the tools for modern home education — in one focused platform.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, body, color, bg }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={20} className={color} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 mb-1">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE LYRA — split image + feature grid ── */}
      <section className="w-full py-20 bg-[#f4f1e8] border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl overflow-hidden border-t-4 border-primary shadow-sm">
            <div className="flex flex-col lg:flex-row">

              {/* Image panel */}
              <div className="lg:w-[42%] flex flex-col">
                <div className="overflow-hidden flex-1 min-h-[260px] sm:min-h-[320px] lg:min-h-[500px] relative">
                  <img
                    src={parentChild1}
                    alt="Parent and child working on Lyra Preparatory"
                    className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                </div>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 -mt-2 bg-white">
                  <h2 className="text-2xl font-bold mb-3 text-gray-900 leading-snug">
                    Why Choose Lyra Preparatory?
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    Most platforms were built for large schools. Lyra was built for the way you actually teach — small groups, involved parents, and students who need encouragement, not just grades.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-bold hover:bg-gray-700 transition-colors group"
                  >
                    Start for Free
                    <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              <div className="hidden lg:block w-px bg-gray-100 my-8" />

              {/* Feature grid */}
              <div className="lg:w-[58%] p-6 sm:p-8 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-6">
                  What makes us different
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {whyCards.map((card, i) => (
                    <div
                      key={i}
                      className={`${card.bg} border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow relative`}
                    >
                      <span className="absolute top-4 right-4 text-[11px] font-bold text-gray-200 select-none">
                        {card.index}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        {card.icon}
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 leading-snug">{card.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{card.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative w-full py-20 overflow-hidden bg-white border-t border-gray-100">
        <OrganicBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Loved by educators &amp; families</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">What our community says</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Hear from the teachers, parents, and students who use Lyra every day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ image, quote, name, role, initial }, i) => (
              <div
                key={i}
                className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-6 flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden mb-5 border-2 border-primary/20 shadow-sm shrink-0">
                  {image ? (
                    <img src={image} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {initial}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">
                  "{quote}"
                </p>
                <div className="w-8 h-px bg-gray-200 mb-4" />
                <p className="font-bold text-xs text-gray-900">{name}</p>
                <p className="text-[10px] text-primary mt-0.5 font-semibold">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMPACT & BENEFITS ── */}
      <section className="w-full py-20 bg-[#f4f1e8] border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Wide image banner */}
          <div className="rounded-3xl overflow-hidden mb-16 shadow-md">
            <img
              src={parentChild3}
              alt="Family learning environment"
              className="w-full h-48 sm:h-64 object-cover object-center hover:scale-[1.01] transition-transform duration-700"
            />
          </div>

          <div className="text-center mb-12">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Why it matters</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">The impact of Lyra</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Designed to do more than track grades — Lyra helps build a more connected, motivated, and organised learning household.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map(({ icon, bg, title, body }, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 border ${bg}`}>
                  {icon}
                </div>
                <h3 className="font-bold text-base text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm max-w-[260px] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative w-full py-20 overflow-hidden bg-primary">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <BotanicalPattern className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] text-white transform rotate-12 opacity-[0.07]" />
          <BotanicalPattern className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] text-white transform -rotate-12 opacity-[0.07]" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-4">Ready to begin?</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Bring your classroom together today.
          </h2>
          <p className="text-white/75 text-base mb-8 leading-relaxed">
            Create your free account in minutes. Invite students, start assigning, and watch progress happen.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3 min-h-[44px] bg-white text-primary rounded-full font-bold hover:bg-white/90 transition-colors shadow-lg group"
            >
              Create your account
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-3 min-h-[44px] bg-white/10 text-white border border-white/20 rounded-full font-bold hover:bg-white/20 transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-white/50 text-xs">
            Student?{" "}
            <Link href="/student-signup" className="text-white/80 hover:text-white underline transition-colors">
              Join with an invite code
            </Link>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="transparent" />
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} Lyra Preparatory — Built with care for modern learners.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/login" className="hover:text-primary transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-primary transition-colors">Sign up</Link>
            <Link href="/student-signup" className="hover:text-primary transition-colors">Student join</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
