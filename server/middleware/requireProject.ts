import { eq } from 'drizzle-orm'
import type { Request, Response, NextFunction } from 'express'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'

export async function getOwnedProject(
  projectId: string,
  userId: string,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project || project.userId !== userId) return null
  return project
}

export async function requireProject(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const project = await getOwnedProject(req.params.id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    req.project = project
    next()
  } catch (error) {
    next(error)
  }
}
