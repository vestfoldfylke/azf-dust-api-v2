import { EXTRA_CAUTION_TEAMS_WEBHOOK_URL } from '../../config.js'

type AdaptiveCardColor = 'accent' | 'warning' | 'attention'

type AdaptiveCardMessage = {
  type: 'message'
  attachments: Array<{
    contentType: 'application/vnd.microsoft.card.adaptive'
    contentUrl: null
    content: {
      $schema: string
      type: 'AdaptiveCard'
      version: string
      msteams: { width: 'full' }
      body: Array<Record<string, unknown>>
    }
  }>
}

const formatAdaptiveCard = (
  color: AdaptiveCardColor | undefined,
  title: string | undefined,
  messageArray: string[] | undefined
): AdaptiveCardMessage => {
  if (messageArray && !Array.isArray(messageArray)) {
    throw new Error('messageArray must be an array')
  }

  const resolvedColor: AdaptiveCardColor = color ?? 'accent'
  const resolvedTitle: string = title ?? 'generisk tittel'
  const resolvedMessages: string[] = messageArray ?? ['generisk melding']

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.5',
          msteams: { width: 'full' },
          body: [
            {
              type: 'TextBlock',
              text: resolvedTitle,
              color: resolvedColor,
              weight: 'bolder',
              size: 'Large',
              wrap: true
            },
            ...resolvedMessages.map((msg: string) => ({
              type: 'TextBlock',
              text: `• ${msg}`,
              wrap: true
            }))
          ]
        }
      }
    ]
  }
}

export const extraCautionAlert = async (oid: string, callerUpn: string): Promise<void> => {
  if (!EXTRA_CAUTION_TEAMS_WEBHOOK_URL) {
    throw new Error('EXTRA_CAUTION_TEAMS_WEBHOOK_URL is not set')
  }

  const title: string = '⚠️ En flagget bruker har blitt søkt opp i D.U.S.T'
  const messageArray: string[] = [`Flagget brukers object id (EntraId): ${oid}`, `Søkt på av: ${callerUpn}`, 'Dette er kun til info']
  const adaptiveCard: AdaptiveCardMessage = formatAdaptiveCard('warning', title, messageArray)

  const response: Response = await fetch(EXTRA_CAUTION_TEAMS_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adaptiveCard)
  })

  if (response.ok) {
    return
  }

  const message: string = await response.text()
  throw new Error(message)
}
