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

  if (output.stdout && output.stdout.toString().length > 0) {
    return { status: 0, message: output.stdout.toString() }
  }
  if (output.stderr && ret.stderr.toString().length > 0) {
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

function execTextLint(text, options) {
  configTextLint(options)

  fs.writeFileSync('tmp.md', text)

  const unix = execSync('./node_modules/.bin/textlint', ['-f', 'unix', 'tmp.md'])
  if (unix.status < 0)  return { error: unix.message }

  const stylish = execSync('./node_modules/.bin/textlint', ['tmp.md'])
  if (stylish.status < 0)  return { error: stylish.message }

  return { unix: unix.message, stylish: stylish.message }
}

function execTextFix(text, options) {
  configTextLint(options)

  fs.writeFileSync('tmp.md', text)

  const fix = execSync('./node_modules/.bin/textlint', ['--fix', '--dry-run', 'tmp.md'])
  if (fix.status < 0) return { error: fix.message }

  return { fix: fix.message }
}

function listTextLintRules() {
  let npms = execSync('npm', ['list', '--depth', '0'])
  if (npms.status < 0)  return { error: npms.message }
  let rulePkgs = npms.message.split('\n').filter((v) => { return v.match(/textlint-rule-.+@/) })
  let rules = rulePkgs.map((v) => { return v.match(/textlint-rule-[^@]+/)[0].slice(14) })
  return { list: rules }
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
  console.log(req.body)
  res.send({ message: 'ok' })
})

app.post('/handshake', function(req, res) {
  // connectionが確立したあと生死確認と設定反映に使う
  if (!req.body) return res.sendStatus(400)
  res.send(listTextLintRules())
})

app.post('/testlint/lint', function(req, res) {
  if (!req.body) return res.sendStatus(400)
})

app.post('/textlint/fix', function(req, res) {
  if (!req.body) return res.sendStatus(400)
})

app.listen((process.env.PORT || 5000), function() {
  console.log('Listening...')
})
