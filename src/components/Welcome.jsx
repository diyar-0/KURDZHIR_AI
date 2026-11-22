import Sun from './Sun.jsx'
import { NAME } from '../data.js'
import { greeting } from '../lib/chats.js'

export default function Welcome() {
  return (
    <section className="welcome">
      <p className="welcome-brand">KURDZHIR <span>AI</span></p>
      <Sun size={460} className="welcome-sun" />
      <h1>
        {greeting()}، {NAME}
        <span>چۆن یارمەتیت بدەم؟</span>
      </h1>
      <p>پرسیارەکەت لە خانەی نووسین بنووسە.</p>
    </section>
  )
}
