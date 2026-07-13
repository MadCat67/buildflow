import type { Project } from '../db/schema.js'
import { milestones } from '../db/cashflowSchema.js'

export type DraftContext = {
  channel: 'email' | 'sms'
  clientName: string
  projectName: string | null
  incomingBody: string
  companyName?: string | null
  milestones?: (typeof milestones.$inferSelect)[]
}

function firstName(clientName: string) {
  return clientName.split(/[&\s]/)[0] || clientName
}

function buildFallbackDraft(ctx: DraftContext): string {
  const name = firstName(ctx.clientName)
  const project = ctx.projectName ?? 'your project'
  const body = ctx.incomingBody.toLowerCase()

  if (ctx.channel === 'sms') {
    if (body.includes('invoice') || body.includes('receipt')) {
      return `Hi ${name}! Absolutely — I'll send over the updated invoice today. You should have it in your inbox shortly. Let me know if you need anything else!`
    }
    if (body.includes('budget') || body.includes('cost')) {
      return `Hi ${name}! Yes, we're still on budget. I'll include a quick cost summary with the next progress update. Thanks for checking in!`
    }
    if (body.includes('time') || body.includes('arrive') || body.includes('crew')) {
      return `Hi ${name}! The crew is scheduled to arrive between 7:30–8:00 AM. I'll have the foreman text you when they're 15 minutes out.`
    }
    if (body.includes('thank')) {
      return `Hi ${name}! You're very welcome — glad the update was helpful. Don't hesitate to reach out anytime!`
    }
    return `Hi ${name}! Thanks for reaching out about ${project}. I'll get back to you with a detailed update shortly.`
  }

  if (body.includes('finish') || body.includes('done') || body.includes('timeline') || body.includes('august')) {
    const milestoneNote =
      ctx.milestones?.find((m) => m.status === 'pending')?.stageName ??
      'the next phase'
    return `Hi ${name},

Thanks for reaching out! ${project} is on track. We're moving into ${milestoneNote} next and expect substantial completion on schedule.

I'll keep you posted as we hit each milestone. Let me know if you have any other questions!

Best regards`
  }

  if (body.includes('invoice') || body.includes('records')) {
    return `Hi ${name},

Absolutely — I'll send over the updated invoice today. You should have it in your inbox shortly.

Let me know if you need anything else!

Best regards`
  }

  if (body.includes('arrive') || body.includes('crew') || body.includes('tomorrow')) {
    return `Hi ${name},

The crew is scheduled to arrive tomorrow between 7:30–8:00 AM. I'll have the foreman text you when they're 15 minutes out so you can plan accordingly.

Thanks,
${ctx.companyName ?? 'Your BuildFlow Team'}`
  }

  if (body.includes('budget') || body.includes('materials')) {
    return `Hi ${name},

Yes, we're still on budget for materials. I'll send a quick cost summary with the next progress update.

Thanks for checking in!

Best regards`
  }

  if (body.includes('thank')) {
    return `Hi ${name},

You're very welcome — glad the update was helpful! We'll continue to keep you in the loop as work progresses. Don't hesitate to reach out anytime.

Best regards`
  }

  return `Hi ${name},

Thanks for your message about ${project}. I've reviewed your note and will follow up with a detailed update shortly.

Best regards,
${ctx.companyName ?? 'Your BuildFlow Team'}`
}

async function buildOpenAiDraft(ctx: DraftContext): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const milestoneList =
    ctx.milestones
      ?.map((m) => `${m.stageName} (${m.status}, due ${m.dueDate ?? 'TBD'})`)
      .join('; ') ?? 'none'

  const systemPrompt =
    ctx.channel === 'sms'
      ? 'You draft short, friendly SMS replies for a general contractor. Keep under 320 characters. No subject line.'
      : 'You draft professional email replies for a general contractor. Use a warm but concise tone. Include a greeting and sign-off.'

  const userPrompt = `Company: ${ctx.companyName ?? 'BuildFlow contractor'}
Project: ${ctx.projectName ?? 'Unknown'}
Client: ${ctx.clientName}
Milestones: ${milestoneList}

Incoming ${ctx.channel === 'sms' ? 'text' : 'email'} from client:
"""
${ctx.incomingBody}
"""

Write a reply the contractor can review and send. Address the client's question directly.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: ctx.channel === 'sms' ? 200 : 500,
      }),
    })

    if (!res.ok) {
      console.error('OpenAI draft failed:', await res.text())
      return null
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    return content || null
  } catch (err) {
    console.error('OpenAI draft error:', err)
    return null
  }
}

export async function generateMessageDraft(ctx: DraftContext): Promise<string> {
  const aiDraft = await buildOpenAiDraft(ctx)
  if (aiDraft) return aiDraft
  return buildFallbackDraft(ctx)
}

export function buildDraftContext(
  channel: 'email' | 'sms',
  clientName: string,
  project: Project | null,
  incomingBody: string,
  companyName: string | null,
  milestoneRows: (typeof milestones.$inferSelect)[],
): DraftContext {
  return {
    channel,
    clientName,
    projectName: project?.name ?? null,
    incomingBody,
    companyName,
    milestones: milestoneRows,
  }
}
