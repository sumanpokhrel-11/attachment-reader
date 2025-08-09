// Enhanced Content script for Email Attachment Visualizer
(function() {
    'use strict';
    
    let isExtensionEnabled = true;
    
    // Check if extension is enabled
    chrome.storage.sync.get(['extensionEnabled'], function(result) {
        isExtensionEnabled = result.extensionEnabled !== false;
    });
    
    // Listen for storage changes and messages from popup
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (changes.extensionEnabled) {
            isExtensionEnabled = changes.extensionEnabled.newValue;
            console.log('Extension state changed:', isExtensionEnabled ? 'enabled' : 'disabled');
        }
    });
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'toggleExtension') {
            isExtensionEnabled = request.enabled;
            console.log('Extension toggled via message:', isExtensionEnabled ? 'enabled' : 'disabled');
            
            // Remove all visual indicators if disabled
            if (!isExtensionEnabled) {
                document.querySelectorAll('.av-enhanced').forEach(el => {
                    el.classList.remove('av-enhanced');
                });
                document.querySelectorAll('.av-indicator').forEach(el => {
                    el.remove();
                });
            } else {
                // Re-add indicators if enabled
                setTimeout(addVisualIndicators, 100);
            }
            
            sendResponse({success: true});
        }
        
        if (request.action === 'debugLink') {
            console.log('Debug link:', request.linkUrl);
            sendResponse({success: true});
        }
    });
    
    // Gmail-specific selectors and patterns
    const GMAIL_SELECTORS = {
        attachmentLinks: [
            'span[role="link"][data-tooltip*=".md"]',
            'span[role="link"][data-tooltip*=".json"]',
            'span[role="link"][data-tooltip*=".markdown"]',
            '[data-tooltip-delay][aria-label*=".md"]',
            '[data-tooltip-delay][aria-label*=".json"]',
            '[data-tooltip-delay][aria-label*=".markdown"]',
            'span[role="button"]:has(+ [aria-label*=".md"])',
            'span[role="button"]:has(+ [aria-label*=".json"])',
            '.aZo:has([title*=".md"])',
            '.aZo:has([title*=".json"])',
            'span[title*=".md"]',
            'span[title*=".json"]',
            'span[title*=".markdown"]'
        ],
        downloadButtons: [
            '[data-tooltip="Download"]',
            '[aria-label="Download"]',
            '.T-I.aQy:has([data-tooltip="Download"])',
            'div[role="button"][aria-label*="Download"]'
        ]
    };
    
    // Function to detect if this is a supported attachment - much more precise
    function isSupportedAttachment(element) {
        const supportedExtensions = ['.md', '.json', '.markdown', '.txt'];
        
        // Check various attributes for file extensions
        const checkAttributes = ['title', 'aria-label', 'data-tooltip', 'data-filename'];
        
        // Check text content first
        const textContent = element.textContent || '';
        for (let ext of supportedExtensions) {
            if (textContent.toLowerCase().includes(ext)) {
                return {
                    isSupported: true,
                    filename: extractFilename(textContent),
                    extension: ext
                };
            }
        }
        
        // Check attributes
        for (let attr of checkAttributes) {
            const value = element.getAttribute(attr) || '';
            for (let ext of supportedExtensions) {
                if (value.toLowerCase().includes(ext)) {
                    return {
                        isSupported: true,
                        filename: extractFilename(value),
                        extension: ext
                    };
                }
            }
        }
        
        // Check if this is clearly an attachment element in Gmail
        const isAttachmentElement = (
            element.classList.contains('aZo') ||
            element.closest('.aZo') ||
            element.querySelector('.aZo') ||
            (element.getAttribute('role') === 'button' && textContent.includes('.')) ||
            (element.getAttribute('data-tooltip') === 'Download') ||
            (element.getAttribute('aria-label') === 'Download')
        );
        
        if (isAttachmentElement) {
            // Look in nearby elements for supported file extensions
            const container = element.closest('[data-message-id], .ii, .a3s') || element;
            const containerText = container.textContent || '';
            
            for (let ext of supportedExtensions) {
                if (containerText.toLowerCase().includes(ext)) {
                    return {
                        isSupported: true,
                        filename: extractFilename(containerText),
                        extension: ext
                    };
                }
            }
        }
        
        return { isSupported: false };
    }
    
    // Extract filename from text
    function extractFilename(text) {
        const matches = text.match(/([^\/\\]+\.(md|json|markdown|txt))/i);
        return matches ? matches[1] : 'attachment';
    }
    
    // Enhanced function to get attachment URL from Gmail
    function getAttachmentUrl(element) {
        // Method 1: Look for direct download links
        const downloadButton = element.closest('.aZo')?.querySelector('[href*="view=att"]');
        if (downloadButton) {
            return downloadButton.href;
        }
        
        // Method 2: Construct URL from Gmail patterns
        const attachmentId = extractAttachmentId(element);
        const messageId = extractMessageId();
        
        if (attachmentId && messageId) {
            return `${window.location.origin}/mail/u/0/?ui=2&ik=${getIk()}&view=att&th=${messageId}&attid=${attachmentId}&disp=safe&zw`;
        }
        
        // Method 3: Look in parent elements
        let parent = element.parentElement;
        for (let i = 0; i < 10 && parent; i++) {
            const link = parent.querySelector('a[href*="view=att"], a[href*="attachment"]');
            if (link) return link.href;
            parent = parent.parentElement;
        }
        
        return null;
    }
    
    // Extract attachment ID from Gmail DOM
    function extractAttachmentId(element) {
        // Look for attachment ID in various places
        const patterns = [
            /attid=([^&]+)/,
            /attachid=([^&"']+)/i,
            /"([^"]*att[^"]*id[^"]*)":/i
        ];
        
        let searchElement = element;
        for (let i = 0; i < 5; i++) {
            const html = searchElement.outerHTML;
            for (let pattern of patterns) {
                const match = html.match(pattern);
                if (match) return match[1];
            }
            searchElement = searchElement.parentElement;
            if (!searchElement) break;
        }
        
        return null;
    }
    
    // Extract message ID from URL
    function extractMessageId() {
        const url = window.location.href;
        const patterns = [
            /[#&]inbox\/([^&?]+)/,
            /th=([^&?]+)/,
            /message_id=([^&?]+)/
        ];
        
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }
    
    // Get Gmail ik parameter
    function getIk() {
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
            if (script.textContent.includes('"ik"')) {
                const match = script.textContent.match(/"ik":"([^"]+)"/);
                if (match) return match[1];
            }
        }
        return '';
    }
    
    // Function to fetch and visualize attachment
    async function visualizeAttachment(url, filename = '', extension = '') {
        if (!isExtensionEnabled) return;
        
        const startTime = Date.now();
        showLoadingIndicator();
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || '';
            const content = await response.text();
            
            const loadTime = Date.now() - startTime;
            hideLoadingIndicator();
            
            const fileExtension = extension || 
                                getFileExtension(url, contentType) || 
                                filename.split('.').pop()?.toLowerCase();
            
            if (!['md', 'json', 'markdown', 'txt'].includes(fileExtension)) {
                showError('File type not supported for visualization');
                return;
            }
            
            // Create and show viewer
            createViewer(content, fileExtension, filename || 'attachment');
            
            // Track file view
            if (chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'fileViewed',
                    fileType: fileExtension,
                    fileSize: content.length,
                    loadTime: loadTime
                });
            }
            
        } catch (error) {
            hideLoadingIndicator();
            console.error('Error fetching attachment:', error);
            showError(`Failed to load attachment: ${error.message}`);
        }
    }
    
    // Show loading indicator
    function showLoadingIndicator() {
        const existing = document.getElementById('av-loading');
        if (existing) existing.remove();
        
        const loading = document.createElement('div');
        loading.id = 'av-loading';
        loading.className = 'av-notification av-loading';
        loading.innerHTML = `
            <div class="av-spinner"></div>
            Loading attachment...
        `;
        document.body.appendChild(loading);
    }
    
    // Hide loading indicator
    function hideLoadingIndicator() {
        const loading = document.getElementById('av-loading');
        if (loading) loading.remove();
    }
    
    // Function to get file extension from URL or content-type
    function getFileExtension(url, contentType = '') {
        const urlMatch = url.match(/\.(\w+)(?:\?|$)/);
        if (urlMatch) {
            return urlMatch[1].toLowerCase();
        }
        
        if (contentType.includes('json')) return 'json';
        if (contentType.includes('markdown')) return 'md';
        if (contentType.includes('text')) return 'txt';
        
        return null;
    }
    
    // Enhanced create viewer function
    function createViewer(content, fileType, filename) {
        const existing = document.getElementById('attachment-visualizer-overlay');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'attachment-visualizer-overlay';
        overlay.className = 'av-overlay';
        
        const viewer = document.createElement('div');
        viewer.className = 'av-viewer';
        
        const header = document.createElement('div');
        header.className = 'av-header';
        header.innerHTML = `
            <div class="av-title">
                <span class="av-icon">${getFileIcon(fileType)}</span>
                <span class="av-filename">${filename}</span>
                <span class="av-filetype">.${fileType}</span>
            </div>
            <div class="av-actions">
                <button class="av-btn av-btn-secondary" id="av-copy-btn" title="Copy content">📋</button>
                <button class="av-btn av-btn-secondary" id="av-download-btn" title="Download file">⬇️</button>
                <button class="av-close" id="av-close-btn">✕</button>
            </div>
        `;
        
        const contentArea = document.createElement('div');
        contentArea.className = 'av-content';
        
        if (fileType === 'json') {
            try {
                const jsonData = JSON.parse(content);
                contentArea.innerHTML = `<pre class="av-json">${JSON.stringify(jsonData, null, 2)}</pre>`;
            } catch (e) {
                contentArea.innerHTML = `<pre class="av-text">${escapeHtml(content)}</pre>`;
            }
        } else if (fileType === 'md' || fileType === 'markdown') {
            contentArea.innerHTML = `<div class="av-markdown">${parseMarkdown(content)}</div>`;
        } else {
            contentArea.innerHTML = `<pre class="av-text">${escapeHtml(content)}</pre>`;
        }
        
        viewer.appendChild(header);
        viewer.appendChild(contentArea);
        overlay.appendChild(viewer);
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('av-close-btn').addEventListener('click', closeViewer);
        document.getElementById('av-copy-btn').addEventListener('click', () => copyContent(content));
        document.getElementById('av-download-btn').addEventListener('click', () => downloadFile(content, filename));
        
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeViewer();
        });
        
        document.addEventListener('keydown', handleKeyDown);
    }
    
    // Get appropriate icon for file type
    function getFileIcon(fileType) {
        const icons = {
            'md': '📝',
            'markdown': '📝',
            'json': '🔧',
            'txt': '📄'
        };
        return icons[fileType] || '📄';
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Enhanced markdown parser with better handling of definition lists and inline content
    function parseMarkdown(content) {
        // Normalize line endings and split into lines
        const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const blocks = [];
        let currentBlock = [];
        let inCodeBlock = false;
        let codeBlockDelimiter = '';
        let inTable = false;
        let tableLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Handle code blocks first
            if (trimmedLine.startsWith('```')) {
                if (!inCodeBlock) {
                    // Starting a code block
                    if (currentBlock.length > 0) {
                        blocks.push({ type: 'paragraph', content: currentBlock.join('\n') });
                        currentBlock = [];
                    }
                    if (inTable) {
                        blocks.push({ type: 'table', content: tableLines });
                        tableLines = [];
                        inTable = false;
                    }
                    inCodeBlock = true;
                    codeBlockDelimiter = trimmedLine;
                    currentBlock = [line];
                } else if (trimmedLine === codeBlockDelimiter || trimmedLine === '```') {
                    // Ending a code block
                    currentBlock.push(line);
                    blocks.push({ type: 'codeblock', content: currentBlock.join('\n') });
                    currentBlock = [];
                    inCodeBlock = false;
                    codeBlockDelimiter = '';
                } else {
                    currentBlock.push(line);
                }
                continue;
            }
            
            if (inCodeBlock) {
                currentBlock.push(line);
                continue;
            }
            
            // Check for table rows (lines with multiple pipes - at least 2 pipes for a real table)
            if (trimmedLine.includes('|') && (trimmedLine.match(/\|/g) || []).length >= 2) {
                // Additional check: make sure it's not just a definition with a single pipe
                const pipeCount = (trimmedLine.match(/\|/g) || []).length;
                const colonCount = (trimmedLine.match(/:/g) || []).length;
                
                // If it has multiple pipes OR if it's clearly a table structure, treat as table
                if (pipeCount >= 2 || (pipeCount >= 1 && colonCount === 0 && trimmedLine.indexOf('|') > 0 && trimmedLine.indexOf('|') < trimmedLine.length - 1)) {
                    if (!inTable) {
                        // Starting a new table
                        if (currentBlock.length > 0) {
                            blocks.push({ type: 'paragraph', content: currentBlock.join('\n') });
                            currentBlock = [];
                        }
                        inTable = true;
                        tableLines = [];
                    }
                    tableLines.push(line);
                    continue;
                }
            } else if (inTable && trimmedLine === '') {
                // Empty line might end the table, but let's be lenient
                tableLines.push(line);
                continue;
            } else if (inTable) {
                // Non-table line ends the table
                blocks.push({ type: 'table', content: tableLines });
                tableLines = [];
                inTable = false;
                // Continue processing this line
            }
            
            // Handle headers
            if (trimmedLine.match(/^#{1,6}\s/)) {
                if (currentBlock.length > 0) {
                    blocks.push({ type: 'paragraph', content: currentBlock.join('\n') });
                    currentBlock = [];
                }
                blocks.push({ type: 'header', content: line });
                continue;
            }
            
            // Handle definition lists (like "Label: content")
            if (trimmedLine.match(/^[^:]+:\s*\S/)) {
                if (currentBlock.length > 0) {
                    blocks.push({ type: 'paragraph', content: currentBlock.join('\n') });
                    currentBlock = [];
                }
                blocks.push({ type: 'definition', content: line });
                continue;
            }
            
            // Handle list items
            if (trimmedLine.match(/^[\*\-\+]\s/) || trimmedLine.match(/^\d+\.\s/)) {
                if (currentBlock.length > 0 && !isListContent(currentBlock)) {
                    blocks.push({ type: 'paragraph', content: currentBlock.join('\n') });
                    currentBlock = [];
                }
                currentBlock.push(line);
                continue;
            }
            
            // Handle empty lines (paragraph breaks)
            if (trimmedLine === '') {
                if (currentBlock.length > 0) {
                    // Determine block type
                    if (isListContent(currentBlock)) {
                        blocks.push({ type: 'list', content: currentBlock.join('\n') });
                    } else {
                        blocks.push({ type: 'paragraph', content: currentBlock.join('\n') });
                    }
                    currentBlock = [];
                }
                continue;
            }
            
            // Regular content line
            currentBlock.push(line);
        }
        
        // Handle remaining content
        if (inTable && tableLines.length > 0) {
            blocks.push({ type: 'table', content: tableLines });
        } else if (currentBlock.length > 0) {
            if (isListContent(currentBlock)) {
                blocks.push({ type: 'list', content: currentBlock.join('\n') });
            } else {
                blocks.push({ type: 'paragraph', content: currentBlock.join('\n') });
            }
        }
        
        // Convert blocks to HTML
        const htmlBlocks = blocks.map(block => {
            switch (block.type) {
                case 'header':
                    return formatHeader(block.content);
                case 'codeblock':
                    return formatCodeBlock(block.content);
                case 'table':
                    return formatTable(block.content);
                case 'list':
                    return formatList(block.content);
                case 'definition':
                    return formatDefinition(block.content);
                case 'paragraph':
                default:
                    return formatParagraph(block.content);
            }
        }).filter(html => html.trim() !== '');
        
        return htmlBlocks.join('\n');
    }
    
    // Format definition list items (like "Label: content")
    function formatDefinition(content) {
        const trimmed = content.trim();
        const colonIndex = trimmed.indexOf(':');
        
        if (colonIndex === -1) {
            return `<p>${processInlineFormatting(trimmed)}</p>`;
        }
        
        const label = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        if (!value) {
            // Just the label, no content after colon
            return `<p><strong>${processInlineFormatting(label)}:</strong></p>`;
        }
        
        return `<div class="av-definition">
            <strong class="av-def-label">${processInlineFormatting(label)}:</strong>
            <span class="av-def-value">${processInlineFormatting(value)}</span>
        </div>`;
    }
    
    // Helper function to check if content is list-like
    function isListContent(lines) {
        if (lines.length === 0) return false;
        const firstLine = lines[0].trim();
        return firstLine.match(/^[\*\-\+]\s/) || firstLine.match(/^\d+\.\s/);
    }
    
    // Format header
    function formatHeader(content) {
        const trimmed = content.trim();
        if (trimmed.startsWith('### ')) {
            return `<h3>${processInlineFormatting(trimmed.substring(4))}</h3>`;
        } else if (trimmed.startsWith('## ')) {
            return `<h2>${processInlineFormatting(trimmed.substring(3))}</h2>`;
        } else if (trimmed.startsWith('# ')) {
            return `<h1>${processInlineFormatting(trimmed.substring(2))}</h1>`;
        }
        return `<h3>${processInlineFormatting(trimmed)}</h3>`;
    }
    
    // Format code block
    function formatCodeBlock(content) {
        const lines = content.split('\n');
        const codeContent = lines.slice(1, -1).join('\n'); // Remove first and last ``` lines
        return `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
    }
    
    // Format table
    function formatTable(lines) {
        const tableLines = lines.filter(line => line.trim() && line.includes('|'));
        if (tableLines.length === 0) return '';
        
        const rows = tableLines.map(line => {
            // Split by | but preserve escaped pipes
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
            return cells;
        });
        
        if (rows.length === 0) return '';
        
        // Check if second row is a separator (contains only -, |, :, and spaces)
        let headerRowCount = 1;
        if (rows.length > 1 && rows[1].every(cell => /^[\-\:\|\s]+$/.test(cell))) {
            headerRowCount = 1;
            rows.splice(1, 1); // Remove separator row
        }
        
        let html = '<table class="av-table">';
        
        // Header row(s)
        if (headerRowCount > 0) {
            html += '<thead>';
            for (let i = 0; i < headerRowCount; i++) {
                html += '<tr>';
                rows[i].forEach(cell => {
                    html += `<th>${processInlineFormatting(cell)}</th>`;
                });
                html += '</tr>';
            }
            html += '</thead>';
        }
        
        // Body rows
        if (rows.length > headerRowCount) {
            html += '<tbody>';
            for (let i = headerRowCount; i < rows.length; i++) {
                html += '<tr>';
                rows[i].forEach(cell => {
                    html += `<td>${processInlineFormatting(cell)}</td>`;
                });
                html += '</tr>';
            }
            html += '</tbody>';
        }
        
        html += '</table>';
        return html;
    }
    
    // Format list
    function formatList(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const listItems = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^[\*\-\+]\s/)) {
                const text = trimmed.substring(2);
                return `<li>${processInlineFormatting(text)}</li>`;
            } else if (trimmed.match(/^\d+\.\s/)) {
                const text = trimmed.replace(/^\d+\.\s/, '');
                return `<li>${processInlineFormatting(text)}</li>`;
            }
            return '';
        }).filter(item => item);
        
        if (listItems.length === 0) return '';
        
        // Determine if it's ordered or unordered
        const firstLine = lines[0].trim();
        const isOrdered = firstLine.match(/^\d+\.\s/);
        
        return isOrdered ? 
            `<ol>${listItems.join('')}</ol>` : 
            `<ul>${listItems.join('')}</ul>`;
    }
    
    // Format paragraph
    function formatParagraph(content) {
        const trimmed = content.trim();
        if (!trimmed) return '';
        
        // Split into individual lines and process each
        const lines = trimmed.split('\n').filter(line => line.trim());
        if (lines.length === 0) return '';
        
        // If it's a single line, make it a paragraph
        if (lines.length === 1) {
            return `<p>${processInlineFormatting(lines[0].trim())}</p>`;
        }
        
        // Multiple lines - join with breaks or separate paragraphs
        const processedLines = lines.map(line => processInlineFormatting(line.trim()));
        return `<p>${processedLines.join('<br>')}</p>`;
    }
    
    // Process inline formatting (bold, italic, code, links) - improved
    function processInlineFormatting(text) {
        if (!text) return '';
        
        let html = escapeHtml(text);
        
        // Handle inline code first (to protect it from other formatting)
        const codeBlocks = [];
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(`<code>${code}</code>`);
            return placeholder;
        });
        
        // Bold and italic (order matters!)
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Restore code blocks
        codeBlocks.forEach((code, index) => {
            html = html.replace(`__CODE_BLOCK_${index}__`, code);
        });
        
        return html;
    }
    
    // Copy content to clipboard
    async function copyContent(content) {
        try {
            await navigator.clipboard.writeText(content);
            showNotification('Content copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy content', 'error');
        }
    }
    
    // Download file
    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('File downloaded!', 'success');
    }
    
    // Handle keyboard shortcuts
    function handleKeyDown(e) {
        if (document.getElementById('attachment-visualizer-overlay')) {
            if (e.key === 'Escape') {
                closeViewer();
            } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const content = document.querySelector('.av-content').textContent;
                copyContent(content);
            }
        }
    }
    
    // Close viewer
    function closeViewer() {
        const overlay = document.getElementById('attachment-visualizer-overlay');
        if (overlay) {
            overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `av-notification av-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
    
    // Show error message
    function showError(message) {
        showNotification(message, 'error');
    }
    
    // Enhanced click interceptor for Gmail - MUCH more selective
    function interceptAttachmentClicks() {
        document.addEventListener('click', function(e) {
            if (!isExtensionEnabled) return;
            
            let target = e.target;
            let attempts = 0;
            let foundAttachment = false;
            
            // First, quickly check if this could possibly be an attachment
            // Only proceed if we find clear attachment indicators
            while (target && attempts < 5) {
                // Check for clear attachment indicators
                const hasAttachmentIndicators = (
                    // File extension in text content
                    (target.textContent && /\.(md|json|markdown|txt)(\s|$)/i.test(target.textContent)) ||
                    // File extension in attributes
                    ['title', 'aria-label', 'data-tooltip', 'data-filename'].some(attr => {
                        const value = target.getAttribute(attr) || '';
                        return /\.(md|json|markdown|txt)(\s|$)/i.test(value);
                    }) ||
                    // Gmail attachment classes/selectors
                    target.classList.contains('aZo') ||
                    target.closest('.aZo') ||
                    // Download/attachment related attributes
                    target.getAttribute('data-tooltip') === 'Download' ||
                    target.getAttribute('aria-label') === 'Download' ||
                    // Gmail attachment container
                    target.closest('[data-message-id]')?.querySelector('.aZo')
                );
                
                if (hasAttachmentIndicators) {
                    foundAttachment = true;
                    break;
                }
                
                target = target.parentElement;
                attempts++;
            }
            
            // Only proceed if we found clear attachment indicators
            if (!foundAttachment) {
                return; // Let the click proceed normally
            }
            
            // Now do the detailed attachment check
            target = e.target;
            attempts = 0;
            
            while (target && attempts < 5) {
                const attachmentInfo = isSupportedAttachment(target);
                
                if (attachmentInfo.isSupported) {
                    console.log('Supported attachment detected:', attachmentInfo);
                    
                    // Prevent default action ONLY for confirmed attachments
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const url = getAttachmentUrl(target);
                    console.log('Attachment URL:', url);
                    
                    if (url) {
                        visualizeAttachment(url, attachmentInfo.filename, attachmentInfo.extension.replace('.', ''));
                    } else {
                        showError('Could not find attachment URL. The attachment might be processed differently by Gmail.');
                    }
                    return;
                }
                
                target = target.parentElement;
                attempts++;
            }
            
            // If we get here, it wasn't actually a supported attachment
            // Let the click proceed normally
            
        }, true); // Use capture phase but be much more selective
    }
    
    // Add visual indicators to supported attachments
    function addVisualIndicators() {
        if (!isExtensionEnabled) return;
        
        // Check all potential attachment elements
        GMAIL_SELECTORS.attachmentLinks.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    const attachmentInfo = isSupportedAttachment(element);
                    if (attachmentInfo.isSupported && !element.classList.contains('av-enhanced')) {
                        element.classList.add('av-enhanced');
                        element.title = `✨ Click to visualize with Attachment Visualizer`;
                        
                        // Add visual indicator
                        if (!element.querySelector('.av-indicator')) {
                            const indicator = document.createElement('span');
                            indicator.className = 'av-indicator';
                            indicator.textContent = '👁️';
                            indicator.title = 'Visualizable with Attachment Visualizer';
                            element.appendChild(indicator);
                        }
                    }
                });
            } catch (e) {
                // Selector might not be valid in all contexts
                console.debug('Invalid selector:', selector, e);
            }
        });
    }
    
    // Initialize the extension
    function init() {
        console.log('Email Attachment Visualizer: Initializing...');
        
        interceptAttachmentClicks();
        addVisualIndicators();
        
        // Re-run indicators when DOM changes
        const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                setTimeout(addVisualIndicators, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('Email Attachment Visualizer: Ready!');
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Also reinitialize when navigating in Gmail SPA
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            setTimeout(init, 1000);
        }
    }, 1000);
    
})();