import React, { useState, useRef, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'
import { deserialize } from '../js/c.js'

function fmt(val) {
  if (typeof val === 'string') return val
  return JSON.stringify(val, null, 2)
}

function toGridData(val) {
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
    const cols = Object.keys(val[0]).map(k => ({ field: k, headerName: k }))
    return { cols, rows: val }
  }
  // scalar or flat array — wrap so it still shows in the grid
  const rows = Array.isArray(val) ? val.map((r, i) => ({ index: i, result: r })) : [{ result: val }]
  const cols = Object.keys(rows[0]).map(k => ({ field: k, headerName: k }))
  return { cols, rows }
}

export default function App() {
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('8000')
  const [cmd, setCmd] = useState('')
  const [status, setStatus] = useState('disconnected')
  const [returnAs, setReturnAs] = useState('text')
  const [textResult, setTextResult] = useState('')
  const [gridData, setGridData] = useState({ cols: [], rows: [] })
  const ws = useRef(null)

  const connect = useCallback(() => {
    if (ws.current) {
      ws.current.close()
      return
    }
    const url = `ws://${host}:${port}`
    setStatus('connecting…')
    const sock = new WebSocket(url)
    sock.binaryType = 'arraybuffer'

    sock.onopen = () => {
      setStatus('connected')
      ws.current = sock
    }
    sock.onclose = () => {
      ws.current = null
      setStatus('disconnected')
    }
    sock.onerror = () => setStatus('error')
    sock.onmessage = (e) => {
      console.log('raw response:', e.data)
      const result = deserialize(e.data)
      if (result.format === 'data') {
        setGridData(toGridData(result.result))
      } else {
        setTextResult(fmt(result.result))
      }
    }
  }, [host, port])

  const run = useCallback(() => {
    if (!cmd || !ws.current) return
    ws.current.send(JSON.stringify({ cmd, format: returnAs }))
    setTextResult('')
    setGridData({ cols: [], rows: [] })
  }, [cmd, returnAs])

  const connected = status === 'connected'

  const statusColor = {
    connected: 'text-green-400',
    disconnected: 'text-zinc-500',
    error: 'text-red-400',
    'connecting…': 'text-yellow-400',
  }[status] ?? 'text-zinc-500'

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-300 p-6 font-mono text-sm">
      <h1 className="text-blue-300 mb-5 text-base">qdirect</h1>

      {/* Connection row */}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-blue-300 w-10">host</label>
        <input
          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 w-44 text-zinc-200 focus:outline-none focus:border-zinc-400"
          value={host} onChange={e => setHost(e.target.value)}
        />
        <label className="text-blue-300 w-8">port</label>
        <input
          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 w-20 text-zinc-200 focus:outline-none focus:border-zinc-400"
          value={port} onChange={e => setPort(e.target.value)}
        />
        <button
          onClick={connect}
          className="bg-blue-700 hover:bg-blue-600 text-white rounded px-4 py-1"
        >
          {connected ? 'disconnect' : 'connect'}
        </button>
        <span className={`text-xs ml-1 ${statusColor}`}>{status}</span>
      </div>

      {/* Command row */}
      <div className="flex items-center gap-2 mb-4">
        <label className="text-blue-300 w-10">cmd</label>
        <input
          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 flex-1 text-zinc-200 focus:outline-none focus:border-zinc-400"
          placeholder="e.g. .Q.w[]"
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && connected && run()}
        />
        <button
          onClick={run}
          disabled={!connected}
          className="bg-blue-700 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded px-4 py-1"
        >
          run
        </button>
      </div>

      {/* Return as radio */}
      <div className="flex items-center gap-4 mb-3 text-xs text-zinc-400">
        <span>Return as:</span>
        {['text', 'data'].map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="returnAs"
              value={opt}
              checked={returnAs === opt}
              onChange={() => setReturnAs(opt)}
              className="accent-blue-500"
            />
            {opt}
          </label>
        ))}
      </div>

      {/* Result area */}
      {returnAs === 'text' ? (
        <textarea
          readOnly
          value={textResult}
          className="w-full h-96 bg-zinc-800 border border-zinc-600 rounded p-2 text-zinc-200 resize-y focus:outline-none text-xs"
        />
      ) : (
        <div className="ag-theme-balham-dark w-full h-96 rounded overflow-hidden border border-zinc-600">
          <AgGridReact
            rowData={gridData.rows}
            columnDefs={gridData.cols}
            defaultColDef={{ sortable: true, resizable: true, filter: true }}
          />
        </div>
      )}
    </div>
  )
}
