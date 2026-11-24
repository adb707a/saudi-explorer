import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/readex-pro'
import '@fontsource/noto-kufi-arabic/400.css'
import '@fontsource/noto-kufi-arabic/600.css'
import '@fontsource/noto-kufi-arabic/700.css'
import '@fontsource/ibm-plex-sans-arabic/300.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/system.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
