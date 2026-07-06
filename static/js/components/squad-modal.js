import { API } from '../core/api.js';
import {
  $, formatDOB, positionAbbr, positionClass, groupByPosition,
} from '../core/utils.js';

export function initSquadModal() {
  const modal = $('#squadModal');
  if (!modal) return;

  $('#modalClose')?.addEventListener('click', closeSquadModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSquadModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSquadModal();
  });
}

export function bindSquadButtons(container) {
  container.querySelectorAll('.team-squad-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSquadModal(btn.dataset.teamId, btn.dataset.teamCrest, btn.dataset.teamName);
    });
  });
}

export async function openSquadModal(teamId, crest, teamName) {
  const modal = $('#squadModal');
  const squadBody = $('#squadBody');
  const modalCrest = $('#modalTeamCrest');
  const modalName = $('#modalTeamName');
  const modalCoach = $('#modalCoach');

  modalCrest.src = crest;
  modalCrest.alt = teamName;
  modalName.textContent = teamName;
  modalCoach.textContent = 'Coach: Loading...';
  squadBody.innerHTML = `<div class="loading-state" style="padding:40px"><div class="spinner"></div><p>Loading squad...</p></div>`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`${API}/squad/${teamId}`);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message);

    modalCoach.textContent = `Coach: ${json.coach || 'Unknown'}`;
    const squad = json.data || [];
    const grouped = groupByPosition(squad);
    const posOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

    if (!squad.length) {
      squadBody.innerHTML = `<div class="loading-state"><p>No squad data available.</p></div>`;
      return;
    }

    squadBody.innerHTML = posOrder.flatMap((pos) => {
      const players = grouped[pos] || [];
      return players.map((p) => {
        const abbr = positionAbbr(p.position);
        const cls = positionClass(p.position);
        return `
          <div class="squad-row">
            <div class="squad-number">${p.shirtNumber !== 'N/A' ? p.shirtNumber : '—'}</div>
            <div class="squad-name">${p.name}</div>
            <div class="squad-position"><span class="position-badge ${cls}">${abbr}</span></div>
            <div class="squad-nationality">${p.nationality || '—'}</div>
            <div class="squad-dob">${formatDOB(p.dateOfBirth)}</div>
          </div>
        `;
      });
    }).join('');
  } catch (err) {
    squadBody.innerHTML = `<div class="error-state"><div class="error-icon">⚠️</div><h3>Failed to load squad</h3><p>${err.message}</p></div>`;
  }
}

function closeSquadModal() {
  const modal = $('#squadModal');
  modal?.classList.remove('open');
  document.body.style.overflow = '';
}
