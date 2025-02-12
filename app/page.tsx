"use client";

import { Button } from "../ui/button";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-blue-950/80 backdrop-blur-sm border-b border-blue-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-blue-400" />
            <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
              Data-vidya
            </span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-blue-100 hover:text-blue-400 transition-colors">Home</Link>
            <Link href="/about" className="text-blue-100 hover:text-blue-400 transition-colors">About</Link>
            <Link href="/contact" className="text-blue-100 hover:text-blue-400 transition-colors">Contact</Link>
            <Link href="/signin">
              <Button variant="secondary" size="sm" className="bg-blue-800 text-blue-100 hover:bg-blue-700 border-none">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-blue-950">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(40deg,rgba(59,130,246,0.1),rgba(99,102,241,0.1))]" />
        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-blue-900/50 px-4 py-2 rounded-full border border-blue-800 mb-6">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Transform Your Data Science Journey</span>
            </div>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 text-transparent bg-clip-text">
              Learn Data Science with Hands-on Labs
            </h1>
            <p className="text-xl text-blue-200 mb-8">
              Master data science through practical experience with our interactive labs and expert guidance
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-blue-950 gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-8 mt-20"
          >
            <div className="bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-blue-800">
              <div className="h-12 w-12 bg-blue-800/50 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-blue-100">Interactive Learning</h3>
              <p className="text-blue-300">Learn by doing with our hands-on labs and real-world projects</p>
            </div>

            <div className="bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-blue-800">
              <div className="h-12 w-12 bg-blue-800/50 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-blue-100">Expert Guidance</h3>
              <p className="text-blue-300">Get support from experienced data scientists and mentors</p>
            </div>

            <div className="bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-blue-800">
              <div className="h-12 w-12 bg-blue-800/50 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-blue-100">Industry Ready</h3>
              <p className="text-blue-300">Build a portfolio of projects that showcase your skills</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-blue-800 bg-blue-950/50">
        <div className="container mx-auto px-4 text-center text-sm text-blue-400">
          Copyright © 2025 Data-vidya
        </div>
      </footer>
    </div>
  );
}