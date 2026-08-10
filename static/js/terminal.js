import { commandHandlers, askAI } from './commands.js';


let commandHistory = [];
let historyIndex = -1;
let username = 'visitor';
let terminalOutput;
let mainContainer;

export function getUsername() {
    return username;
}

export function setUsername(name) {
    username = name || 'visitor';
    localStorage.setItem('terminal-username', username);
}

export function printToTerminal(text, isHtml = false) {
    const line = document.createElement('div');
    line.className = 'terminal-output-line';

    if (isHtml) {
        line.innerHTML = text;
    } else {
        const pre = document.createElement('pre');
        pre.textContent = text;
        line.appendChild(pre);
    }

    terminalOutput.appendChild(line);
    scrollToBottom();
}

export function printHtmlToTerminal(html) {
    printToTerminal(html, true);
}

export function clearTerminal() {
    if (!terminalOutput) return;
    terminalOutput.innerHTML = '';
    const hintLine = document.createElement('div');
    hintLine.className = 'terminal-output-line';
    hintLine.innerHTML = `<span>Type <span class="highlight">'help'</span> for commands, or ask any question to the <span class="cyber-accent">AI Assistant</span>.</span>`;
    terminalOutput.appendChild(hintLine);
    terminalOutput.appendChild(document.createElement('br'));
}

window.getUsername = getUsername;
window.setUsername = setUsername;
window.printToTerminal = printToTerminal;
window.printHtmlToTerminal = printHtmlToTerminal;
window.clearTerminal = clearTerminal;

function scrollToBottom() {
    requestAnimationFrame(() => {
        mainContainer.scrollTop = mainContainer.scrollHeight;
    });
}

function getPromptString() {
    return `${username}@talha:~$ `;
}

function createInputLine() {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'input-line';

    const promptSpan = document.createElement('span');
    promptSpan.className = 'prompt';
    promptSpan.textContent = getPromptString();

    const inputSpan = document.createElement('span');
    inputSpan.className = 'command-input';
    inputSpan.contentEditable = 'true';
    inputSpan.spellcheck = false;
    inputSpan.setAttribute('autocomplete', 'off');
    inputSpan.setAttribute('autocorrect', 'off');
    inputSpan.setAttribute('autocapitalize', 'off');

    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'typing-cursor';

    lineDiv.appendChild(promptSpan);
    lineDiv.appendChild(inputSpan);
    lineDiv.appendChild(cursorSpan);

    inputSpan.addEventListener('keydown', handleInputKeyDown);

    terminalOutput.appendChild(lineDiv);
    scrollToBottom();

    // Focus the input
    requestAnimationFrame(() => {
        inputSpan.focus();
    });

    return lineDiv;
}

function handleInputKeyDown(e) {
    const input = e.target;

    if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = input.innerText.trim();

        // Disable this input
        input.contentEditable = 'false';
        input.removeEventListener('keydown', handleInputKeyDown);

        // Remove cursor
        const cursor = input.parentElement.querySelector('.typing-cursor');
        if (cursor) cursor.remove();

        // Process command
        if (cmd !== '') {
            commandHistory.push(cmd);
            if (commandHistory.length > 100) commandHistory.shift();
            localStorage.setItem('terminal-history', JSON.stringify(commandHistory));
            historyIndex = commandHistory.length;
        }

        const result = handleCommand(cmd);
        Promise.resolve(result).then(() => {
            createInputLine();
        });

    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            input.innerText = commandHistory[historyIndex];
            moveCaretToEnd(input);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            input.innerText = commandHistory[historyIndex];
            moveCaretToEnd(input);
        } else {
            historyIndex = commandHistory.length;
            input.innerText = '';
        }
    } else if (e.key === 'Tab') {
        e.preventDefault();
        const current = input.innerText.trim().toLowerCase();
        if (current) {
            const cmds = Object.keys(commandHandlers);
            const match = cmds.find(c => c.startsWith(current) && c !== current);
            if (match) {
                input.innerText = match;
                moveCaretToEnd(input);
            }
        }
    }
}

function moveCaretToEnd(el) {
    requestAnimationFrame(() => {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });
}

async function handleCommand(cmdString) {
    const trimmed = cmdString.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (commandHandlers[cmd]) {
        try {
            await commandHandlers[cmd](args);
        } catch (error) {
            printHtmlToTerminal(`<pre><span class="cyber-red">Error: ${error.message}</span></pre>`);
        }
    } else {
        await askAI(trimmed);
    }
}

function initTerminal() {
    window._terminalStart = Date.now();

    terminalOutput = document.getElementById('terminal-output');
    mainContainer = document.getElementById('main-terminal');

    // Load saved state
    const savedUsername = localStorage.getItem('terminal-username');
    if (savedUsername) username = savedUsername;

    const savedHistory = localStorage.getItem('terminal-history');
    if (savedHistory) {
        try { commandHistory = JSON.parse(savedHistory); } catch (e) { }
    }
    historyIndex = commandHistory.length;

    // Click anywhere to focus current input
    mainContainer.addEventListener('click', (e) => {
        if (e.target.closest('.command-input')) return;
        const activeInput = terminalOutput.querySelector('.command-input[contenteditable="true"]');
        if (activeInput) {
            activeInput.focus();
            moveCaretToEnd(activeInput);
        }
    });

    // Create first input line
    createInputLine();

    // Init header controls
    initHeader();

    // Init GUI View toggle & tabs
    initGuiView();

    // Init matrix rain (hidden by default)
    initMatrix();

    // Update year in footer
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ============================================
   HEADER CONTROLS
   ============================================ */
function initHeader() {
    // Date & Time
    const dtDisplay = document.getElementById('datetime');
    function updateDateTime() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const date = now.toLocaleDateString('en-US', options);
        const time = now.toLocaleTimeString('en-US', { hour12: true });
        dtDisplay.textContent = `${date}  ${time}`;
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themes = ['', 'theme-matrix', 'theme-dracula', 'theme-monokai'];
    const themeNames = ['cyberpunk', 'matrix', 'dracula', 'monokai'];
    let currentThemeIdx = 0;

    const savedTheme = localStorage.getItem('terminal-theme');
    if (savedTheme) {
        const idx = themes.indexOf(savedTheme);
        if (idx >= 0) {
            currentThemeIdx = idx;
            document.body.className = savedTheme;
        }
    }

    themeToggle.addEventListener('click', () => {
        currentThemeIdx = (currentThemeIdx + 1) % themes.length;
        document.body.className = themes[currentThemeIdx];
        localStorage.setItem('terminal-theme', themes[currentThemeIdx]);
    });

    // Fullscreen Toggle
    const fsToggle = document.getElementById('fullscreen-toggle');
    fsToggle.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            document.exitFullscreen();
        }
    });
}

/* ============================================
   GUI PORTFOLIO VIEW & TAB LOGIC
   ============================================ */
window.togglePortfolioView = function(targetMode) {
    const viewBtn = document.getElementById('view-mode-toggle');
    const modeText = document.getElementById('mode-text');
    const terminalView = document.getElementById('main-terminal');
    const guiView = document.getElementById('main-gui');

    if (!terminalView || !guiView) return;

    let isCurrentlyGui = !guiView.classList.contains('hidden');
    let newMode = targetMode || (isCurrentlyGui ? 'cli' : 'gui');

    if (newMode === 'gui') {
        terminalView.classList.add('hidden');
        guiView.classList.remove('hidden');
        if (modeText) modeText.textContent = 'CLI';
        if (viewBtn) viewBtn.title = 'Switch to Terminal CLI View';
        localStorage.setItem('portfolio-view-mode', 'gui');
    } else {
        guiView.classList.add('hidden');
        terminalView.classList.remove('hidden');
        if (modeText) modeText.textContent = 'GUI';
        if (viewBtn) viewBtn.title = 'Switch to GUI View';
        localStorage.setItem('portfolio-view-mode', 'cli');

        const activeInput = terminalView.querySelector('.command-input[contenteditable="true"]');
        if (activeInput) activeInput.focus();
    }
};

function initGuiView() {
    const viewBtn = document.getElementById('view-mode-toggle');

    if (viewBtn) {
        viewBtn.onclick = function(e) {
            if (e) e.preventDefault();
            window.togglePortfolioView();
        };
    }

    const savedMode = localStorage.getItem('portfolio-view-mode');
    if (savedMode === 'gui') {
        window.togglePortfolioView('gui');
    }

    // GUI Tab Switching
    const tabBtns = document.querySelectorAll('.gui-tab-btn');
    const sections = document.querySelectorAll('.gui-section');

    tabBtns.forEach(btn => {
        btn.onclick = function(e) {
            if (e) e.preventDefault();
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => {
                s.classList.add('hidden');
                s.classList.remove('active');
            });

            btn.classList.add('active');
            const targetSection = document.getElementById(`tab-${targetTab}`);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('active');
            }
        };
    });
}


/* ============================================
   MATRIX RAIN — Canvas effect
   ============================================ */
let matrixRunning = false;
let matrixInterval = null;

function initMatrix() {
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const chars = 'アァカサタナハマヤャラワガザダバパABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops = new Array(columns).fill(1);

    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975)
                drops[i] = 0;

            drops[i]++;
        }
    }

    // Expose toggle function
    window.toggleMatrix = function () {
        const canvas = document.getElementById('matrix-canvas');
        if (matrixRunning) {
            clearInterval(matrixInterval);
            matrixInterval = null;
            matrixRunning = false;
            canvas.style.display = 'none';
            return false;
        } else {
            columns = Math.floor(canvas.width / fontSize);
            drops = new Array(columns).fill(1);
            canvas.style.display = 'block';
            matrixInterval = setInterval(draw, 33);
            matrixRunning = true;
            return true;
        }
    };
}

export function isMatrixRunning() {
    return matrixRunning;
}

/* ============================================
   BOOT & SHUTDOWN ANIMATION ENGINE
   ============================================ */
const SHUTDOWN_LOGS = [
    "[ <span class='ok-badge'>OK</span> ] Stopping Network Manager...",
    "[ <span class='ok-badge'>OK</span> ] Disconnecting active network interfaces...",
    "[ <span class='ok-badge'>OK</span> ] Stopping User Sessions...",
    "[ <span class='ok-badge'>OK</span> ] Terminating background services...",
    "[ <span class='ok-badge'>OK</span> ] Stopping System Logging...",
    "[ <span class='ok-badge'>OK</span> ] Stopping Authorization Manager...",
    "[ <span class='ok-badge'>OK</span> ] Saving system clock...",
    "[ <span class='ok-badge'>OK</span> ] Unmounting /home...",
    "[ <span class='ok-badge'>OK</span> ] Unmounting /var...",
    "[ <span class='ok-badge'>OK</span> ] Disabling Swap...",
    "[ <span class='ok-badge'>OK</span> ] All file systems unmounted.",
    "[ <span class='ok-badge'>OK</span> ] Reached target Shutdown.",
    "[ <span class='star-badge'>*</span> ] Powering off...",
    "",
    "SYSTEM IS GOING TO SLEEP"
];

const RESUME_LOGS = [
    "[SYSTEM] Resuming Network Manager...",
    "[NETWORK] Connection restored",
    "[DEVICE] Filesystems mounted",
    "[SECURITY] Firewalls active",
    "",
    "GETTING SYSTEM READY..."
];

let isPowerAnimating = false;

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function streamLogs(container, logs, onComplete) {
    for (let i = 0; i < logs.length; i++) {
        const lineText = logs[i];
        if (!lineText) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'power-log-line';
            emptyDiv.style.height = '14px';
            container.appendChild(emptyDiv);
            container.scrollTop = container.scrollHeight;
            await new Promise(r => setTimeout(r, 100));
            continue;
        }

        const div = document.createElement('div');
        div.className = 'power-log-line';

        const textSpan = document.createElement('span');
        const cursor = document.createElement('span');
        cursor.className = 'stream-cursor';
        cursor.textContent = '█';

        div.appendChild(textSpan);
        div.appendChild(cursor);
        container.appendChild(div);

        container.scrollTop = container.scrollHeight;

        let badgeHtml = '';
        let messageStr = lineText;

        if (lineText.includes("ok-badge")) {
            badgeHtml = `<span class="ok-badge">[ OK ]</span>`;
            messageStr = lineText.replace("[ <span class='ok-badge'>OK</span> ]", "").trim();
        } else if (lineText.includes("star-badge")) {
            badgeHtml = `<span class="star-badge">[ * ]</span>`;
            messageStr = lineText.replace("[ <span class='star-badge'>*</span> ]", "").trim();
        } else if (lineText.startsWith("[")) {
            const closingIndex = lineText.indexOf("]");
            if (closingIndex !== -1) {
                const tag = lineText.substring(0, closingIndex + 1);
                badgeHtml = `<span class="ok-badge">${tag}</span>`;
                messageStr = lineText.substring(closingIndex + 1).trim();
            }
        }

        if (badgeHtml) {
            textSpan.innerHTML = badgeHtml + " ";
            container.scrollTop = container.scrollHeight;
            await new Promise(r => setTimeout(r, 60));
        }

        for (let c = 0; c < messageStr.length; c++) {
            const currentMessage = messageStr.substring(0, c + 1);
            textSpan.innerHTML = (badgeHtml ? badgeHtml + " " : "") + escapeHtml(currentMessage);
            container.scrollTop = container.scrollHeight;
            await new Promise(r => setTimeout(r, 14));
        }

        cursor.remove();
        container.scrollTop = container.scrollHeight;
        await new Promise(r => setTimeout(r, 120));
    }

    if (onComplete) onComplete();
}

window.triggerShutdown = function() {
    if (isPowerAnimating) return;
    isPowerAnimating = true;

    const overlay = document.getElementById('power-overlay');
    const content = document.getElementById('power-screen-content');
    if (!overlay || !content) return;

    content.classList.remove('suspended-mode');
    content.innerHTML = '';
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    setTimeout(() => {
        streamLogs(content, SHUTDOWN_LOGS, () => {
            setTimeout(showSuspendedScreen, 500);
        });
    }, 300);
};

function showSuspendedScreen() {
    const overlay = document.getElementById('power-overlay');
    const content = document.getElementById('power-screen-content');
    if (!overlay || !content) return;

    content.innerHTML = '';
    content.classList.add('suspended-mode');

    const suspendedBox = document.createElement('div');
    suspendedBox.className = 'suspended-box';
    suspendedBox.innerHTML = `
        <div class="suspended-title">[ SYSTEM SUSPENDED ]</div>
        <div class="suspended-subtitle">Awaiting user reactivation...</div>
        <button id="wake-btn" class="wake-power-btn" type="button" title="Reactivate System">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
        </button>
    `;

    content.appendChild(suspendedBox);

    const wakeBtn = document.getElementById('wake-btn');
    if (wakeBtn) {
        wakeBtn.onclick = function(e) {
            if (e) e.preventDefault();
            window.triggerBootSequence();
        };
    }
}

window.triggerBootSequence = function(callback) {
    const overlay = document.getElementById('power-overlay');
    const content = document.getElementById('power-screen-content');
    if (!overlay || !content) return;

    content.classList.remove('suspended-mode');
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    content.innerHTML = '';

    setTimeout(() => {
        streamLogs(content, RESUME_LOGS, () => {
            const barContainer = document.createElement('div');
            barContainer.className = 'boot-progress-bar';
            const fill = document.createElement('div');
            fill.className = 'boot-progress-fill';
            barContainer.appendChild(fill);
            content.appendChild(barContainer);
            content.scrollTop = content.scrollHeight;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    fill.style.width = '100%';
                });
            });

            setTimeout(() => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    content.innerHTML = '';
                    content.classList.remove('suspended-mode');
                    isPowerAnimating = false;
                    if (callback) callback();
                }, 500);
            }, 2400);
        });
    }, 200);
};

window.triggerReboot = function() {
    window.triggerShutdown();
    setTimeout(() => {
        window.triggerBootSequence();
    }, 6000);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTerminal);
} else {
    initTerminal();
}
