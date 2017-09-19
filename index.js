const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
// enable cors
app.use(cors())

function execSync(cmd, options) {
  const output = spawnSync(cmd, options)

  if (output.error) return { status: -1, message: output.error.code }

  if (output.stdout) {
    return { status: 0, message: output.stdout.toString() }
  }
  if (output.stderr) {
    return { status: -1, message: output.stderr.toString() }
  }
}

function configTextLint(options) {
  // Options format
  // {
  //   rules: {
  //     '<rule-name>': <bool> or <Object>,
  //     '<rule-name>': <bool> or <Object>,
  //   }
  // }
  fs.writeFileSync('.textlintrc', JSON.stringify(options))
}

function listTextLintRules() {
  let npms = execSync('npm', ['list', '--depth', '0'])
  if (npms.status < 0)  return { error: npms.message }
  let rulePkgs = npms.message.split('\n').filter((v) => { return v.match(/textlint-rule-.+@/) })
  let rules = rulePkgs.map((v) => { return v.match(/textlint-rule-[^@]+/)[0].slice(14) })
  return { rules: rules }
}

function execTextLint(text, options) {
  configTextLint(options)

  fs.writeFileSync('tmp.md', text)

  const json = execSync('./node_modules/.bin/textlint', ['-f', 'json', 'tmp.md'])
  if (json.status < 0)  return { error: json.message }

  try {
    return { json: JSON.parse(json.message)[0].messages }
  }
  catch(e) {
    return { error: 'Not have rules, textlint do not anything.' }
  }

}

function execTextFix(text, options) {
  configTextLint(options)

  fs.writeFileSync('tmp.md', text)

  const fix = execSync('./node_modules/.bin/textlint', ['--fix', 'tmp.md'])
  if (fix.status < 0) return { error: fix.message }

  let data = fs.readFileSync('tmp.md')

  return { fix: data.toString() }
}

app.post('/', function(req, res) {
  // echo
  if (!req.body) return res.sendStatus(400)
  res.send(res.body)
})

app.post('/connect', function(req, res) {
  // 初回通信時に使う
  // 指定された文字列を返却し通信確立、このあとはhandshakeを使う
  if (!req.body) return res.sendStatus(400)
  res.send(listTextLintRules())
})

app.post('/handshake', function(req, res) {
  // connectionが確立したあと生死確認と設定反映に使う
  if (!req.body) return res.sendStatus(400)
  res.send(listTextLintRules())
})

app.post('/lint', function(req, res) {
  if (!req.body) return res.sendStatus(400)
  if (!req.body.text || !req.body.options) return res.sendStatus(400)
  res.send(execTextLint(req.body.text, req.body.options))
})

app.post('/fix', function(req, res) {
  if (!req.body) return res.sendStatus(400)
  if (!req.body.text || !req.body.options) return res.sendStatus(400)
  res.send(execTextFix(req.body.text, req.body.options))
})

app.listen((process.env.PORT || 5000), function() {
  console.log('Listening...')
})
