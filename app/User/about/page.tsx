"use client";

import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function About() {
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
            <Link href="/about" className="text-blue-400">About</Link>
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

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
              About Data-vidya
            </h1>
            <div className="space-y-6">
              <p className="text-blue-200">
                Data-vidya is a pioneering platform dedicated to transforming data science education. 
                We believe in learning by doing, which is why our platform focuses on hands-on 
                experience through interactive labs and real-world projects.
              </p>
              <p className="text-blue-200">
                Our mission is to make data science education accessible, practical, and effective. 
                We provide a comprehensive learning environment where students can experiment with 
                real datasets, build practical skills, and receive guidance from industry experts.
              </p>
              <p className="text-blue-200">
                Whether  just starting your journey in data science or looking to advance your 
                career, our platform provides the tools, resources, and support you need to succeed.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-blue-800 bg-blue-950/50">
        <div className="container mx-auto px-4 text-center text-sm text-blue-400">
          Copyright © 2025 Data-vidya
        </div>
      </footer>
    </div>
  );
}