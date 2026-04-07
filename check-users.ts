import { prisma } from './src/lib/db/prisma'

async function main() {
  const users = await prisma.user.findMany({
    include: { subscription: true, creditBalance: true },
    orderBy: { createdAt: 'asc' },
    take: 10
  })
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    plan: u.subscription?.plan,
    status: u.subscription?.status,
    balance: u.creditBalance?.balance,
    monthlyCredits: u.subscription?.monthlyCredits
  })), null, 2))
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1); })
