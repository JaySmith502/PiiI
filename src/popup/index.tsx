import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Popup } from './Popup'

const root = document.getElementById('root')!
createRoot(root).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
)
