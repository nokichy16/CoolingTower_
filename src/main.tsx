import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// KaTeX fonts: the formulas and the graph labels use KaTeX_Main (Computer Modern)
import 'katex/dist/katex.min.css'
// Body font: STIX Two Text, a serif with high stroke contrast (thick and thin strokes)
import '@fontsource/stix-two-text/latin-400.css'
import '@fontsource/stix-two-text/latin-600.css'
import '@fontsource/stix-two-text/latin-700.css'
import '@fontsource/stix-two-text/latin-400-italic.css'
import '@fontsource/stix-two-text/latin-ext-400.css'
import '@fontsource/stix-two-text/latin-ext-600.css'
import '@fontsource/stix-two-text/latin-ext-700.css'
import '@fontsource/stix-two-text/latin-ext-400-italic.css'
import '@fontsource/stix-two-text/greek-400.css'
import '@fontsource/stix-two-text/greek-600.css'
import '@fontsource/stix-two-text/greek-700.css'
import '@fontsource/stix-two-text/greek-400-italic.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
