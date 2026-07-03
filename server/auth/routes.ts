import { Router } from 'express'
import passport from './passport.js'

const router = Router()

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
  }),
  (_req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/dashboard`)
  },
)

router.get('/me', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json({ user: req.user })
    return
  }
  res.status(401).json({ user: null })
})

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr)
      res.clearCookie('connect.sid')
      res.json({ success: true })
    })
  })
})

export default router
