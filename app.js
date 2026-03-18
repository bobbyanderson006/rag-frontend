const API_URL = "https://rag-backend-production-f563.up.railway.app";

// --- STATE MANAGEMENT ---
let chats = [];           // Array to hold all our chat sessions
let activeSessionId = ""; // The ID of the currently selected chat
let chunksData = [];      // Array to hold the document chunks
let activeTab = "chat";   // 'chat' or 'docs'

// --- DOM ELEMENTS ---
// Tabs & Views
const tabChat = document.getElementById('tab-chat');
const tabDocs = document.getElementById('tab-docs');
const viewChat = document.getElementById('view-chat');
const viewDocs = document.getElementById('view-docs');
// Upload
const fileInput = document.getElementById('file-upload');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
// Chat
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatList = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');
// Docs
const chunksGrid = document.getElementById('chunks-grid');
const chunkSearch = document.getElementById('chunk-search');
// System
const resetBtn = document.getElementById('reset-btn');

// --- INITIALIZATION ---
function generateSessionId() {
    return "session-" + Math.random().toString(36).substring(2, 9);
}

function createNewChat() {
    const newId = generateSessionId();
    const newChat = {
        id: newId,
        title: `Chat ${chats.length + 1}`,
        messages: [{ role: 'ai', text: "Hello! Ask me any questions about the uploaded documents." }]
    };
    chats.push(newChat);
    activeSessionId = newId;
    renderSidebar();
    renderChat();
    switchTab('chat');
}

// Start the app with one empty chat
createNewChat();
fetchChunks(); // Try to load chunks if backend already has them

// --- TAB LOGIC ---
function switchTab(tab) {
    activeTab = tab;
    if (tab === 'chat') {
        viewChat.classList.remove('hidden');
        viewDocs.classList.add('hidden');
        tabChat.classList.replace('text-slate-500', 'text-indigo-600');
        tabChat.classList.replace('hover:text-slate-700', 'bg-white');
        tabChat.classList.add('shadow-sm');
        tabDocs.classList.replace('bg-white', 'hover:text-slate-700');
        tabDocs.classList.replace('text-indigo-600', 'text-slate-500');
        tabDocs.classList.remove('shadow-sm');
    } else {
        viewChat.classList.add('hidden');
        viewDocs.classList.remove('hidden');
        tabDocs.classList.replace('text-slate-500', 'text-indigo-600');
        tabDocs.classList.replace('hover:text-slate-700', 'bg-white');
        tabDocs.classList.add('shadow-sm');
        tabChat.classList.replace('bg-white', 'hover:text-slate-700');
        tabChat.classList.replace('text-indigo-600', 'text-slate-500');
        tabChat.classList.remove('shadow-sm');
        renderChunks(); // Re-render chunks when switching to docs
    }
}
tabChat.addEventListener('click', () => switchTab('chat'));
tabDocs.addEventListener('click', () => switchTab('docs'));

// --- SIDEBAR UI ---
// --- SIDEBAR UI ---
// --- SIDEBAR UI ---
function renderSidebar() {
    chatList.innerHTML = '';
    chats.forEach(chat => {
        // The container holds the chat button AND the action icons
        const container = document.createElement('div');
        container.className = 'flex items-center gap-1 group w-full';

        // 1. The main chat selection button
        const btn = document.createElement('button');
        const isActive = chat.id === activeSessionId;
        btn.className = `flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`;
        btn.textContent = chat.title;
        btn.onclick = () => {
            activeSessionId = chat.id;
            renderSidebar();
            renderChat();
            switchTab('chat');
        };

        // 2. A wrapper div for our hover actions (Edit + Delete)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0';

        // 3. The Rename (Pencil) Button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        `;
        editBtn.className = "p-1.5 rounded-md hover:bg-indigo-50 focus:opacity-100 transition-colors";
        editBtn.onclick = (e) => {
            e.stopPropagation(); // Don't trigger the chat selection
            const newTitle = prompt("Rename chat session:", chat.title);
            // Only update if they typed something and didn't hit cancel
            if (newTitle !== null && newTitle.trim() !== "") {
                chat.title = newTitle.trim();
                renderSidebar(); // Re-render to show the new name
            }
        };

        // 4. The Delete (Trash) Button
        const delBtn = document.createElement('button');
        delBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        `;
        delBtn.className = "p-1.5 rounded-md hover:bg-red-50 focus:opacity-100 transition-colors";
        delBtn.onclick = (e) => {
            e.stopPropagation(); 
            // The Safety Check!
            if (confirm(`Are you sure you want to delete "${chat.title}"?`)) {
                deleteChat(chat.id);
            }
        };

        // Assemble the pieces
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);
        container.appendChild(btn);
        container.appendChild(actionsDiv);
        chatList.appendChild(container);
    });
}

// --- NEW DELETION LOGIC ---
function deleteChat(idToDelete) {
    // 1. Remove the chat from the array
    chats = chats.filter(c => c.id !== idToDelete);
    
    // 2. If we just deleted the chat we were currently looking at...
    if (activeSessionId === idToDelete) {
        // Fall back to the most recent available chat, or create a brand new one if the list is empty
        if (chats.length > 0) {
            activeSessionId = chats[chats.length - 1].id;
        } else {
            createNewChat(); 
            return; // createNewChat already calls the render functions, so we can exit early
        }
    }
    
    // 3. Update the UI
    renderSidebar();
    renderChat();
}
newChatBtn.addEventListener('click', createNewChat);

// --- CHAT UI ---
function renderChat() {
    chatBox.innerHTML = '';
    const currentChat = chats.find(c => c.id === activeSessionId);
    if (!currentChat) return;

    currentChat.messages.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('p-4', 'rounded-2xl', 'max-w-[85%]', 'whitespace-pre-wrap', 'shadow-sm', 'text-sm');
        
        if (msg.role === 'user') {
            msgDiv.classList.add('bg-indigo-600', 'text-white', 'self-end', 'rounded-tr-none');
            msgDiv.textContent = msg.text;
       } else {
            msgDiv.classList.add('bg-white', 'border', 'border-slate-200', 'text-slate-800', 'self-start', 'rounded-tl-none');
            
            // FIX 1: Parse the LLM's text through the Markdown library!
            let parsedText = msg.text;
            try {
                if (typeof marked !== 'undefined') {
                    parsedText = marked.parse(msg.text);
                }
            } catch (e) {
                console.warn("Markdown error, using raw text.");
            }
            let contentHTML = `<div class="markdown-body">${parsedText}</div>`;
            
            // --- UPGRADED CITATION UI (STRICT HEIGHT LIMIT) ---
            if (msg.citations && msg.citations.length > 0) {
                const uniqueCitesMap = new Map();
                msg.citations.forEach(c => {
                    const key = `Page ${c.page}-${c.type}`;
                    if (!uniqueCitesMap.has(key)) {
                        uniqueCitesMap.set(key, c);
                    }
                });
                
                const uniqueCites = Array.from(uniqueCitesMap.values());
                const topCites = uniqueCites.slice(0, 3);
                const remainingCount = uniqueCites.length - 3;
                
                contentHTML += `<div class="mt-4 pt-3 border-t border-slate-200">`;
                contentHTML += `<div class="flex flex-wrap items-center justify-start gap-2">`; 
                
                topCites.forEach(cite => {
                    let typeLabel = 'TXT';
                    let colorClass = 'bg-slate-50 text-slate-600 border-slate-200';
                    let badgeColor = 'bg-slate-200 text-slate-500';
                    
                    if (cite.type === 'table') { 
                        typeLabel = 'TBL'; 
                        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'; 
                        badgeColor = 'bg-emerald-200 text-emerald-700';
                    }
                    if (cite.type === 'image') { 
                        typeLabel = 'IMG'; 
                        colorClass = 'bg-blue-50 text-blue-700 border-blue-200'; 
                        badgeColor = 'bg-blue-200 text-blue-700';
                    }
                    
                    // FIX 2: Added 'h-7' (strict 28px height) and 'inline-flex' to physically prevent vertical stretching
                    contentHTML += `
                        <div class="inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-[11px] font-medium border ${colorClass} shadow-sm">
                            <span class="font-bold ${badgeColor} px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">${typeLabel}</span>
                            <span>Page ${cite.page}</span>
                        </div>`;
                });
                
                if (remainingCount > 0) {
                    // Also strictly limit height here
                    contentHTML += `
                        <div class="inline-flex items-center px-2 h-7 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 shadow-sm">
                            +${remainingCount} more
                        </div>`;
                }
                
                contentHTML += `</div></div>`;
            }
            msgDiv.innerHTML = contentHTML;
        }
        chatBox.appendChild(msgDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    const currentChat = chats.find(c => c.id === activeSessionId);
    
    // Add user message to state and render
    currentChat.messages.push({ role: 'user', text: text });
    chatInput.value = '';
    renderChat();
    
    // Temporary Loading Bubble
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('p-4', 'rounded-2xl', 'rounded-tl-none', 'bg-white', 'border', 'border-slate-200', 'self-start', 'text-slate-400', 'italic', 'text-sm', 'animate-pulse');
    loadingDiv.textContent = "Agent is reasoning...";
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, session_id: activeSessionId })
        });

        const data = await response.json();
        loadingDiv.remove();

        if (response.ok) {
            currentChat.messages.push({ role: 'ai', text: data.reply, citations: data.citations });
        } else {
            currentChat.messages.push({ role: 'ai', text: `❌ Error: ${data.detail}` });
        }
    } catch (error) {
        loadingDiv.remove();
        currentChat.messages.push({ role: 'ai', text: "❌ Connection failed." });
    }
    renderChat();
});

chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });

// --- UPLOAD LOGIC ---
uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Select a PDF first.");

    const formData = new FormData();
    formData.append("file", file);

    uploadStatus.textContent = "Processing...";
    uploadStatus.classList.replace('hidden', 'block');
    uploadStatus.className = "text-xs font-medium text-amber-500 animate-pulse block";
    uploadBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        
        if (response.ok) {
            uploadStatus.textContent = "✅ Processed";
            uploadStatus.className = "text-xs font-medium text-emerald-500 block";
            fetchChunks(); // Automatically fetch the new chunks!
        } else {
            uploadStatus.textContent = "❌ Failed";
            uploadStatus.className = "text-xs font-medium text-red-500 block";
        }
    } catch (error) {
        uploadStatus.textContent = "❌ Error";
        uploadStatus.className = "text-xs font-medium text-red-500 block";
    } finally {
        uploadBtn.disabled = false;
        setTimeout(() => { uploadStatus.classList.add('hidden'); fileInput.value = ""; }, 3000);
    }
});

// --- DOCUMENT EXPLORER LOGIC ---
async function fetchChunks() {
    try {
        const response = await fetch(`${API_URL}/chunks`);
        if (response.ok) {
            const data = await response.json();
            chunksData = data.chunks;
            if (activeTab === 'docs') renderChunks();
        }
    } catch (e) { console.error("Could not load chunks:", e); }
}

function renderChunks(filterText = "") {
    chunksGrid.innerHTML = '';
    
    // FIX: Check for chunk.text instead of chunk.content
    const filtered = chunksData.filter(chunk => {
        const textData = chunk.text || chunk.content || "";
        return textData.toLowerCase().includes(filterText.toLowerCase());
    });

    if (filtered.length === 0) {
        chunksGrid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-10">No chunks found. Upload a document or adjust search.</div>`;
        return;
    }

    filtered.forEach(chunk => {
        const type = chunk.metadata.type || 'text';
        let badgeColor = 'bg-slate-100 text-slate-600'; 
        // Add this right under the image badge logic in renderChunks
        if (type === 'audio') badgeColor = 'bg-purple-100 text-purple-700';
        if (type === 'table') badgeColor = 'bg-emerald-100 text-emerald-700';
        if (type === 'image') badgeColor = 'bg-blue-100 text-blue-700';

        // FIX: Grab the correct text variable
        const textData = chunk.text || chunk.content || "";

        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3";
        
        // Added fallback for page number in case TXT/CSV don't have one
        card.innerHTML = `
            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${badgeColor}">${type}</span>
                <span class="text-xs text-slate-400 font-medium">Page ${chunk.metadata.page || 1}</span>
            </div>
            <div class="text-sm text-slate-700 whitespace-pre-wrap flex-1 overflow-hidden overflow-ellipsis break-words max-h-40 overflow-y-auto custom-scrollbar">
                ${textData}
            </div>
            <div class="bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 font-mono overflow-x-auto">
                ${JSON.stringify(chunk.metadata)}
            </div>
        `;
        chunksGrid.appendChild(card);
    });
}

chunkSearch.addEventListener('input', (e) => {
    renderChunks(e.target.value);
});

// --- RESET LOGIC ---
resetBtn.addEventListener('click', async () => {
    if (!confirm("Clear database and ALL chats?")) return;
    
    const origText = resetBtn.textContent;
    resetBtn.textContent = "Wiping...";
    
    try {
        const response = await fetch(`${API_URL}/reset`, { method: 'POST' });
        if (response.ok) {
            chats = []; // Erase frontend memory
            chunksData = []; // Erase chunk memory
            createNewChat(); // Generates new session and resets UI
            renderChunks(); // Clears document grid
        } else { alert("Reset failed on server."); }
    } catch (e) { alert("Backend unreachable."); }
    
    resetBtn.textContent = origText;
});