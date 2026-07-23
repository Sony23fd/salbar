import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function getWmsUserContext() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { authorized: false, user: null }
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      role: true,
      branchId: true,
      canViewOtherBranches: true
    }
  })

  if (!user || (user.role !== "ADMIN" && user.role !== "BRANCH_MANAGER")) {
    return { authorized: false, user: null }
  }

  return { authorized: true, user }
}

export function canViewBranch(user: any, targetBranchId: string) {
  if (user.role === "ADMIN") return true
  if (user.canViewOtherBranches) return true
  return user.branchId === targetBranchId
}
