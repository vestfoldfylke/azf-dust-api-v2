const { EXTRA_CAUTION_TEAMS_WEBHOOK_URL } = require('../../config')
const axios = require('axios')

/**
 *
 * @param {"accent"|"warning"|"attention"} color
 * @param {string} title
 * @param {string[]} messageArray
 * @returns
 */
const formatAdaptiveCard = (color, title, messageArray) => {
  if (!color) color = 'accent'
  if (!title) title = 'generisk tittel'
  if (messageArray && !Array.isArray(messageArray)) throw new Error('messageArray must be an array')
  if (!messageArray) messageArray = ['generisk melding']
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
              text: title,
              color,
              weight: 'bolder',
              size: 'Large',
              wrap: true
            },
            ...(messageArray.map(msg => { return { type: 'TextBlock', text: `• ${msg}`, wrap: true } }))
          ]
        }
      }
    ]
  }
}

const extraCautionAlert = async (oid, callerUpn) => {
  const title = '⚠️ En flagget bruker har blitt søkt opp i D.U.S.T'
  const messageArray = [
    `Flagget brukers object id (EntraId): ${oid}`,
    `Søkt på av: ${callerUpn}`,
    'Dette er kun til info'
  ]
  const adaptiveCard = formatAdaptiveCard('warning', title, messageArray)
  await axios.post(EXTRA_CAUTION_TEAMS_WEBHOOK_URL, adaptiveCard)
}

module.exports = { extraCautionAlert }
