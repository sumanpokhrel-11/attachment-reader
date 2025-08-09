// Background script for Email Attachment Visualizer

// Initialize extension settings
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings
        chrome.storage.sync.set({
            extensionEnabled: true,
            filesViewedToday: 0,
            totalFilesViewed: 0,
            lastResetDate: new Date().toDateString()
        });
        
        // Show welcome notification
        chrome.action.setBadgeText({ text: 'NEW' });
        chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
        
        // Clear badge after 24 hours
        setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
        }, 24 * 60 * 60 * 1000);
    }
});

// Handle daily reset of file counter
function resetDailyCounter() {
    const today = new Date().toDateString();
    
    chrome.storage.sync.get(['lastResetDate'], (result) => {
        if (result.lastResetDate !== today) {
            chrome.storage.sync.set({
                filesViewedToday: 0,
                lastResetDate: today
            });
        }
    });
}

// Check and reset counter every hour
setInterval(resetDailyCounter, 60 * 60 * 1000);

// Reset counter on startup
resetDailyCounter();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fileViewed') {
        // Increment counters when a file is viewed
        chrome.storage.sync.get(['filesViewedToday', 'totalFilesViewed'], (result) => {
            const newDailyCount = (result.filesViewedToday || 0) + 1;
            const newTotalCount = (result.totalFilesViewed || 0) + 1;
            
            chrome.storage.sync.set({
                filesViewedToday: newDailyCount,
                totalFilesViewed: newTotalCount
            });
            
            // Update badge with daily count
            if (newDailyCount > 0) {
                chrome.action.setBadgeText({ 
                    text: newDailyCount.toString(),
                    tabId: sender.tab.id 
                });
                chrome.action.setBadgeBackgroundColor({ 
                    color: '#34a853',
                    tabId: sender.tab.id 
                });
            }
        });
        
        sendResponse({ success: true });
    }
    
    if (request.action === 'getStats') {
        chrome.storage.sync.get(['filesViewedToday', 'totalFilesViewed'], (result) => {
            sendResponse({
                daily: result.filesViewedToday || 0,
                total: result.totalFilesViewed || 0
            });
        });
        return true; // Keep message channel open for async response
    }
});

// Update badge when extension is enabled/disabled
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.extensionEnabled) {
        if (!changes.extensionEnabled.newValue) {
            // Extension disabled - clear badge
            chrome.action.setBadgeText({ text: '' });
        } else {
            // Extension enabled - restore daily count
            chrome.storage.sync.get(['filesViewedToday'], (result) => {
                const count = result.filesViewedToday || 0;
                if (count > 0) {
                    chrome.action.setBadgeText({ text: count.toString() });
                    chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
                }
            });
        }
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will open the popup automatically in Manifest V3
    // But we can add additional logic here if needed
    console.log('Extension icon clicked on tab:', tab.url);
});

// Context menu for debugging (optional)
if (chrome.contextMenus) {
    chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
            id: 'debugAttachmentVisualizer',
            title: 'Debug Attachment Visualizer',
            contexts: ['link'],
            visible: false // Hidden by default, can be enabled for debugging
        });
    });
    
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'debugAttachmentVisualizer') {
            console.log('Debug context menu clicked:', info);
            // Send debug message to content script
            chrome.tabs.sendMessage(tab.id, {
                action: 'debugLink',
                linkUrl: info.linkUrl
            });
        }
    });
}

// Performance monitoring
const performanceMonitor = {
    startTime: Date.now(),
    
    logMetric: function(metric, value) {
        console.log(`[Attachment Visualizer] ${metric}:`, value);
    },
    
    trackFileLoad: function(fileSize, loadTime) {
        this.logMetric('File Load Time', `${loadTime}ms for ${fileSize} bytes`);
        
        // Store performance data
        chrome.storage.local.get(['performanceData'], (result) => {
            const data = result.performanceData || [];
            data.push({
                timestamp: Date.now(),
                fileSize: fileSize,
                loadTime: loadTime
            });
            
            // Keep only last 100 entries
            if (data.length > 100) {
                data.splice(0, data.length - 100);
            }
            
            chrome.storage.local.set({ performanceData: data });
        });
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { performanceMonitor };
}