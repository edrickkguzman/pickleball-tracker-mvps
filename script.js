let players = [];
let lastParticipants = [];
let roundCount = 0;
let currentEditCard = null;

function updateValidation() {
    const rawInput = document.getElementById('input-names').value.split('\n');
    const nameList = rawInput.map(n => n.trim()).filter(n => n !== "");
    const courts = parseInt(document.getElementById('input-courts').value) || 1;
    
    const warning = document.getElementById('validation-msg');
    const genBtn = document.getElementById('btn-generate');
    const noBackLabel = document.getElementById('lbl-noback');
    const noBackCheck = document.getElementById('input-noback');

    // 1. Check for Duplicate Names
    const uniqueNames = new Set(nameList);
    const hasDuplicates = uniqueNames.size !== nameList.length;

    // 2. Check for Sufficient Player Count
    const totalNeeded = courts * 4;
    const isEnough = uniqueNames.size >= totalNeeded;

    // Find the duplicated name for the error message
    let duplicateName = "";
    if (hasDuplicates) {
        const seen = new Set();
        for (let name of nameList) {
            if (seen.has(name)) {
                duplicateName = name;
                break;
            }
            seen.add(name);
        }
    }

    // Logic for Button and Warning Messages
    if (hasDuplicates) {
        warning.innerHTML = `<strong>Error:</strong> Duplicate name detected ("${duplicateName}"). Each player must have a unique name.`;
        warning.className = "error-box";
        warning.style.display = 'block';
        genBtn.disabled = true;
    } 
    else if (!isEnough) {
        warning.innerHTML = `<strong>Need More Players:</strong> You need at least ${totalNeeded} unique players for ${courts} court(s). Currently have: ${uniqueNames.size}`;
        warning.className = "warning-box";
        warning.style.display = 'block';
        genBtn.disabled = true;
    } 
    else {
        // Everything is good
        warning.style.display = 'none';
        genBtn.disabled = false;
        
        // Secondary Check: Enable/Disable No-Back-to-Back logic based on pool size
        const minForNoBack = totalNeeded * 2;
        if (uniqueNames.size < minForNoBack) {
            noBackCheck.checked = false;
            noBackLabel.classList.add('disabled-opt');
            // Show a soft warning instead of hard error
            warning.innerText = `Note: Pool is too small to avoid back-to-back games.`;
            warning.className = "warning-box";
            warning.style.display = 'block';
        } else {
            noBackLabel.classList.remove('disabled-opt');
        }
    }
}

// Attach listeners for real-time feedback
document.getElementById('input-names').addEventListener('input', updateValidation);
document.getElementById('input-courts').addEventListener('input', updateValidation);

// Ensure validation runs once on page load
window.onload = updateValidation;

function initTournament() {
    // Re-verify list one last time
    players = document.getElementById('input-names').value.split('\n').map(n => n.trim()).filter(n => n !== "");
    const courts = parseInt(document.getElementById('input-courts').value) || 1;
    
    // Safety check in case the button was manually enabled via dev tools
    if (new Set(players).size !== players.length) return alert("Please remove duplicate names.");
    if (players.length < courts * 4) return alert(`Need at least ${courts * 4} players!`);

    const hours = parseFloat(document.getElementById('input-hours').value) || 1;
    const rounds = Math.floor((hours * 60) / 15);
    
    document.getElementById('match-list').innerHTML = "";
    roundCount = 0;
    lastParticipants = [];

    for (let i = 0; i < rounds; i++) addRound();

    document.getElementById('view-setup').style.display = 'none';
    document.getElementById('view-matches').style.display = 'block';
}

function getBalancedMatches(numCourts) {
    const noBack = document.getElementById('input-noback').checked;
    const noPartner = document.getElementById('input-nopartner').checked;
    
    let gp = {};
    let partners = {};
    players.forEach(p => gp[p] = 0);

    // FIX: Scoping of 'n' and partnership logic
    document.querySelectorAll('.match-card').forEach(card => {
        const p = [card.dataset.p1, card.dataset.p2, card.dataset.p3, card.dataset.p4];
        
        // Update Games Played (GP) for each player
        p.forEach(name => { 
            if(name) gp[name]++; 
        });

        // Update Partnership History for Team 1 (p0 and p1)
        if (p[0] && p[1]) { 
            const k1 = [p[0], p[1]].sort().join("|"); 
            partners[k1] = (partners[k1] || 0) + 1; 
        }
        
        // Update Partnership History for Team 2 (p2 and p3)
        if (p[2] && p[3]) { 
            const k2 = [p[2], p[3]].sort().join("|"); 
            partners[k2] = (partners[k2] || 0) + 1; 
        }
    });

    let pool = [...players].sort((a,b) => gp[a] - gp[b] || Math.random() - 0.5);
    let eligible = noBack && players.length >= numCourts * 8 ? pool.filter(p => !lastParticipants.includes(p)) : pool;
    if (eligible.length < numCourts * 4) eligible = pool;

    let selected = eligible.slice(0, numCourts * 4);
    lastParticipants = selected;

    let roundMatches = [];
    let matchPool = [...selected];

    for (let i = 0; i < numCourts; i++) {
        let bestMatch = matchPool.slice(0, 4);
        if (noPartner) {
            for (let attempt = 0; attempt < 15; attempt++) {
                let test = [...matchPool.slice(0, 4)].sort(() => Math.random() - 0.5);
                let k1 = [test[0], test[1]].sort().join("|");
                let k2 = [test[2], test[3]].sort().join("|");
                // Check if these teams have played together before
                if (!partners[k1] && !partners[k2]) { 
                    bestMatch = test; 
                    break; 
                }
            }
        }
        roundMatches.push(bestMatch);
        matchPool.splice(0, 4);
    }
    return roundMatches;
}

function addRound() {
    roundCount++;
    const courts = parseInt(document.getElementById('input-courts').value) || 1;
    const matches = getBalancedMatches(courts);
    matches.forEach((p, i) => createMatchHTML(roundCount, courts > 1 ? `Court ${i+1}` : '', p));
}
function createMatchHTML(rd, ct, p) {
    const html = `
        <div class="match-card" data-p1="${p[0]}" data-p2="${p[1]}" data-p3="${p[2]}" data-p4="${p[3]}">
            <div class="match-header">
                <span>Round ${rd} ${ct ? '• ' + ct : ''}</span>
                <div class="header-actions">
                    <span class="action-edit" onclick="openEdit(this)">Manual Change</span>
                    <span class="action-recal" onclick="recalibrate(this)">Recalibrate</span>
                </div>
            </div>
            
            <div class="team-row">
                <div class="names"><strong>T1:</strong> ${p[0]} & ${p[1]}</div>
                <input type="number" class="score-box s1" placeholder="Score">
            </div>
            
            <div class="vs">VS</div>
            
            <div class="team-row">
                <div class="names"><strong>T2:</strong> ${p[2]} & ${p[3]}</div>
                <input type="number" class="score-box s2" placeholder="Score">
            </div>
        </div>`;
    
    document.getElementById('match-list').insertAdjacentHTML('beforeend', html);
}

function recalibrate(el) {
    const card = el.closest('.match-card');
    card.dataset.p1 = ""; card.dataset.p2 = ""; card.dataset.p3 = ""; card.dataset.p4 = "";
    const p = getBalancedMatches(1)[0];
    updateCard(card, p);
}

function openEdit(el) {
    currentEditCard = el.closest('.match-card');
    const sels = document.querySelectorAll('.player-select');
    sels.forEach((s, i) => {
        s.innerHTML = players.map(name => `<option value="${name}">${name}</option>`).join('');
        s.value = currentEditCard.dataset[`p${i+1}`];
    });
    document.getElementById('edit-modal').style.display = 'flex';
}

function saveEditMatch() {
    const p = [1,2,3,4].map(i => document.getElementById(`edit-p${i}`).value);
    if (new Set(p).size < 4) return alert("Duplicates detected!");
    updateCard(currentEditCard, p);
    closeEditModal();
}

function updateCard(card, p) {
    // 1. Update the hidden data attributes for the logic to use
    [1, 2, 3, 4].forEach(i => card.dataset[`p${i}`] = p[i - 1]);

    // 2. Select all elements with the class 'names' inside this card
    const nameLabels = card.querySelectorAll('.names');

    // 3. Update the text if the elements exist
    if (nameLabels.length >= 2) {
        nameLabels[0].innerHTML = `<strong>T1:</strong> ${p[0]} & ${p[1]}`;
        nameLabels[1].innerHTML = `<strong>T2:</strong> ${p[2]} & ${p[3]}`;
    } else {
        console.error("Could not find .names elements in the match card.");
    }
}

function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; }

function finalizeTournament() {
    let s = {}; players.forEach(p => s[p] = {w:0, l:0, d:0, g:0});
    
    document.querySelectorAll('.match-card').forEach(c => {
        const s1 = parseInt(c.querySelector('.s1').value), s2 = parseInt(c.querySelector('.s2').value);
        const p = [c.dataset.p1, c.dataset.p2, c.dataset.p3, c.dataset.p4];
        if (!isNaN(s1) && !isNaN(s2)) {
            p.forEach(n => { if(s[n]) s[n].g++; });
            if(s[p[0]] && s[p[1]]) { s[p[0]].d += (s1-s2); s[p[1]].d += (s1-s2); }
            if(s[p[2]] && s[p[3]]) { s[p[2]].d += (s2-s1); s[p[3]].d += (s2-s1); }
            if (s1 > s2) { s[p[0]].w++; s[p[1]].w++; s[p[2]].l++; s[p[3]].l++; }
            else if (s2 > s1) { s[p[2]].w++; s[p[3]].w++; s[p[0]].l++; s[p[1]].l++; }
        }
    });

    const sorted = Object.entries(s).filter(([_,v]) => v.g > 0).sort((a,b) => b[1].w - a[1].w || b[1].d - a[1].d);

    document.getElementById('lb-body').innerHTML = sorted.map(([n,v], i) => {
        // Determine the class based on point differential
        let diffClass = "diff-neutral";
        if (v.d > 0) diffClass = "diff-positive";
        if (v.d < 0) diffClass = "diff-negative";

        return `
            <tr>
                <td>${i+1}</td>
                <td><strong>${n}</strong></td>
                <td>${v.w}-${v.l}</td>
                <td class="${diffClass}">${v.d > 0 ? '+' : ''}${v.d}</td>
                <td>${v.g}</td>
            </tr>`;
    }).join('');

    document.getElementById('view-matches').style.display = 'none';
    document.getElementById('view-leaderboard').style.display = 'block';
}

function goBack() { document.getElementById('view-leaderboard').style.display = 'none'; document.getElementById('view-matches').style.display = 'block'; }