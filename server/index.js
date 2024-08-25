const express = require('express')
const cors = require('cors')
const path = require('path')
const fs= require('fs')
const multiparty = require('multiparty')
const bodyParser = require('body-parser')

const UPLOAD_DIR = path.resolve(__dirname, '..', 'target')

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())

// 接收文件分片
app.post('/chunk', (req, res) => {
  const multipart = new multiparty.Form()
  multipart.parse(req, async (err, fields, files) => {
    if (err) return;
    const [chunk] = files.chunk
    const [filename] = fields.filename
    const [hash] = fields.hash
    // console.log(chunk, filename, hash)
    const chunkDir = path.resolve(UPLOAD_DIR, 'chunkDir_' + filename)

    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir)
    }
    fs.renameSync(chunk.path, `${chunkDir}/${hash}`)
  })

  res.status(200).send({msg: 'received chunk'})
})

// 合并分片文件
app.post('/merge', async (req, res) => {
  const { filename, size } = req.body
  const chunkDir = path.resolve(UPLOAD_DIR, 'chunkDir_' + filename)
  const chunkPaths = fs.readdirSync(chunkDir)
  chunkPaths.sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
  const filePath = path.resolve(UPLOAD_DIR, filename)

  const pipeStream = (chunkPath, index) => {
    return new Promise((resolve, reject) => {
      const cdir = path.resolve(chunkDir, chunkPath)
      const readStream = fs.createReadStream(cdir)
      readStream.on('end', () => {
        resolve()
      })
      const writeStream = fs.createWriteStream(filePath, {start: index * size})
      readStream.pipe(writeStream)
    })
  }
  
  const chunkPromises = chunkPaths.map((chunkPath, index) => pipeStream(chunkPath, index))
  await Promise.all(chunkPromises)
  fs.rmSync(chunkDir, {recursive: true})
  res.send({msg: 'success'})
})

app.listen(3001, () => {
  console.log('server listen port 3001')
})