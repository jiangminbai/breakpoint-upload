import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';


const chunkSize = 1 * 1024 * 1024

function App() {
  const ref = useRef([])
  const xhrRef = useRef(null)
  const fileRef = useRef(null)
  const dataRef = useRef(null)
  const idxRef = useRef(0)
  const [fName, setFName] = useState(null)
  const [progress, setProgress] = useState('0%')

  // 请求封装
  const request = useCallback(({
    method = 'post',
    url,
    headers = {},
    data,
    progress
  }) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      progress && progress(xhr)
      xhr.open(method, url)
      Object.keys(headers).forEach(name => {
        const value = headers[name]
        xhr.setRequestHeader(name, value)
      })
      xhr.send(data)
      xhr.onload = (e) => {
        resolve({
          readyState: xhr.readyState,
          status: xhr.status,
          response: e.target.response
        })
      }
      xhr.onerror = reject
      xhr.onabort = (e) => {
        resolve({
          readyState: xhr.readyState,
          status: xhr.status,
        })
      }
    })
  }, [])

  // 创建文件切片
  const createChunk = useCallback((file) => {
    let cur = 0
    let index = 0
    while (cur < file.size) {
      ref.current.push({
        chunk: file.slice(cur, cur + chunkSize),
        // 以文件名和索引为hash
        hash: file.name + '-' + index,
        filename: file.name,
      })
      cur += chunkSize
      index += 1
    }
  }, [])

  // 上传切片
  const uploadChunk = useCallback(async () => {
    const data = dataRef.current
    const file = fileRef.current
    while (idxRef.current < data.length) {
      try {
        const res = await request({
          url: 'http://localhost:3001/chunk',
          data: data[idxRef.current],
          progress: (xhr) => {
            xhrRef.current = xhr
          }
        })
        // 请求中断
        if (res.readyState === 4 && res.status === 0) return
        console.log(res)
      } catch (e) {
        console.log(e)
      }
      const progressPercent = Math.ceil(((idxRef.current + 1) / data.length) * 100) + '%'
      setProgress(progressPercent)
      if (idxRef.current === data.length - 1) {
        await mergeChunk(file)
      }
      idxRef.current++
    }
  }, [])

  const mergeChunk = useCallback(async (file) => {
    await request({
      url: 'http://localhost:3001/merge',
      headers: {
        "content-type": "application/json"
      },
      data: JSON.stringify({
        filename: file.name,
        size: chunkSize
      })
    })
  }, [])

  const onChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    fileRef.current = file
    console.log(file)
    createChunk(file)
    console.log(ref.current)
    const chunks = ref.current
    dataRef.current = chunks.map((item) => {
      const formData = new FormData()
      formData.append('chunk', item.chunk)
      formData.append('hash', item.hash)
      formData.append('filename', item.filename)
      return formData
    })
    uploadChunk()
  }, [])

  // 暂停上传
  const pauseUpload = useCallback(() => {
    const xhr = xhrRef.current
    console.log(xhr)
    if (xhr) {
      xhr.abort()
    }
  }, [])

  const networkChunk = useCallback(() => {
    axios.post(
      'http://localhost:3001/chunk',
      dataRef.current[0]
    )
  }, [])
  return (
    <div className="App">
      <header className="App-header">
        <input type='file' placeholder='文件' onChange={onChange} />
        <div className='progress'>
          <div className="progress-bar" style={{width: progress}}></div>
          <div className="progress-helper">{progress}</div>
        </div>
        <div className="handle">
          <button onClick={pauseUpload}>暂停上传</button>
          <button onClick={uploadChunk}>恢复上传</button>
          {/* <button onClick={networkChunk}>axios测试</button> */}
        </div>
      </header>
    </div>
  );
}

export default App;
