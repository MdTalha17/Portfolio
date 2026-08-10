function printHtmlToTerminal(html) {
    if (window.printHtmlToTerminal) window.printHtmlToTerminal(html);
}

function clearTerminal() {
    if (window.clearTerminal) window.clearTerminal();
}

function getUsername() {
    return window.getUsername ? window.getUsername() : 'visitor';
}

function setUsername(name) {
    if (window.setUsername) window.setUsername(name);
}

function isMatrixRunning() {
    return window.isMatrixRunning ? window.isMatrixRunning() : false;
}

async function fetchApi(endpoint) {
    try {
        const res = await fetch(`/api/${endpoint}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

export async function askAI(question) {
    printHtmlToTerminal(`<pre><span class="cyber-dim">🤖 Thinking...</span></pre>`);
    try {
        const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const output = document.getElementById('terminal-output');
        if (output && output.lastChild && output.lastChild.textContent.includes('🤖 Thinking...')) {
            output.lastChild.remove();
        }

        let formatted = esc(data.answer).replace(/\n/g, '\n');
        printHtmlToTerminal(`<pre><span class="cyber-accent">🤖 AI Assistant:</span>\n${formatted}</pre>`);
    } catch (err) {
        printHtmlToTerminal(`<pre><span class="cyber-red">🤖 Error connecting to AI Assistant: ${esc(err.message)}</span></pre>`);
    }
}

export const commandHandlers = {

    'ask': async (args) => {
        if (!args || args.length === 0) {
            printHtmlToTerminal(`<pre><span class="cyber-warning">Usage: ask [your question]</span>\nExample: ask What projects has Talha built?</pre>`);
            return;
        }
        await askAI(args.join(' '));
    },

    'ai': async (args) => commandHandlers['ask'](args),

    'help': async function _help(args) {
        const cmds = await fetchApi('commands');
        if (!cmds) { printHtmlToTerminal(`<pre class="cyber-red">Failed to load commands.</pre>`); return; }

        // If a specific command was requested: help <command>
        if (args && args.length > 0) {
            const target = args[0].toLowerCase();
            if (cmds[target]) {
                printHtmlToTerminal(`<pre><span class="cyber-primary">${target}</span> <span class="cyber-dim">-</span> ${esc(cmds[target])}</pre>`);
            } else {
                printHtmlToTerminal(`<pre><span class="cyber-red">No help available for: ${esc(target)}</span></pre>`);
            }
            return;
        }

        const cmdNames = Object.keys(cmds);
        const colWidth = 16;
        const cols = Math.max(1, Math.floor(80 / colWidth));

        let html = `<pre>`;
        html += `<span class="cyber-warning">💡 Terminal Help Menu:</span>\n\n`;

        for (let i = 0; i < cmdNames.length; i += cols) {
            const row = cmdNames.slice(i, i + cols);
            html += row.map(c => `<span class="cyber-primary">${c.padEnd(colWidth)}</span>`).join('');
            html += `\n`;
        }

        html += `\n<span class="cyber-warning">💡 Tip:</span>\n`;
        html += `<span class="cyber-dim">  · Use </span><span class="cyber-primary">help &lt;command&gt;</span><span class="cyber-dim"> (e.g. help about) to see command details.</span>\n`;
        html += `<span class="cyber-dim">  · Use Tab for auto-completion and arrow keys (↑ ↓) to navigate command history.</span>\n`;
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    '?': async (args) => commandHandlers['help'](args),

    'about': async () => {
        const p = await fetchApi('profile');
        if (!p) { printHtmlToTerminal(`<pre class="cyber-red">Failed to load profile.</pre>`); return; }

        let html = `<pre>`;
        html += `<span class="cyber-accent">About Me</span>\n`;
        html += `<span class="cyber-dim">────────────────────────────────────────</span>\n`;
        html += `<span class="cyber-primary">Name:</span>     ${esc(p.name)}\n`;
        html += `<span class="cyber-primary">Role:</span>     ${esc(p.role)}\n`;
        html += `<span class="cyber-primary">Current:</span>  ${esc(p.current)}\n\n`;
        html += `${esc(p.bio)}\n\n`;
        html += `<span class="cyber-primary">Email:</span>    <a href="mailto:${p.email}">${esc(p.email)}</a>\n`;
        html += `<span class="cyber-primary">GitHub:</span>   <a href="${p.github}" target="_blank">${esc(p.github)}</a>\n`;
        html += `<span class="cyber-primary">LinkedIn:</span> <a href="${p.linkedin}" target="_blank">${esc(p.linkedin)}</a>\n`;
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'skills': async () => {
        const skills = await fetchApi('skills');
        if (!skills) { printHtmlToTerminal(`<pre class="cyber-red">Failed to load skills.</pre>`); return; }

        let html = `<pre>`;
        html += `<span class="cyber-accent">Technical Skills</span>\n`;
        html += `<span class="cyber-dim">────────────────────────────────────────</span>\n\n`;
        for (const [cat, items] of Object.entries(skills)) {
            html += `<span class="cyber-primary">${cat}:</span>\n`;
            html += `  ${items.join('  ·  ')}\n\n`;
        }
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'projects': async () => {
        const projects = await fetchApi('projects');
        if (!projects) { printHtmlToTerminal(`<pre class="cyber-red">Failed to load projects.</pre>`); return; }

        let html = `<pre>`;
        html += `<span class="cyber-accent">Featured Projects</span>\n`;
        html += `<span class="cyber-dim">────────────────────────────────────────</span>\n\n`;
        projects.forEach((p, i) => {
            const marker = i % 2 === 0 ? 'cyber-primary' : 'cyber-accent';
            html += `<span class="${marker}">▸ ${esc(p.name)}</span>`;
            if (p.language) html += ` <span class="cyber-dim">[${esc(p.language)}]</span>`;
            html += `\n`;
            html += `  ${esc(p.description)}\n`;
            html += `  <a href="${p.url}" target="_blank">→ ${esc(p.url)}</a>\n\n`;
        });
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'experience': async () => {
        const exp = await fetchApi('experience');
        if (!exp) { printHtmlToTerminal(`<pre class="cyber-red">Failed to load experience.</pre>`); return; }

        let html = `<pre>`;
        html += `<span class="cyber-accent">Work Experience</span>\n`;
        html += `<span class="cyber-dim">────────────────────────────────────────</span>\n\n`;
        exp.forEach(e => {
            html += `<span class="cyber-primary">▸ ${esc(e.title)}</span> <span class="cyber-dim">@</span> <span class="cyber-secondary">${esc(e.company)}</span>\n`;
            if (e.description) {
                html += `  ${esc(e.description)}\n`;
            }
            html += `\n`;
        });
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'education': async () => {
        const edu = await fetchApi('education');
        if (!edu) { printHtmlToTerminal(`<pre class="cyber-red">Failed to load education.</pre>`); return; }

        let html = `<pre>`;
        html += `<span class="cyber-accent">Education</span>\n`;
        html += `<span class="cyber-dim">────────────────────────────────────────</span>\n\n`;
        edu.forEach(e => {
            html += `<span class="cyber-primary">▸ ${esc(e.degree)}</span>\n`;
            html += `  ${esc(e.institution)}\n`;
            html += `  <span class="cyber-dim">${esc(e.duration)}</span>\n\n`;
        });
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'contact': async () => {
        let html = `<pre>`;
        html += `<span class="cyber-accent">Contact</span>\n`;
        html += `<span class="cyber-dim">────────────────────────────────────────</span>\n\n`;
        html += `<span class="cyber-primary">Email:</span>    <a href="mailto:talhamoh017@gmail.com">talhamoh017@gmail.com</a>\n`;
        html += `<span class="cyber-primary">GitHub:</span>   <a href="https://github.com/MdTalha17" target="_blank">github.com/MdTalha17</a>\n`;
        html += `<span class="cyber-primary">LinkedIn:</span> <a href="https://linkedin.com/in/mdtalha17" target="_blank">linkedin.com/in/mdtalha17</a>\n`;
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'social': async () => {
        commandHandlers['contact']();
    },

    'github': async () => {
        const stats = await fetchApi('github-stats');
        if (!stats) { printHtmlToTerminal(`<pre class="cyber-red">Failed to fetch GitHub stats.</pre>`); return; }

        let html = `<pre>`;
        html += `<span class="cyber-primary">MdTalha17</span><span class="cyber-dim">@github</span>\n`;
        html += `<span class="cyber-dim">──────────────────</span>\n`;
        html += `<span class="cyber-primary">Repos:</span>     ${stats.repos}\n`;
        html += `<span class="cyber-primary">Followers:</span> ${stats.followers}\n`;
        html += `<span class="cyber-primary">Following:</span> ${stats.following}\n`;
        html += `<span class="cyber-primary">Joined:</span>    ${esc(stats.joined)}\n`;
        html += `<span class="cyber-primary">Profile:</span>   <a href="${stats.profile}" target="_blank">${esc(stats.profile)}</a>\n`;
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'neofetch': async () => {
        const uptime = getUptime();
        let html = `<pre style="display:flex; gap:24px; align-items:flex-start;">`;
        html += `<span class="cyber-dim" style="line-height:1.3;">  ╔══════╗
  ║ ▓▓▓▓ ║
  ║ ▓  ▓ ║
  ║ ▓▓▓▓ ║
  ║ ▓  ▓ ║
  ╚══════╝</span>`;
        html += `<span style="line-height:1.5;"><span class="cyber-primary">${getUsername()}</span><span class="cyber-dim">@</span><span class="cyber-accent">portfolio</span>
<span class="cyber-dim">─────────────────────</span>
<span class="cyber-primary">OS:</span>       Web Terminal v1.0
<span class="cyber-primary">Host:</span>     FastAPI Backend
<span class="cyber-primary">Shell:</span>    CyberShell
<span class="cyber-primary">Theme:</span>    ${document.body.className || 'cyberpunk'}
<span class="cyber-primary">Terminal:</span> ${navigator.userAgent.split(' ').pop().split('/')[0] || 'Web Browser'}
<span class="cyber-primary">Name:</span>     <span class="cyber-accent">Mohd Talha</span>
<span class="cyber-primary">Role:</span>     AI/ML Engineer
<span class="cyber-primary">Uptime:</span>   ${uptime}
</span>`;
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'theme': async (args) => {
        const validThemes = ['cyberpunk', 'matrix', 'dracula', 'monokai'];
        if (!args || args.length === 0) {
            let html = `<pre><span class="cyber-accent">Available Themes:</span>\n\n`;
            validThemes.forEach(t => {
                const active = (t === 'cyberpunk' && !document.body.className) || document.body.className === `theme-${t}`;
                html += `  <span class="cyber-primary">${t.padEnd(12)}</span>${active ? ' <span class="cyber-dim">← active</span>' : ''}\n`;
            });
            html += `\nUsage: <span class="highlight">theme [name]</span>\n</pre>`;
            printHtmlToTerminal(html);
            return;
        }
        const theme = args[0].toLowerCase();
        if (validThemes.includes(theme)) {
            document.body.className = theme === 'cyberpunk' ? '' : `theme-${theme}`;
            localStorage.setItem('terminal-theme', document.body.className);
            printHtmlToTerminal(`<pre><span class="cyber-primary">Theme switched to: ${theme}</span></pre>`);
        } else {
            printHtmlToTerminal(`<pre><span class="cyber-red">Unknown theme: ${esc(theme)}</span>. Available: ${validThemes.join(', ')}</pre>`);
        }
    },

    'matrix': async () => {
        const enabled = window.toggleMatrix();
        if (enabled) {
            printHtmlToTerminal(`<pre><span class="cyber-primary">Matrix rain enabled.</span></pre>`);
        } else {
            printHtmlToTerminal(`<pre><span class="cyber-dim">Matrix rain disabled.</span></pre>`);
        }
    },

    'clear': async () => {
        clearTerminal();
    },

    'date': async () => {
        printHtmlToTerminal(`<pre>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</pre>`);
    },

    'time': async () => {
        printHtmlToTerminal(`<pre>${new Date().toLocaleTimeString('en-US', { hour12: true })}</pre>`);
    },

    'whoami': async () => {
        printHtmlToTerminal(`<pre>${getUsername()}</pre>`);
    },

    'history': async () => {
        const hist = JSON.parse(localStorage.getItem('terminal-history') || '[]');
        if (hist.length === 0) {
            printHtmlToTerminal(`<pre><span class="cyber-dim">No command history.</span></pre>`);
            return;
        }
        let html = `<pre>`;
        hist.forEach((cmd, i) => {
            html += `<span class="cyber-dim">${(i + 1).toString().padStart(4)}</span>  ${esc(cmd)}\n`;
        });
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'quote': async () => {
        const q = await fetchApi('quote');
        if (!q) { printHtmlToTerminal(`<pre class="cyber-red">Failed to fetch quote.</pre>`); return; }
        printHtmlToTerminal(`<pre>\n  <span class="cyber-accent">"</span>${esc(q.text)}<span class="cyber-accent">"</span>\n  <span class="cyber-dim">— ${esc(q.author)}</span>\n</pre>`);
    },

    'ascii': async () => {
        printHtmlToTerminal(`<pre class="cyber-primary">
   ██████╗██╗   ██╗██████╗ ███████╗██████╗ 
  ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗
  ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝
  ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗
  ╚██████╗   ██║   ██████╔╝███████╗██║  ██║
   ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝</pre>`);
    },

    'repo': async (args) => {
        if (!args || args.length === 0) {
            printHtmlToTerminal(`<pre><span class="cyber-warning">Usage: repo [name]</span>\nExample: repo snapshare</pre>`);
            return;
        }
        const url = `https://github.com/MdTalha17/${args[0]}`;
        window.open(url, '_blank');
        printHtmlToTerminal(`<pre>Opening <a href="${url}" target="_blank">${esc(url)}</a> ...</pre>`);
    },

    'resume': async () => {
        printHtmlToTerminal(`<pre><span class="cyber-accent">Resume</span>\n<span class="cyber-dim">────────────────────────────────────────</span>\nResume is currently being updated.\nType <span class="highlight">"contact"</span> to reach out directly.</pre>`);
    },

    'goals': async () => {
        const goals = await fetchApi('goals');
        const items = goals || ["Build scalable AI products", "Contribute to open-source", "Explore LLMs & MLOps", "Keep learning"];

        let html = `<pre>`;
        html += `<span class="cyber-accent">Goals & Aspirations</span>\n`;
        html += `<span class="cyber-dim">────────────────────────────────────────</span>\n\n`;
        items.forEach(g => {
            html += `  <span class="cyber-primary">▸</span> ${esc(g)}\n`;
        });
        html += `\n<span class="cyber-dim">"Code. Learn. Build. Repeat."</span>\n`;
        html += `</pre>`;
        printHtmlToTerminal(html);
    },

    'welcome': async () => {
        printHtmlToTerminal(`<pre>\nWelcome to Mohd Talha's Terminal\nType <span class="highlight">"help"</span> to see available commands.\n</pre>`);
    },

    'banner': async () => {
        printHtmlToTerminal(`<pre class="cyber-primary">
████████╗ █████╗ ██╗     ██╗  ██╗ █████╗ 
╚══██╔══╝██╔══██╗██║     ██║  ██║██╔══██╗
   ██║   ███████║██║     ███████║███████║
   ██║   ██╔══██║██║     ██╔══██║██╔══██║
   ██║   ██║  ██║███████╗██║  ██║██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝</pre>`);
    },

    'shutdown': async () => {
        printHtmlToTerminal(`<pre><span class="cyber-warning">Shutting down system...</span></pre>`);
        if (window.triggerShutdown) window.triggerShutdown();
    },

    'exit': async () => commandHandlers['shutdown'](),
    'poweroff': async () => commandHandlers['shutdown'](),
    'sleep': async () => commandHandlers['shutdown'](),

    'reboot': async () => {
        printHtmlToTerminal(`<pre><span class="cyber-warning">Rebooting system...</span></pre>`);
        if (window.triggerReboot) window.triggerReboot();
    },

    'restart': async () => commandHandlers['reboot'](),

    'boot': async () => {
        printHtmlToTerminal(`<pre><span class="cyber-primary">Running boot sequence...</span></pre>`);
        if (window.triggerBootSequence) window.triggerBootSequence();
    },

    '': async () => { }
};

function getUptime() {
    const start = window._terminalStart || Date.now();
    const diff = Math.floor((Date.now() - start) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
