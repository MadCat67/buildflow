import type { Project } from '../db/schema.js'

declare global {
  namespace Express {
    interface Request {
      project?: Project
    }
  }
}

export {}
