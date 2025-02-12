"use client";

import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { BookOpen, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Contact() {
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
            <Link href="/contact" className="text-blue-400">Contact</Link>
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
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
                Get in Touch
              </h1>
              <p className="text-blue-200">
                Have questions?  love to hear from you. Send us a message and  respond as soon as possible.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="p-6 bg-blue-900/30 backdrop-blur-sm border-blue-800">
                  <form className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">Name</label>
                      <Input placeholder="Your name" className="bg-blue-950/50 border-blue-800 text-blue-100 placeholder:text-blue-400/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">Email</label>
                      <Input type="email" placeholder="your@email.com" className="bg-blue-950/50 border-blue-800 text-blue-100 placeholder:text-blue-400/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">Message</label>
                      <Textarea placeholder="Your message" className="h-32 bg-blue-950/50 border-blue-800 text-blue-100 placeholder:text-blue-400/50" />
                    </div>
                    <Button className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-blue-950">
                      Send Message
                    </Button>
                  </form>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 bg-blue-800/50 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-100">Email</h3>
                      <p className="text-blue-300">support@data-vidya.com</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 bg-blue-800/50 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-100">Phone</h3>
                      <p className="text-blue-300">+1 (555) 123-4567</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 bg-blue-800/50 rounded-lg flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-100">Location</h3>
                      <p className="text-blue-300">123 Data Street, Analytics City, DS 12345</p>
                    </div>
                  </div>
                </div>
              </motion.div>
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