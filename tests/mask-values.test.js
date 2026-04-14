const assert = require('node:assert')
const { test, describe } = require('node:test')
const { maskSsnValues } = require('../src/lib/helpers/mask-values')

const exampleReport = {
  _id: '65c649dcf8309cbf72118846',
  instanceId: '629fd4b6-eb0b-4988-be96-b7883c3e6662',
  startedTimestamp: '2024-02-12T09:01:55.862Z',
  running: false,
  queued: true,
  ready: false,
  finishedTimestamp: '2024-02-12T09:02:00.889Z',
  runtime: null,
  user: {
    surName: 'Toillball',
    displayName: 'Per Toillball',
    domain: 'login',
    employeeNumber: '12345678910'
  },
  caller: {
    upn: 'demo.spokelse@vestfoldfylke.no',
    oid: '12345'
  },
  systems: [
    {
      id: 'ad',
      name: 'AD',
      description: null,
      failed: false,
      startedTimestamp: '2024-02-12T09:01:56.624Z',
      finishedTimestamp: '2024-02-12T09:02:00.602Z',
      runtime: 3978,
      tests: [
        {
          id: 'ad-fnr',
          title: 'Har gyldig fødselsnummer',
          description: 'Sjekker at fødselsnummer er gyldig',
          waitForAllData: false,
          result: {
            status: 'ok',
            message: 'Har gyldig Fødselsnummer',
            raw: {
              employeeNumber: '12345678910',
              fnr: {
                valid: true,
                type: 'Fødselsnummer',
                listeMedFnr: ['12345678910', '12345678911', '12345678912', { endaEt: '12345678911', ogEndaEt: '12345678911' }]
              }
            }
          }
        }
      ],
      data: {
        company: 'Organisasjon',
        department: 'Seksjon ******* tjenester',
        displayName: 'Per Toillball',
        employeeNumber: '12345678910'
      }
    },
    {
      etUtenfor: ['10987654321'],
      endaEt: '10987654321'
    }
  ],
  runTime: 5027
}

maskSsnValues(exampleReport)

describe('SSNs are masked when', () => {
  test('It is nested in user object', () => {
    assert.strictEqual(exampleReport.user.employeeNumber, '123456*****')
  })

  test('It is nested in test-result raw object', () => {
    assert.strictEqual(exampleReport.systems[0].tests[0].result.raw.employeeNumber, '123456*****')
  })

  test('It is nested in test-result raw object within a nested array', () => {
    assert.strictEqual(exampleReport.systems[0].tests[0].result.raw.fnr.listeMedFnr[0], '123456*****')
    assert.strictEqual(exampleReport.systems[0].tests[0].result.raw.fnr.listeMedFnr[1], '123456*****')
    assert.strictEqual(exampleReport.systems[0].tests[0].result.raw.fnr.listeMedFnr[2], '123456*****')
  })

  test('It is nested in test-result raw object inside another object within a nested array', () => {
    assert.strictEqual(exampleReport.systems[0].tests[0].result.raw.fnr.listeMedFnr[3].endaEt, '123456*****')
    assert.strictEqual(exampleReport.systems[0].tests[0].result.raw.fnr.listeMedFnr[3].ogEndaEt, '123456*****')
  })

  test('It is inside data for a system', () => {
    assert.strictEqual(exampleReport.systems[0].data.employeeNumber, '123456*****')
  })

  test('It is just somewhere', () => {
    assert.strictEqual(exampleReport.systems[1].etUtenfor[0], '109876*****')
    assert.strictEqual(exampleReport.systems[1].endaEt, '109876*****')
  })
})
