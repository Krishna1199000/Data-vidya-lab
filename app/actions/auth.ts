'use server'

import db  from "../../src/index"
import { hash } from "bcrypt"
import { z } from "zod"

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const otpSchema = z.object({
  phone: z.string().min(10, "Invalid phone number"),
  otp: z.string().length(6, "OTP must be 6 digits"),
})

export async function signUp(data: z.infer<typeof signUpSchema>) {
  const validated = signUpSchema.parse(data)
  
  const exists = await db.user.findFirst({
    where: {
      email: validated.email,
    },
  })

  if (exists) {
    throw new Error("Email already exists")
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  console.log("OTP:", otp) // In production, send via SMS

  const hashedPassword = await hash(validated.password, 10)
  
  const user = await db.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      password: hashedPassword,
      profile: {
        create: {
          role: "user",
        }
      }
    },
  })

  return { success: true, userId: user.id }
}

export async function verifyOtp(data: z.infer<typeof otpSchema>) {
  const validated = otpSchema.parse(data)
  
  // For demo, accept any 6-digit OTP
  if (validated.otp.length === 6) {
    // In production, verify against stored OTP
    return { success: true }
  }

  throw new Error("Invalid OTP")
}

