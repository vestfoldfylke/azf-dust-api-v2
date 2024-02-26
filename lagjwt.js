(async () => {
  const { sign } = require('jsonwebtoken')

  const payload = {
    aud: 'api://blablab',
    iss: 'https://dust.dustesen.vtfk.net/hahah/',
    iat: 1706360392,
    nbf: 1706360392,
    exp: 1706365820,
    acr: '1',
    aio: 'babababab',
    amr: [
      'rsa',
      'mfa'
    ],
    roles: ['dust_access', 'admin_access'],
    appid: 'gudene veit',
    appidacr: '0',
    family_name: 'Spøkelse',
    given_name: 'Demo',
    ipaddr: '2001:2020:4341:fcbb:2959:1c6a:cdab:24e0',
    name: 'Demo Spøkelse',
    oid: '12345',
    onprem_sid: 'SUSUSUS',
    rh: 'si senor',
    scp: 'user_impersonation',
    sub: 'marine',
    tid: 'sklemme',
    unique_name: 'demo.spokelse@vestfoldfylke.no',
    upn: 'demo.spokelse@vestfoldfylke.no',
    uti: 'hohoo',
    ver: '1.0'
  }

  // const privateKey = crypto.createPrivateKey('eindrit1!');
  const token = sign(payload, 'sasasashihi')
  console.log(token)
})()
