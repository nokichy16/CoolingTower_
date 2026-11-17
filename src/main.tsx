import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// KaTeX fonts: the formulas and the graph labels use KaTeX_Main (Computer Modern)
import 'katex/dist/katex.min.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
