import assert from 'node:assert'
import { describe, test } from 'node:test'
import { maskSsnValues } from '../src/lib/helpers/mask-values.js'

type RawFnr = {
  valid: boolean
  type: string
  listeMedFnr: [string, string, string, { endaEt: string; ogEndaEt: string }]
}

type AdSystem = {
  id: string
  name: string
  description: string | null
  failed: boolean
  startedTimestamp: string
  finishedTimestamp: string
  runtime: number
  tests: [
    {
      id: string
      title: string
      description: string
      waitForAllData: boolean
      result: {
        status: string
        message: string
        raw: {
          employeeNumber: string
          fnr: RawFnr
        }
      }
    }
  ]
  data: {
    company: string
    department: string
    displayName: string
    employeeNumber: string
  }
}

type OtherSystem = {
  etUtenfor: [string]
  endaEt: string
}

type ExampleReport = {
  _id: string
  instanceId: string
  startedTimestamp: string
  running: boolean
  queued: boolean
  ready: boolean
  finishedTimestamp: string
  runtime: number | null
  user: {
    surName: string
    displayName: string
    domain: string
    employeeNumber: string
  }
  caller: {
    upn: string
    oid: string
  }
  systems: [AdSystem, OtherSystem]
  runTime: number
}

const exampleReport: ExampleReport = {
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

const [adSystem, otherSystem] = exampleReport.systems
const [firstTest] = adSystem.tests
const { listeMedFnr } = firstTest.result.raw.fnr

describe('SSNs are masked when', () => {
  test('It is nested in user object', () => {
    assert.strictEqual(exampleReport.user.employeeNumber, '123456*****')
  })

  test('It is nested in test-result raw object', () => {
    assert.strictEqual(firstTest.result.raw.employeeNumber, '123456*****')
  })

  test('It is nested in test-result raw object within a nested array', () => {
    assert.strictEqual(listeMedFnr[0], '123456*****')
    assert.strictEqual(listeMedFnr[1], '123456*****')
    assert.strictEqual(listeMedFnr[2], '123456*****')
  })

  test('It is nested in test-result raw object inside another object within a nested array', () => {
    assert.strictEqual(listeMedFnr[3].endaEt, '123456*****')
    assert.strictEqual(listeMedFnr[3].ogEndaEt, '123456*****')
  })

  test('It is inside data for a system', () => {
    assert.strictEqual(adSystem.data.employeeNumber, '123456*****')
  })

  test('It is just somewhere', () => {
    assert.strictEqual(otherSystem.etUtenfor[0], '109876*****')
    assert.strictEqual(otherSystem.endaEt, '109876*****')
  })
})
