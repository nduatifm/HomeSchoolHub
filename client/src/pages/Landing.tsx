import React from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";

export default function Landing() {
    return (
        <div className="min-h-screen landing-gradient flex items-center justify-center relative overflow-hidden">
            {/* Decorative floating blobs */}
            <motion.div
                className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-purple/30 blur-3xl"
                animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
                className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-green/25 blur-3xl"
                animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 w-full max-w-6xl px-6 py-20"
            >
                <div className="flex items-center justify-between mb-8">
                    <Logo variant={"transparent"} />
                    <div className="space-x-4">
                        <Link href="/login">
                            <a className="px-4 py-2 rounded-xl bg-white/90 hover:bg-white">Log in</a>
                        </Link>
                        <Link href="/signup">
                            <a className="px-4 py-2 rounded-xl bg-purple text-white">Sign up</a>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div>
                        <motion.h1
                            initial={{ x: -40, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl md:text-6xl font-extrabold leading-tight mb-6"
                        >
                            Grow learners. Empower families. Simplify teaching.
                        </motion.h1>

                        <motion.p
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="text-lg text-muted-foreground mb-6 max-w-prose"
                        >
                            HomeSchoolHub is an all-in-one platform for parents, tutors, and students —
                            with attendance, assignments, progress tracking, and live chat built for
                            modern education.
                        </motion.p>

                        <motion.div
                            initial={{ scale: 0.98 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex gap-4"
                        >
                            <Link href="/signup">
                                <a className="px-6 py-3 rounded-xl bg-purple text-white font-semibold shadow-lg">Get started</a>
                            </Link>
                            <Link href="/login">
                                <a className="px-6 py-3 rounded-xl border border-white/30">Learn more</a>
                            </Link>
                        </motion.div>

                        <div className="mt-10 grid grid-cols-2 gap-4">
                            <div className="rounded-xl bg-white/70 p-4 shadow-lg">
                                <h3 className="font-semibold">For Parents</h3>
                                <p className="text-sm text-muted-foreground">Track progress and communicate with tutors easily.</p>
                            </div>
                            <div className="rounded-xl bg-white/70 p-4 shadow-lg">
                                <h3 className="font-semibold">For Tutors</h3>
                                <p className="text-sm text-muted-foreground">Manage classes and assignments in one place.</p>
                            </div>
                        </div>
                        <div className="rounded-xl bg-white/70 p-4 shadow-lg mt-4">
                            <h3 className="font-semibold">For Student</h3>
                            <p className="text-sm text-muted-foreground">Access classes, track assignments, and monitor your learning progress easily.</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0.95, rotate: -6, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ delay: 0.45 }}
                            className="relative w-full max-w-sm"
                        >
                            <div className="rounded-2xl p-6 bg-white/90 shadow-2xl">
                                <h4 className="font-bold mb-2">Live class preview</h4>
                                <p className="text-sm text-muted-foreground">See how sessions, assignments and progress appear to students.</p>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-light-purple p-2 text-center">Attendance</div>
                                    <div className="rounded-lg bg-light-green p-2 text-center">Assignments</div>
                                    <div className="rounded-lg bg-light-coral p-2 text-center">Progress</div>
                                    <div className="rounded-lg bg-light-orange p-2 text-center">Chat</div>
                                </div>
                            </div>

                            <motion.div
                                className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-purple/90 shadow-lg"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </motion.div>
                    </div>
                </div>

                <footer className="mt-16 text-sm text-muted-foreground text-center">
                    © {new Date().getFullYear()} HomeSchoolHub — Built with care for modern families.
                </footer>
            </motion.div>
        </div>
    );
}
