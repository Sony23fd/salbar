import { getIronSession, IronSession } from "iron-session"
import { cookies } from "next/headers"

export interface AdminSessionData {
  userId: string
  email: string
  name: string
  role: "ADMIN" | "CARGO_ADMIN" | "DATAADMIN" | "BRANCH_MANAGER"
  isLoggedIn: boolean
}

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  cookieName: "anar-admin-session",
  cookieOptions: {
    secure: false, // process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8 hours
  },
}

export async function getSession(rememberMe: boolean = false): Promise<IronSession<AdminSessionData>> {
  const cookieStore = await cookies()
  const options = { ...SESSION_OPTIONS }
  if (rememberMe) {
    options.cookieOptions = { ...options.cookieOptions, maxAge: 60 * 60 * 24 * 30 } // 30 days
  }
  const session = await getIronSession<AdminSessionData>(cookieStore, options)
  return session
}

export async function createSession(data: Omit<AdminSessionData, "isLoggedIn">, rememberMe: boolean = false) {
  const session = await getSession(rememberMe)
  session.userId = data.userId
  session.email = data.email
  session.name = data.name
  session.role = data.role
  session.isLoggedIn = true
  await session.save()
}

export async function destroySession() {
  const session = await getSession()
  session.destroy()
}
