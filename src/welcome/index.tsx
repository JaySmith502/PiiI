import React from 'react'
import { createRoot } from 'react-dom/client'
import '../ui/fonts.css'
import { Welcome } from './Welcome'

const root = document.getElementById('root')!
createRoot(root).render(
  <React.StrictMode>
    <Welcome />
  </React.StrictMode>
)
