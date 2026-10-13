import { prisma } from './prisma'
import { sendPush } from './apns'

export type NotificationKind =
  | 'birthdayReminders'
  | 'friendSentCard'
  | 'friendRequestAccepted'
  | 'inviteUsed'
  | 'friendStatusUpdate'

async function userAllows(userId: string, kind: NotificationKind): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyBirthdays: true,
      notifyFriendSentCard: true,
      notifyFriendRequestAccepted: true,
      notifyInviteUsed: true,
      notifyFriendStatusUpdate: true,
    },
  })
  if (!u) return false
  switch (kind) {
    case 'birthdayReminders': return u.notifyBirthdays
    case 'friendSentCard': return u.notifyFriendSentCard
    case 'friendRequestAccepted': return u.notifyFriendRequestAccepted
    case 'inviteUsed': return u.notifyInviteUsed
    case 'friendStatusUpdate': return u.notifyFriendStatusUpdate
  }
}

// Sends a push to every device a user has registered, skipping it entirely
// if they've turned this kind of notification off. Dead tokens get pruned.
export async function notifyUser(userId: string, kind: NotificationKind, title: string, body: string): Promise<void> {
  if (!(await userAllows(userId, kind))) return
  const tokens = await prisma.deviceToken.findMany({ where: { userId } })
  for (const t of tokens) {
    const ok = await sendPush(t.token, title, body)
    if (!ok) await prisma.deviceToken.delete({ where: { id: t.id } }).catch(() => {})
  }
}
