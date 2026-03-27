import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { BookOpen, Users, TrendingUp, CheckCircle } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Assignments & Materials",
    description: "Create, assign, and track work in one organized place.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "See how students are improving with clear, visual reports.",
  },
  {
    icon: Users,
    title: "Family Connected",
    description: "Parents stay informed and involved in their child's learning.",
  },
  {
    icon: CheckCircle,
    title: "Simple & Focused",
    description: "A distraction-free environment built for learning, not browsing.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo variant="transparent" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-accent"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-accent text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <CheckCircle className="w-3.5 h-3.5" />
            Built for home educators and tutors
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-5 leading-tight">
            Learning made simple.<br />
            <span className="text-primary">Progress made visible.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Lyra Preparatory connects teachers, parents, and students in one clean platform —
            with assignments, attendance, progress tracking, and live sessions.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors text-sm"
            >
              Start for free
            </Link>
            <Link
              href="/login"
              className="border border-border text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-muted transition-colors text-sm"
            >
              Sign in to your account
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Students —{" "}
            <Link href="/student-signup" className="text-primary hover:underline">
              join with an invite code
            </Link>
          </p>
        </section>

        {/* Role cards */}
        <section className="bg-muted border-y border-border py-14">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-center text-xl font-semibold text-foreground mb-8">
              One platform, three journeys
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  role: "Teachers",
                  color: "bg-blue-50 border-blue-200",
                  dot: "bg-blue-500",
                  items: ["Create & grade assignments", "Upload study materials", "Track attendance", "Run live sessions"],
                },
                {
                  role: "Parents",
                  color: "bg-green-50 border-green-200",
                  dot: "bg-green-500",
                  items: ["Monitor child's progress", "Invite & manage students", "View attendance records", "Request tutors"],
                },
                {
                  role: "Students",
                  color: "bg-purple-50 border-purple-200",
                  dot: "bg-purple-500",
                  items: ["Submit assignments", "Access study materials", "Join live sessions", "Earn badges & rewards"],
                },
              ].map(({ role, color, dot, items }) => (
                <div key={role} className={`rounded-xl border p-5 ${color}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                    <h3 className="font-semibold text-foreground">{role}</h3>
                  </div>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-center text-xl font-semibold text-foreground mb-8">
            Everything you need to teach and learn
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-white">
                <div className="bg-accent p-2.5 rounded-lg shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-14">
          <div className="max-w-xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
            <p className="text-white/80 text-sm mb-6">
              Create your free account today and bring your classroom together.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-white text-primary font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-colors text-sm"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Lyra Preparatory — Built with care for modern learners.
      </footer>
    </div>
  );
}
