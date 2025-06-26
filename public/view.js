// DOM elements
const loading = document.getElementById('loading');
const passwordPrompt = document.getElementById('passwordPrompt');
const passwordForm = document.getElementById('passwordForm');
const documentPasswordInput = document.getElementById('documentPassword');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const documentContainer = document.getElementById('documentContainer');
const contentDiv = document.getElementById('content');
const createdAtSpan = document.getElementById('createdAt');
const expiresAtSpan = document.getElementById('expiresAt');
const forkBtn = document.getElementById('forkBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const shareBtn = document.getElementById('shareBtn');

// TOC and floating button elements
const tocSidebar = document.getElementById('tocSidebar');
const tocContent = document.getElementById('tocContent');
const tocCloseBtn = document.getElementById('tocCloseBtn');
const fullWidthToggleBtn = document.getElementById('fullWidthToggleBtn');
const tocBackdrop = document.getElementById('tocBackdrop');
const mainContainer = document.getElementById('mainContainer');
const tocButtonTop = document.getElementById('tocButtonTop');
const tocToggleTopLeft = document.getElementById('tocToggleTopLeft');

// State
let currentDocumentId = null;
let currentDocumentContent = null;
let isTocOpen = false;
let isFullWidth = false;

// Utility function for session storage operations
function setSessionStorageData(key, value) {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error('Failed to set session storage:', error);
        // Fallback to URL parameter for browsers with session storage disabled
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

// Extract document ID from URL - supports both /v/:document-id and ?id=document-id formats
function getDocumentIdFromUrl() {
    // First, try to get from path for /v/:document-id format
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'v') {
        return pathParts[2]; // Extract document-id from /v/:document-id
    }
    
    // Fallback to query parameter for ?id=document-id format
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    // Get document ID from URL - supports both /v/:document-id and ?id=document-id formats
    currentDocumentId = getDocumentIdFromUrl();

    if (!currentDocumentId) {
        showError('No document ID provided');
        return;
    }

    // Configure marked for Mermaid support
    marked.setOptions({
        highlight: function (code, lang) {
            // Handle Mermaid diagrams - prevent syntax highlighting
            if (lang === 'mermaid') {
                return `<div class="mermaid">${code}</div>`;
            }
            return code;
        },
        breaks: true,
        gfm: true
    });

    // Initialize Mermaid with configuration for version 10.9.3
    if (typeof mermaid !== 'undefined') {
        // Get current theme for Mermaid
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const mermaidTheme = currentTheme === 'dark' ? 'dark' : 'default';
        
        mermaid.initialize({
            startOnLoad: false, // We'll manually trigger rendering
            theme: mermaidTheme,
            securityLevel: 'loose',
            fontFamily: 'inherit'
        });
        console.log(`Mermaid 10.9.3 initialized successfully with ${mermaidTheme} theme`);
    } else {
        console.error('Mermaid not available');
    }

    // Configure Prism to ignore mermaid code blocks
    if (window.Prism) {
        Prism.plugins.autoloader = Prism.plugins.autoloader || {};
        // Prevent Prism from auto-loading mermaid language
        if (Prism.plugins.autoloader.languages_path) {
            Prism.plugins.autoloader.ignore_list = Prism.plugins.autoloader.ignore_list || [];
            if (!Prism.plugins.autoloader.ignore_list.includes('mermaid')) {
                Prism.plugins.autoloader.ignore_list.push('mermaid');
            }
        }
    }

    // Load the document
    loadDocument();
});

// Load document
async function loadDocument(password = null) {
    showLoading();

    try {
        let url = `/api/documents/${currentDocumentId}`;
        if (password) {
            url += `?password=${encodeURIComponent(password)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();

            if (response.status === 401 || response.status === 403) {
                if (errorData.passwordRequired) {
                    showPasswordPrompt();
                    return;
                }
            }

            if (response.status === 404) {
                showError('Document not found. It may have been deleted or never existed.');
                return;
            }

            if (response.status === 410) {
                showError('This document has expired and is no longer available.');
                return;
            }

            throw new Error(errorData.error || 'Failed to load document');
        }

        const data = await response.json();
        currentDocumentContent = data.content;

        // Render the document
        await renderDocument(data);

    } catch (error) {
        console.error('Error loading document:', error);
        showError(`Failed to load document: ${error.message}`);
    }
}

// Render document
async function renderDocument(data) {
    // Parse and sanitize markdown
    const rawHtml = marked.parse(data.content);

    // Configure DOMPurify to allow Mermaid elements
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['pre'],
        ADD_ATTR: ['class', 'data-original-content', 'id']
    });

    // Set content
    contentDiv.innerHTML = sanitizedHtml;

    // Wait for DOM to be ready and Mermaid to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if Mermaid is available and render diagrams
    if (typeof mermaid !== 'undefined') {
        console.log('Mermaid v10.9.3 is available, proceeding with rendering...');
        await renderMermaidDiagrams();
    } else {
        console.error('Mermaid library not loaded');
        // Show fallback for all potential mermaid elements
        const potentialMermaid = contentDiv.querySelectorAll('div.mermaid, pre.language-mermaid, code.language-mermaid');
        potentialMermaid.forEach(element => {
            handleSingleMermaidFailure(element, element.textContent);
        });
    }

    // Apply syntax highlighting
    if (window.Prism) {
        Prism.highlightAllUnder(contentDiv);
    }

    // Set metadata
    if (data.createdAt) {
        const createdDate = new Date(data.createdAt);
        createdAtSpan.textContent = `Created: ${formatDate(createdDate)}`;
    }

    if (data.expiresAt) {
        const expiresDate = new Date(data.expiresAt);
        expiresAtSpan.textContent = `Expires: ${formatDate(expiresDate)}`;
    }

    // Show action buttons
    forkBtn.style.display = 'inline-flex';
    copyLinkBtn.style.display = 'inline-flex';
    shareBtn.style.display = 'inline-flex';

    // Generate table of contents
    generateTableOfContents();

    // Show document container
    showDocument();
}

// Render Mermaid diagrams using v10.9.3 API
async function renderMermaidDiagrams() {
    // Make this function globally available for theme switching
    window.renderMermaidDiagrams = renderMermaidDiagrams;
    // Look for both div.mermaid (from marked) and any mermaid code blocks that might have been processed by Prism
    let mermaidElements = contentDiv.querySelectorAll('div.mermaid');

    // Also check for mermaid code blocks that might have been syntax highlighted
    const codeElements = contentDiv.querySelectorAll('pre.language-mermaid, code.language-mermaid');
    codeElements.forEach(element => {
        // Convert syntax-highlighted mermaid code back to proper mermaid div
        const diagramCode = element.textContent.trim();
        const diagramDiv = document.createElement('div');
        diagramDiv.className = 'mermaid';
        diagramDiv.textContent = diagramCode;

        // Find the outermost parent (pre element) and replace it
        let parentToReplace = element;
        while (parentToReplace.parentNode && parentToReplace.parentNode !== contentDiv) {
            if (parentToReplace.tagName === 'PRE') break;
            parentToReplace = parentToReplace.parentNode;
        }
        parentToReplace.parentNode.replaceChild(diagramDiv, parentToReplace);
    });

    // Re-query after potential replacements
    mermaidElements = contentDiv.querySelectorAll('div.mermaid');

    if (mermaidElements.length === 0) {
        console.log('No Mermaid diagrams found');
        return;
    }

    console.log(`Found ${mermaidElements.length} Mermaid diagrams to render`);

    // Prepare diagrams for processing
    const diagramsToProcess = [];

    mermaidElements.forEach((element, index) => {
        try {
            const diagramCode = element.textContent.trim();
            console.log(`Preparing diagram ${index + 1}:`, diagramCode.substring(0, 50) + '...');

            // Store original content for theme switching
            if (!element.getAttribute('data-original-content')) {
                element.setAttribute('data-original-content', diagramCode);
            }

            // Add unique ID if not already present
            if (!element.id) {
                element.id = `mermaid-${Date.now()}-${index}`;
            }

            diagramsToProcess.push(element);

        } catch (error) {
            console.error(`Error preparing diagram ${index + 1}:`, error);
            handleSingleMermaidFailure(element, element.textContent);
        }
    });

        if (diagramsToProcess.length > 0) {
        console.log('Triggering Mermaid v10.9.3 to process', diagramsToProcess.length, 'diagrams...');
        
        try {
            // Use the mermaid.init() API for v10.9.3
            mermaid.init(undefined, diagramsToProcess);
            
            console.log('Mermaid successfully processed all diagrams');
            
            // Check if diagrams were rendered after a delay
            setTimeout(() => {
                diagramsToProcess.forEach((diagram, index) => {
                    if (diagram.querySelector('svg')) {
                        console.log(`Diagram ${index + 1} rendered successfully`);
                        diagram.classList.add('mermaid-rendered');
                    } else {
                        console.warn(`Diagram ${index + 1} failed to render, showing fallback`);
                        const originalContent = diagram.textContent;
                        handleSingleMermaidFailure(diagram, originalContent);
                    }
                });
            }, 1000);
            
        } catch (error) {
            console.error('Mermaid rendering failed:', error);
            
            // Fallback: try to handle each diagram individually
            diagramsToProcess.forEach((diagram, index) => {
                const originalContent = diagram.textContent;
                handleSingleMermaidFailure(diagram, originalContent);
            });
        }
    }
}

// Handle individual Mermaid rendering failures
function handleSingleMermaidFailure(element, originalContent) {
    element.innerHTML = `
        <div class="mermaid-error">
            <p><strong>⚠️ Mermaid Diagram Error</strong></p>
            <p>Could not render the diagram. Raw code:</p>
           <code>${originalContent}</code>
        </div>
    `;
    element.classList.add('mermaid-error');
}

// Format date
function formatDate(date) {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMs < 0) {
        // Past date
        const absDiffDays = Math.abs(diffDays);
        const absDiffHours = Math.abs(diffHours);
        const absDiffMinutes = Math.abs(diffMinutes);

        if (absDiffDays > 0) {
            return `${absDiffDays} day${absDiffDays > 1 ? 's' : ''} ago`;
        } else if (absDiffHours > 0) {
            return `${absDiffHours} hour${absDiffHours > 1 ? 's' : ''} ago`;
        } else if (absDiffMinutes > 0) {
            return `${absDiffMinutes} minute${absDiffMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    } else {
        // Future date
        if (diffDays > 0) {
            return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else if (diffMinutes > 0) {
            return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
        } else {
            return 'Soon';
        }
    }
}

// Handle password form submission
passwordForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const password = documentPasswordInput.value.trim();

    if (!password) {
        documentPasswordInput.focus();
        return;
    }

    loadDocument(password);
});

// Handle fork button
// Solution for 414 Request-URI Too Large error:
// Instead of passing large content via URL parameters (which can exceed 8KB limit),
// we now use browser session storage as the primary method for forking documents.
// This allows forking of documents of any size without URL length limitations.
// 
// Fallback mechanism:
// If session storage is not available (disabled/unsupported), we fall back to 
// URL parameters with intelligent content truncation to prevent 414 errors.
forkBtn.addEventListener('click', function () {
    if (currentDocumentContent) {
        // Try to store content in session storage first
        const sessionSuccess = setSessionStorageData('forkContent', currentDocumentContent);
        
        if (sessionSuccess) {
            // Session storage worked, use the new method
            setSessionStorageData('isFork', 'true');
            window.location.href = '/';
        } else {
            // Session storage failed, use URL parameter with truncation to prevent 414 error
            console.warn('Session storage not available, falling back to URL parameter');
            const maxUrlLength = 8000; // Conservative limit to prevent 414 errors
            const baseUrl = '/?content=';
            const availableLength = maxUrlLength - baseUrl.length - 100; // Buffer for encoding
            
            let contentToEncode = currentDocumentContent;
            if (encodeURIComponent(contentToEncode).length > availableLength) {
                // Truncate content and add notice
                const maxContentLength = Math.floor(availableLength / 3); // Conservative estimate for encoding
                contentToEncode = currentDocumentContent.substring(0, maxContentLength) + 
                    '\n\n<!-- Content was truncated to prevent URL length limit. Please use a browser with session storage support for full content forking. -->';
            }
            
            const encodedContent = encodeURIComponent(contentToEncode);
            window.location.href = `/?content=${encodedContent}`;
        }
    }
});

// Handle copy link button
copyLinkBtn.addEventListener('click', async function () {
    try {
        await navigator.clipboard.writeText(window.location.href);
        
        // Visual feedback
        const originalText = copyLinkBtn.innerHTML;
        copyLinkBtn.innerHTML = '✅ Copied!';
        copyLinkBtn.disabled = true;
        
        setTimeout(() => {
            copyLinkBtn.innerHTML = originalText;
            copyLinkBtn.disabled = false;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy link:', error);
        
        // Fallback: select the URL in a temporary input
        const tempInput = document.createElement('input');
        tempInput.value = window.location.href;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        // Visual feedback
        const originalText = copyLinkBtn.innerHTML;
        copyLinkBtn.innerHTML = '✅ Copied!';
        copyLinkBtn.disabled = true;
        
        setTimeout(() => {
            copyLinkBtn.innerHTML = originalText;
            copyLinkBtn.disabled = false;
        }, 2000);
    }
});

// Handle share button
shareBtn.addEventListener('click', async function () {
    const shareData = {
        title: 'Markdown Document - Markdown Viewer',
        text: 'Check out this document on Markdown Viewer',
        url: window.location.href
    };

    try {
        // Use Web Share API if available
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(window.location.href);
            
            // Visual feedback
            const originalText = shareBtn.innerHTML;
            shareBtn.innerHTML = '✅ Link copied!';
            shareBtn.disabled = true;
            
            setTimeout(() => {
                shareBtn.innerHTML = originalText;
                shareBtn.disabled = false;
            }, 2000);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Share failed:', error);
            
            // Fallback: try copying to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '✅ Link copied!';
                shareBtn.disabled = true;
                
                setTimeout(() => {
                    shareBtn.innerHTML = originalText;
                    shareBtn.disabled = false;
                }, 2000);
            } catch (clipboardError) {
                // Last resort fallback
                const tempInput = document.createElement('input');
                tempInput.value = window.location.href;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '✅ Link copied!';
                shareBtn.disabled = true;
                
                setTimeout(() => {
                    shareBtn.innerHTML = originalText;
                    shareBtn.disabled = false;
                }, 2000);
            }
        }
    }
});

// Show/hide states
function showLoading() {
    loading.style.display = 'block';
    passwordPrompt.style.display = 'none';
    error.style.display = 'none';
    documentContainer.style.display = 'none';
}

function showPasswordPrompt() {
    loading.style.display = 'none';
    passwordPrompt.style.display = 'block';
    error.style.display = 'none';
    documentContainer.style.display = 'none';
    documentPasswordInput.focus();
}

function showError(message) {
    loading.style.display = 'none';
    passwordPrompt.style.display = 'none';
    error.style.display = 'block';
    documentContainer.style.display = 'none';
    errorMessage.textContent = message;
}

function showDocument() {
    loading.style.display = 'none';
    passwordPrompt.style.display = 'none';
    error.style.display = 'none';
    documentContainer.style.display = 'block';
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // Escape to go back to main page or close TOC
    if (e.key === 'Escape') {
        if (isTocOpen) {
            closeToc();
        } else {
            window.location.href = '/';
        }
    }

    // F to fork document
    if (e.key === 'f' && currentDocumentContent) {
        forkBtn.click();
    }

    // C to copy link
    if (e.key === 'c' && currentDocumentContent && !e.ctrlKey && !e.metaKey) {
        copyLinkBtn.click();
    }

    // S to share document
    if (e.key === 's' && currentDocumentContent && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); // Prevent browser save dialog
        shareBtn.click();
    }

    // T to toggle table of contents
    if (e.key === 't' && currentDocumentContent && !e.ctrlKey && !e.metaKey) {
        toggleToc();
    }

    // W to toggle full width
    if (e.key === 'w' && currentDocumentContent && !e.ctrlKey && !e.metaKey) {
        toggleFullWidth();
    }
});

// Table of Contents functions
function generateTableOfContents() {
    const headings = contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length === 0) {
        tocContent.innerHTML = '<p class="toc-empty">No headings found</p>';
        tocButtonTop.style.display = 'none';
        return;
    }
    
    // Show the TOC buttons
    tocButtonTop.style.display = 'inline-flex';
    tocToggleTopLeft.style.display = 'flex';

    let tocHtml = '';
    headings.forEach((heading, index) => {
        const headingText = heading.textContent.trim();
        const headingLevel = heading.tagName.toLowerCase();
        const headingId = `heading-${index}`;
        
        // Add ID to heading for navigation
        heading.id = headingId;
        
        // Create TOC item
        tocHtml += `<div class="toc-item ${headingLevel}" data-target="${headingId}">${headingText}</div>`;
    });
    
    tocContent.innerHTML = tocHtml;
    
    // Add click listeners to TOC items
    const tocItems = tocContent.querySelectorAll('.toc-item');
    tocItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Remove active class from all items
                tocItems.forEach(tocItem => tocItem.classList.remove('active'));
                // Add active class to clicked item
                this.classList.add('active');
                
                // Smooth scroll to target
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close TOC on mobile after navigation
                if (window.innerWidth <= 768) {
                    closeToc();
                }
            }
        });
    });
    
    // Set up scroll spy for active heading highlighting
    setupScrollSpy();
}

function setupScrollSpy() {
    const headings = contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const tocItems = tocContent.querySelectorAll('.toc-item');
    
    if (headings.length === 0 || tocItems.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const headingId = entry.target.id;
                const correspondingTocItem = tocContent.querySelector(`[data-target="${headingId}"]`);
                
                if (correspondingTocItem) {
                    // Remove active class from all items
                    tocItems.forEach(item => item.classList.remove('active'));
                    // Add active class to current item
                    correspondingTocItem.classList.add('active');
                }
            }
        });
    }, {
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0
    });
    
    headings.forEach(heading => {
        observer.observe(heading);
    });
}

function toggleToc() {
    if (isTocOpen) {
        closeToc();
    } else {
        openToc();
    }
}

function openToc() {
    isTocOpen = true;
    tocSidebar.classList.add('open');
    document.body.classList.add('toc-open');
    tocToggleTopLeft.style.display = 'none'; // Hide hamburger button when TOC is open
    
    // Show backdrop on mobile
    if (window.innerWidth <= 768) {
        tocBackdrop.classList.add('show');
    }
}

function closeToc() {
    isTocOpen = false;
    tocSidebar.classList.remove('open');
    document.body.classList.remove('toc-open');
    tocToggleTopLeft.style.display = 'flex'; // Show hamburger button when TOC is closed
    tocBackdrop.classList.remove('show');
}

function toggleFullWidth() {
    if (isFullWidth) {
        exitFullWidth();
    } else {
        enterFullWidth();
    }
}

function enterFullWidth() {
    isFullWidth = true;
    document.body.classList.add('full-width');
    fullWidthToggleBtn.textContent = '↕️';
    fullWidthToggleBtn.title = 'Exit Full Width';
}

function exitFullWidth() {
    isFullWidth = false;
    document.body.classList.remove('full-width');
    fullWidthToggleBtn.textContent = '↔️';
    fullWidthToggleBtn.title = 'Toggle Full Width';
}

// Event listeners for floating buttons and TOC
fullWidthToggleBtn.addEventListener('click', toggleFullWidth);
tocCloseBtn.addEventListener('click', closeToc);
tocBackdrop.addEventListener('click', closeToc);
tocButtonTop.addEventListener('click', toggleToc);
tocToggleTopLeft.addEventListener('click', toggleToc);

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && isTocOpen) {
        tocBackdrop.classList.remove('show');
    } else if (window.innerWidth <= 768 && isTocOpen) {
        tocBackdrop.classList.add('show');
    }
});

// Debug function to manually refresh Mermaid diagrams
window.refreshMermaidDiagrams = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    console.log('Manually refreshing Mermaid diagrams for theme:', currentTheme);
    
    // Clear all rendered diagrams
    const mermaidElements = document.querySelectorAll('.mermaid');
    mermaidElements.forEach((element, index) => {
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
            element.innerHTML = originalContent;
            element.removeAttribute('data-processed');
            element.id = `mermaid-manual-${Date.now()}-${index}`;
        }
    });
    
    // Re-initialize Mermaid with current theme
    if (typeof mermaid !== 'undefined') {
        const mermaidTheme = currentTheme === 'dark' ? 'dark' : 'default';
        mermaid.initialize({
            startOnLoad: false,
            theme: "forest",
            securityLevel: 'loose',
            fontFamily: 'inherit'
        });
        
        // Re-render all diagrams
        setTimeout(() => {
            mermaid.init(undefined, mermaidElements);
        }, 100);
    }
};