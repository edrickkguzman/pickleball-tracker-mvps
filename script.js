let players = [];
let lastParticipants = [];
let gameIndex = 0;

function initTournament() {
    players = document.getElementById('input-names').value.split('\n').map(n => n.trim()).filter(n => n !== "");
    if (players.length < 4) return alert("Please enter at least 4 players.");

    const hours = parseFloat(document.getElementById('input-hours').value);
    const gamesNeeded = Math.floor((hours * 60) / 15);
    
    document.getElementById('match-list').innerHTML = "";
    gameIndex = 0;
    lastParticipants = [];

    for (let i = 0; i < gamesNeeded; i++) {
        addGame();
    }

    document.getElementById('view-setup').style.display = 'none';
    document.getElementById('view-matches').style.display = 'block';
}

function getBalancedPlayers() {
    const noBackToBack = document.getElementById('input-noback').checked;
    
    let counts = {};
    players.forEach(p => counts[p] = 0);
    document.querySelectorAll('.match-card').forEach(card => {
        [card.dataset.p1, card.dataset.p2, card.dataset.p3, card.dataset.p4].forEach(p => {
            if(p) counts[p]++;
        });
    });

    let candidates = [...players].sort((a, b) => {
        if (counts[a] !== counts[b]) return counts[a] - counts[b];
        return Math.random() - 0.5;
    });

    let selected = [];
    if (noBackToBack && players.length >= 8) {
        selected = candidates.filter(p => !lastParticipants.includes(p)).slice(0, 4);
        if (selected.length < 4) selected = candidates.slice(0, 4);
    } else {
        selected = candidates.slice(0, 4);
    }

    lastParticipants = selected;
    return selected;
}

function addGame() {
    gameIndex++;
    const p = getBalancedPlayers();
    const html = `
        <div class="match-card" data-p1="${p[0]}" data-p2="${p[1]}" data-p3="${p[2]}" data-p4="${p[3]}">
            <div class="match-header">
                <span>Game ${gameIndex}</span>
                <span class="recal-link" onclick="recalibrate(this)">Recalibrate</span>
            </div>
            <div class="team-row">
                <div class="names t1-label"><strong>T1:</strong> ${p[0]} & ${p[1]}</div>
                <input type="number" class="score-box s1" placeholder="Pts">
            </div>
            <div class="vs">VS</div>
            <div class="team-row">
                <div class="names t2-label"><strong>T2:</strong> ${p[2]} & ${p[3]}</div>
                <input type="number" class="score-box s2" placeholder="Pts">
            </div>
        </div>`;
    document.getElementById('match-list').insertAdjacentHTML('beforeend', html);
}

function recalibrate(el) {
    const card = el.closest('.match-card');
    card.dataset.p1 = ""; card.dataset.p2 = ""; card.dataset.p3 = ""; card.dataset.p4 = "";
    const p = getBalancedPlayers();
    card.dataset.p1 = p[0]; card.dataset.p2 = p[1]; card.dataset.p3 = p[2]; card.dataset.p4 = p[3];
    card.querySelector('.t1-label').innerHTML = `<strong>T1:</strong> ${p[0]} & ${p[1]}`;
    card.querySelector('.t2-label').innerHTML = `<strong>T2:</strong> ${p[2]} & ${p[3]}`;
}

function finalizeTournament() {
    let stats = {};
    players.forEach(p => stats[p] = { w: 0, l: 0, diff: 0, gp: 0 });

    let scoresEntered = 0;
    document.querySelectorAll('.match-card').forEach(card => {
        const s1 = parseInt(card.querySelector('.s1').value);
        const s2 = parseInt(card.querySelector('.s2').value);
        const p = [card.dataset.p1, card.dataset.p2, card.dataset.p3, card.dataset.p4];

        if (!isNaN(s1) && !isNaN(s2)) {
            scoresEntered++;
            p.forEach(name => stats[name].gp++);
            stats[p[0]].diff += (s1 - s2); stats[p[1]].diff += (s1 - s2);
            stats[p[2]].diff += (s2 - s1); stats[p[3]].diff += (s2 - s1);

            if (s1 > s2) { stats[p[0]].w++; stats[p[1]].w++; stats[p[2]].l++; stats[p[3]].l++; }
            else if (s2 > s1) { stats[p[2]].w++; stats[p[3]].w++; stats[p[0]].l++; stats[p[1]].l++; }
        }
    });

    if (scoresEntered === 0) return alert("Please enter at least one set of scores.");

    const sorted = Object.entries(stats).filter(([_, d]) => d.gp > 0)
        .sort((a, b) => b[1].w - a[1].w || b[1].diff - a[1].diff);

    let html = "";
    sorted.forEach(([name, d], i) => {
        html += `<tr>
            <td>${i+1}</td>
            <td><strong>${name}</strong></td>
            <td>${d.w}-${d.l}</td>
            <td style="color:${d.diff >= 0 ? 'var(--secondary)' : 'var(--error)'}">${d.diff > 0 ? '+' : ''}${d.diff}</td>
            <td>${d.gp}</td>
        </tr>`;
    });

    document.getElementById('lb-body').innerHTML = html;
    document.getElementById('view-matches').style.display = 'none';
    document.getElementById('view-leaderboard').style.display = 'block';
    window.scrollTo(0,0);
}

function goBack() {
    document.getElementById('view-leaderboard').style.display = 'none';
    document.getElementById('view-matches').style.display = 'block';
}