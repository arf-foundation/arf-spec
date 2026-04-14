// Auto-switch Mermaid theme based on MkDocs Material palette
(function() {
    function setMermaidTheme() {
        const isDark = document.body.getAttribute('data-md-color-scheme') === 'slate';
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
            mermaid.run();
        }
    }
    // Observe theme changes
    const observer = new MutationObserver(setMermaidTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
    // Initial call
    setMermaidTheme();
})();
