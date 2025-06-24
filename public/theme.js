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
            mermaid.initialize({
                startOnLoad: false,
                theme: mermaidTheme,
                securityLevel: 'loose',
                fontFamily: 'inherit'
            });
            
            // Re-render existing mermaid diagrams if any
            const mermaidElements = document.querySelectorAll('.mermaid');
            if (mermaidElements.length > 0) {
                // Store original content and re-render
                mermaidElements.forEach((element, index) => {
                    const originalContent = element.getAttribute('data-original-content') || element.textContent;
                    element.setAttribute('data-original-content', originalContent);
                    element.innerHTML = originalContent;
                    element.id = `mermaid-${Date.now()}-${index}`;
                });
                
                // Trigger re-rendering
                setTimeout(() => {
                    if (window.renderMermaidDiagrams) {
                        window.renderMermaidDiagrams();
                    }
                }, 100);
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