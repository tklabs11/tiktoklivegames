export class HUD {
  constructor({ statusEl, rankingEl, roundEl, notificationsEl, demoPanelEl, arenaInviteEl }) {
    this.statusEl = statusEl;
    this.rankingEl = rankingEl;
    this.roundEl = roundEl;
    this.notificationsEl = notificationsEl;
    this.demoPanelEl = demoPanelEl;
    this.arenaInviteEl = arenaInviteEl;
  }

  setStatus(connected, statusText = 'TikTok conectado') {
    this.statusEl.textContent = connected ? `● ${statusText}` : `○ ${statusText}`;
    this.statusEl.classList.toggle('connected', !!connected);
  }

  setRound(roundNumber) {
    this.roundEl.textContent = `RODADA ${roundNumber}`;
  }

  renderRanking(players) {
    const top = [...players]
      .sort((a, b) => b.kills - a.kills || b.score - a.score)
      .slice(0, 5);

    this.rankingEl.innerHTML = top.map((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
      return `<div>${medal} ${player.username} — ${player.kills}</div>`;
    }).join('');
  }

  setArenaInvite(visible) {
    this.arenaInviteEl.classList.toggle('visible', visible);
  }

  notify(message, color = '#ffffff') {
    const el = document.createElement('div');
    el.className = 'notification visible';
    el.textContent = message;
    el.style.borderColor = 'rgba(255,255,255,0.18)';
    el.style.color = color;
    this.notificationsEl.appendChild(el);

    setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 260);
    }, 1300);
  }

  showDemoPanel(visible) {
    this.demoPanelEl.classList.toggle('visible', visible);
  }
}
