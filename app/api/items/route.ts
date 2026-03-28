import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.inventoryItem.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description = '', quantity = 0, location = '', category = '', tags = '' } = body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (typeof quantity !== 'number' || quantity < 0) {
    return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 })
  }

  const item = await prisma.inventoryItem.create({
    data: { title: title.trim(), description, quantity, location, category, tags },
  })
  return NextResponse.json(item, { status: 201 })
}
