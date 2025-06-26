// DOM elements
const documentForm = document.getElementById('documentForm');
const contentTextarea = document.getElementById('content');
const customIdInput = document.getElementById('customId');
const passwordInput = document.getElementById('password');
const expirationSelect = document.getElementById('expiration');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');

// Utility functions for session storage operations
function setSessionStorageData(key, value) {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error('Failed to set session storage:', error);
        return false;
    }
}

function getSessionStorageData(key) {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        console.error('Failed to get session storage:', error);
        return null;
    }
}

function removeSessionStorageData(key) {
    try {
        sessionStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to remove session storage:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're editing an existing document (fork functionality)
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const content = urlParams.get('content');
    
    // Check for fork content in session storage first (new method)
    const forkContent = getSessionStorageData('forkContent');
    const isFork = getSessionStorageData('isFork') === 'true';
    
    if (isFork && forkContent) {
        // Pre-fill textarea with content from session storage (for forking)
        contentTextarea.value = forkContent;
        // Clear session storage after use
        removeSessionStorageData('forkContent');
        removeSessionStorageData('isFork');
        autoResizeTextarea();
    } else if (content) {
        // Pre-fill textarea with content from URL (for backward compatibility)
        contentTextarea.value = decodeURIComponent(content);
        autoResizeTextarea();
    } else if (editId) {
        // Load existing document for editing
        loadDocumentForEdit(editId);
    }
    
    // Auto-resize textarea
    autoResizeTextarea();
    contentTextarea.addEventListener('input', autoResizeTextarea);
    
    // Focus on content textarea
    contentTextarea.focus();
});

// Auto-resize textarea based on content
function autoResizeTextarea() {
    contentTextarea.style.height = 'auto';
    contentTextarea.style.height = Math.max(400, contentTextarea.scrollHeight) + 'px';
}

// Load document for editing
async function loadDocumentForEdit(id) {
    try {
        const response = await fetch(`/api/documents/${id}`);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                const password = prompt('This document is password protected. Please enter the password:');
                if (password) {
                    const retryResponse = await fetch(`/api/documents/${id}?password=${encodeURIComponent(password)}`);
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        contentTextarea.value = data.content;
                        autoResizeTextarea();
                        return;
                    }
                }
            }
            throw new Error('Failed to load document');
        }
        
        const data = await response.json();
        contentTextarea.value = data.content;
        autoResizeTextarea();
        
    } catch (error) {
        console.error('Error loading document:', error);
        alert('Failed to load document for editing.');
    }
}

// Handle form submission
documentForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const content = contentTextarea.value.trim();
    const customId = customIdInput.value.trim();
    const password = passwordInput.value.trim();
    const expiration = expirationSelect.value;
    
    // Validate content
    if (!content) {
        alert('Please enter some content before saving.');
        contentTextarea.focus();
        return;
    }
    
    // Validate custom ID format if provided
    if (customId && !/^[a-zA-Z0-9\-_]+$/.test(customId)) {
        alert('Custom ID can only contain letters, numbers, hyphens, and underscores.');
        customIdInput.focus();
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                customId: customId || undefined,
                password: password || undefined,
                expiration
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            
            // Handle specific conflict error for existing ID
            if (response.status === 409) {
                alert(`The ID "${customId}" is already taken by an active document. Please choose a different ID or leave it empty to auto-generate.`);
                customIdInput.focus();
                setLoadingState(false);
                return;
            }
            
            throw new Error(errorData.error || 'Failed to save document');
        }
        
        const data = await response.json();
        
        // Redirect to view page using new /v/:document-id format
        window.location.href = `/v/${data.id}`;
        
    } catch (error) {
        console.error('Error saving document:', error);
        alert(`Failed to save document: ${error.message}`);
        setLoadingState(false);
    }
});

// Handle clear button
clearBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all content?')) {
        contentTextarea.value = '';
        customIdInput.value = '';
        passwordInput.value = '';
        expirationSelect.value = '1d';
        contentTextarea.focus();
        autoResizeTextarea();
    }
});

// Set loading state
function setLoadingState(loading) {
    if (loading) {
        saveBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
    } else {
        saveBtn.disabled = false;
        btnText.style.display = 'inline-flex';
        btnLoading.style.display = 'none';
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saveBtn.disabled) {
            documentForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Ctrl/Cmd + Shift + N to clear
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        clearBtn.click();
    }
});

// Auto-save to localStorage (draft functionality)
let autoSaveTimer;
contentTextarea.addEventListener('input', function() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        const content = contentTextarea.value.trim();
        if (content) {
            localStorage.setItem('markdown-pastebin-draft', content);
        } else {
            localStorage.removeItem('markdown-pastebin-draft');
        }
    }, 1000);
});

// Load draft on page load if no other content is present
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlContent = urlParams.get('content') || urlParams.get('edit');
    const hasForkContent = getSessionStorageData('forkContent') && getSessionStorageData('isFork') === 'true';
    
    // Don't load draft if we have fork content, URL content, or are editing
    if (!hasForkContent && !hasUrlContent && !contentTextarea.value) {
        const draft = localStorage.getItem('markdown-pastebin-draft');
        if (draft) {
            const loadDraft = confirm('Found an unsaved draft. Would you like to restore it?');
            if (loadDraft) {
                contentTextarea.value = draft;
                autoResizeTextarea();
            } else {
                localStorage.removeItem('markdown-pastebin-draft');
            }
        }
    }
});

// Clear draft when document is successfully saved
window.addEventListener('beforeunload', function() {
    // Only clear draft if we're navigating to a view page (successful save)
    if (window.location.href.includes('/view.html') || window.location.pathname.startsWith('/v/')) {
        localStorage.removeItem('markdown-pastebin-draft');
    }
}); 