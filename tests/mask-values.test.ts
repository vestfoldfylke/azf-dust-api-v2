import assert from 'node:assert'
import { describe, test } from 'node:test'
import { maskSsnValues } from '../src/lib/helpers/mask-values.js'
import type { Report, SystemWithTestsResult } from '../src/types/system.js'

type ReportWithId = Report & {
  _id: string
}

const ssnsToFind: string[] = ['12345678910', '12345678911', '12345678912']

const exampleReport: ReportWithId = {
  _id: '65c649dcf8309cbf72118846',
  instanceId: '629fd4b6-eb0b-4988-be96-b7883c3e6662',
  createdTimestamp: '2024-02-12T09:01:50.862Z',
  startedTimestamp: '2024-02-12T09:01:55.862Z',
  running: false,
  queued: true,
  ready: false,
  finishedTimestamp: '2024-02-12T09:02:00.889Z',
  serverRuntime: null,
  totalRuntime: null,
  user: {
    id: 'tull',
    accountEnabled: true,
    displayName: 'Per Toillball',
    userPrincipalName: 'per.toillball@tull.no',
    userType: 'ansatt',
    employeeNumber: '12345678910',
    givenName: 'Per',
    surname: 'Toillball'
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
              employeeNumber: ssnsToFind[0],
              fnr: {
                valid: true,
                type: 'Fødselsnummer',
                listeMedFnr: [ssnsToFind[0], ssnsToFind[1], ssnsToFind[2], { endaEt: ssnsToFind[1], ogEndaEt: ssnsToFind[1] }]
              }
            }
          }
        }
      ],
      data: {
        company: 'Organisasjon',
        department: 'Seksjon ******* tjenester',
        displayName: 'Per Toillball',
        employeeNumber1: ssnsToFind[0],
        employeeNumber2: ssnsToFind[1],
        employeeNumber3: ssnsToFind[2]
      }
    },
    {
      id: 'azure',
      name: 'Azure',
      description: null,
      failed: false,
      startedTimestamp: '2024-02-12T09:01:56.624Z',
      finishedTimestamp: '2024-02-12T09:02:00.602Z',
      runtime: 3978,
      tests: [
        {
          id: 'azure-fnr',
          title: 'Har gyldig fødselsnummer',
          description: 'Sjekker at fødselsnummer er gyldig',
          waitForAllData: false,
          result: {
            status: 'ok',
            message: 'Har gyldig Fødselsnummer',
            raw: {
              employeeNumber: ssnsToFind[0],
              fnr: {
                valid: true,
                type: 'Fødselsnummer',
                listeMedFnr: [ssnsToFind[0], ssnsToFind[1], ssnsToFind[2], { endaEt: ssnsToFind[1], ogEndaEt: ssnsToFind[1] }]
              }
            }
          }
        }
      ],
      data: {
        company: 'Organisasjon',
        department: 'Seksjon ******* tjenester',
        displayName: 'Per Toillball',
        employeeNumber1: ssnsToFind[0],
        employeeNumber2: ssnsToFind[1],
        employeeNumber3: ssnsToFind[2]
      }
    }
  ]
}

maskSsnValues(exampleReport)

describe('SSNs are masked when', () => {
  test('It is nested in report user object', () => {
    ssnsToFind.forEach((ssn: string) => {
      assert.ok(!JSON.stringify(exampleReport.user).includes(ssn), 'EmployeeNumber was found unmasked in a report user!')
    })
  })

  ssnsToFind.forEach((ssn: string) => {
    describe(ssn, () => {
      test('in a system test anywhere', () => {
        exampleReport.systems.forEach((system: SystemWithTestsResult) => {
          assert.ok(!JSON.stringify(system.tests).includes(ssn), 'EmployeeNumber was found unmasked in a system test!')
        })
      })

      test('in a systems data anywhere', () => {
        exampleReport.systems.forEach((system: SystemWithTestsResult) => {
          assert.ok(!JSON.stringify(system.data).includes(ssn), 'EmployeeNumber was found unmasked in a systems data!')
        })
      })
    })
  })
})
