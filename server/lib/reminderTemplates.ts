export type ReminderTone = 'gentle' | 'reminder' | 'firm'

export type ReminderContext = {
  clientName: string
  projectName: string
  stageName: string
  amount: number
  dueDate: string | null
  paymentLink: string
  daysUntilDue: number | null
}

function formatMoney(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function firstName(fullName: string) {
  return fullName.split(/[\s&]+/)[0] || fullName
}

export function buildReminderMessage(
  tone: ReminderTone,
  ctx: ReminderContext,
): { emailSubject: string; emailBody: string; smsBody: string } {
  const name = firstName(ctx.clientName)
  const amount = formatMoney(ctx.amount)
  const link = ctx.paymentLink

  if (tone === 'gentle') {
    const timing =
      ctx.daysUntilDue === 1
        ? 'wrapping up tomorrow'
        : ctx.daysUntilDue !== null && ctx.daysUntilDue <= 3
          ? 'wrapping up soon'
          : 'progressing on schedule'

    return {
      emailSubject: `Heads up: ${ctx.stageName} — ${ctx.projectName}`,
      emailBody: [
        `Hi ${name},`,
        '',
        `Just a heads up that the ${ctx.stageName.toLowerCase()} phase is ${timing}!`,
        '',
        `To keep the crew on schedule, please review and approve the invoice when you have a moment:`,
        `Amount: ${amount}`,
        link ? `Review invoice: ${link}` : '',
        '',
        `Thanks so much — we appreciate working with you!`,
        '',
        '— Sent on behalf of your contractor via BuildFlow',
      ]
        .filter(Boolean)
        .join('\n'),
      smsBody: `Hi ${name}! ${ctx.stageName} on ${ctx.projectName} is ${timing}. Please review the ${amount} invoice to keep subs on schedule: ${link}`,
    }
  }

  if (tone === 'reminder') {
    return {
      emailSubject: `Invoice ready: ${ctx.stageName} — ${ctx.projectName}`,
      emailBody: [
        `Hi ${name},`,
        '',
        `The ${ctx.stageName} milestone for ${ctx.projectName} is complete and ready for your approval.`,
        '',
        `Amount due: ${amount}`,
        ctx.dueDate ? `Due date: ${ctx.dueDate}` : '',
        link ? `Approve and pay: ${link}` : '',
        '',
        `Approving today helps us keep plumbers, electricians, and other trades on schedule.`,
        '',
        '— Sent on behalf of your contractor via BuildFlow',
      ]
        .filter(Boolean)
        .join('\n'),
      smsBody: `Hi ${name} — ${ctx.stageName} (${amount}) is ready for approval on ${ctx.projectName}. ${link}`,
    }
  }

  const overdueDays =
    ctx.daysUntilDue !== null && ctx.daysUntilDue < 0
      ? Math.abs(ctx.daysUntilDue)
      : 0

  return {
    emailSubject: `Payment needed: ${ctx.stageName} — ${ctx.projectName}`,
    emailBody: [
      `Hi ${name},`,
      '',
      overdueDays > 0
        ? `This is an important follow-up — the ${ctx.stageName} invoice for ${ctx.projectName} is now ${overdueDays} day${overdueDays === 1 ? '' : 's'} past due.`
        : `This is an important follow-up regarding the ${ctx.stageName} invoice for ${ctx.projectName}.`,
      '',
      `Amount outstanding: ${amount}`,
      `We need to receive payment before we can pay subcontractors for this phase.`,
      link ? `Pay now: ${link}` : '',
      '',
      `Please let us know if you have any questions — we're happy to help.`,
      '',
      '— Sent on behalf of your contractor via BuildFlow',
    ]
      .filter(Boolean)
      .join('\n'),
    smsBody: `Important: ${ctx.stageName} invoice (${amount}) for ${ctx.projectName} needs payment${overdueDays > 0 ? ` — ${overdueDays}d overdue` : ''}. ${link}`,
  }
}

export function resolveReminderTone(
  daysUntilDue: number | null,
  status: string,
): ReminderTone | null {
  if (status === 'paid' || daysUntilDue === null) return null

  if (daysUntilDue > 3) return null
  if (daysUntilDue === 3 || daysUntilDue === 1) return 'gentle'
  if (daysUntilDue === 0) return 'reminder'
  if (daysUntilDue < 0 && daysUntilDue >= -3) return 'firm'
  if (daysUntilDue <= -7) return 'firm'

  return null
}

export function shouldSendReminder(
  tone: ReminderTone,
  daysUntilDue: number | null,
): boolean {
  if (daysUntilDue === null) return false

  if (tone === 'gentle') return daysUntilDue === 3 || daysUntilDue === 1
  if (tone === 'reminder') return daysUntilDue === 0
  if (tone === 'firm') return daysUntilDue === -3 || daysUntilDue === -7

  return false
}
