import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { title, description, quantity, location, category, tags } = body

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
  }
  if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
    return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 })
  }

  try {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(quantity !== undefined && { quantity }),
        ...(location !== undefined && { location }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags }),
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
}
