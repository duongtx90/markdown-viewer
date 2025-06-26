// Theme management
class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Get saved theme or default to light
        this.currentTheme = localStorage.getItem('theme') || 'light';
        
        // Apply theme immediately to prevent flash
        this.applyTheme(this.currentTheme);
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggle());
        } else {
            this.setupToggle();
        }
    }

    setupToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            
            // Update icon based on current theme
            this.updateToggleIcon();
        }
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Handle Prism theme switching for syntax highlighting
        this.switchPrismTheme(theme);
        
        // Save to localStorage
        localStorage.setItem('theme', theme);
    }

    switchPrismTheme(theme) {
        const prismLight = document.getElementById('prism-light');
        const prismDark = document.getElementById('prism-dark');
        
        if (prismLight && prismDark) {
            if (theme === 'dark') {
                prismLight.disabled = true;
                prismDark.disabled = false;
            } else {
                prismLight.disabled = false;
                prismDark.disabled = true;
            }
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.updateToggleIcon();
        
        // Reinitialize Mermaid with new theme if available
        this.updateMermaidTheme(newTheme);
        
        // Add a subtle animation effect
        this.addToggleAnimation();
    }

    updateMermaidTheme(theme) {
        if (typeof mermaid !== 'undefined') {
            const mermaidTheme = theme === 'dark' ? 'dark' : 'default';
            console.log('Applying Mermaid theme:', mermaidTheme, 'for', theme, 'mode');
            
            if (theme === 'dark') {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose',
                    fontFamily: 'inherit'
                });
            } else {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose',
                    fontFamily: 'inherit'
                });
            }
            
            // Re-render existing mermaid diagrams if any
            const mermaidElements = document.querySelectorAll('.mermaid');
            if (mermaidElements.length > 0) {
                console.log('Re-rendering', mermaidElements.length, 'Mermaid diagrams for theme:', theme);
                
                // Clear existing SVG content and restore original text
                mermaidElements.forEach((element, index) => {
                    // Get original content from various possible sources
                    let originalContent = element.getAttribute('data-original-content') || 
                                        element.getAttribute('data-processed') || 
                                        element.textContent;
                    
                    // If the element contains SVG, extract the original from data attribute
                    if (element.querySelector('svg')) {
                        // Store the original content if not already stored
                        if (!element.getAttribute('data-original-content') && element.getAttribute('data-original-text')) {
                            originalContent = element.getAttribute('data-original-text');
                        }
                    }
                    
                    // Store original content and clear the element
                    element.setAttribute('data-original-content', originalContent);
                    element.innerHTML = originalContent;
                    element.classList.remove('mermaid-rendered');
                    element.id = `mermaid-theme-${Date.now()}-${index}`;
                });
                
                // Force a complete re-render with new theme
                setTimeout(() => {
                    if (window.renderMermaidDiagrams) {
                        window.renderMermaidDiagrams();
                    } else {
                        // Fallback: use mermaid.init directly
                        mermaid.init(undefined, mermaidElements);
                    }
                }, 200);
            }
        }
    }

    updateToggleIcon() {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }

    addToggleAnimation() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                themeToggle.style.transform = '';
            }, 300);
        }
    }

    // Method to get current theme (useful for other scripts)
    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} 