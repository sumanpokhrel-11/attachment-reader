# Email Attachment Visualizer Extension

A browser extension that allows you to instantly visualize markdown (.md) and JSON (.json) attachments directly in your email client without downloading them.

## 🚀 Features

- **Instant Visualization**: Click on .md or .json attachments to view them in a beautiful, formatted overlay
- **Multiple Format Support**: Handles .md, .markdown, .json, and .txt files
- **Email Client Support**: Works with Gmail, Outlook, and other major email providers
- **Beautiful UI**: Clean, modern interface with syntax highlighting
- **Dark Mode**: Automatic dark mode support based on system preferences
- **Secure**: All processing happens locally in your browser
- **Keyboard Shortcuts**: Press ESC to close the viewer
- **Mobile Responsive**: Works on desktop and mobile browsers

## 📋 Supported File Types

- **Markdown**: `.md`, `.markdown`
- **JSON**: `.json`
- **Text**: `.txt`

## 🛠 Installation

### Method 1: Chrome Web Store (Recommended)
*Coming soon - this extension will be available on the Chrome Web Store*

### Method 2: Manual Installation (Developer Mode)

1. **Download the Extension Files**
   - Download all the files from this project
   - Create a folder called `email-attachment-visualizer`
   - Place all files in this folder

2. **Required Files Structure**
   ```
   email-attachment-visualizer/
   ├── manifest.json
   ├── content.js
   ├── styles.css
   ├── popup.html
   ├── icons/
   │   ├── icon16.png
   │   ├── icon48.png
   │   └── icon128.png
   └── README.md
   ```

3. **Create Icon Files**
   Create simple icon files or download free icons:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels) 
   - `icon128.png` (128x128 pixels)

4. **Install in Chrome/Edge**
   - Open Chrome/Edge and go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `email-attachment-visualizer` folder
   - The extension should now appear in your extensions list

5. **Install in Firefox**
   - Open Firefox and go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file
   - The extension will be loaded temporarily

## 🎯 Usage

1. **Enable the Extension**
   - Click the extension icon in your browser toolbar
   - Make sure the toggle is set to "Enabled"

2. **View Attachments**
   - Open any email with .md or .json attachments
   - Click on the attachment link
   - The file will open in a beautiful overlay viewer instead of downloading

3. **Navigation**
   - Click the X button or press ESC to close the viewer
   - Click outside the viewer to close it
   - Scroll to view long files

## ⚙️ Configuration

Click the extension icon to access:
- **Enable/Disable Toggle**: Turn the extension on/off
- **Statistics**: See how many files you've visualized
- **Status**: Check if the extension is working properly

## 🔧 Technical Details

### How It Works
1. The content script monitors clicks on links in email clients
2. When an attachment link is clicked, it intercepts the request
3. Fetches the file content using the browser's fetch API
4. Renders the content in a formatted overlay based on file type
5. Provides syntax highlighting and proper formatting

### Privacy & Security
- **No Data Collection**: The extension doesn't collect or store any personal data
- **Local Processing**: All file processing happens locally in your browser
- **No External Requests**: Files are fetched directly from email providers
- **Secure**: Uses standard web APIs with appropriate permissions

### Browser Permissions
- `activeTab`: Access to the current tab to inject content scripts
- `storage`: Store user preferences (enable/disable state)
- `host_permissions`: Access to email provider domains (Gmail, Outlook)

## 🐛 Troubleshooting

### Extension Not Working
1. **Check if enabled**: Click the extension icon and ensure it's enabled
2. **Refresh the page**: Reload your email client page
3. **Check file type**: Only .md, .json, .markdown, and .txt files are supported
4. **Developer Console**: Press F12 and check for any error messages

### Attachment Not Opening
1. **Verify file type**: Make sure the attachment is a supported format
2. **Check URL**: Some email clients use complex attachment URLs
3. **Try different email**: Test with a different email to isolate the issue
4. **Browser compatibility**: Ensure you're using a supported browser

### Performance Issues
1. **Large files**: Very large files (>1MB) may take time to load
2. **Browser memory**: Close other tabs if experiencing slowdowns
3. **Clear cache**: Clear browser cache and reload

## 🤝 Contributing

### Development Setup
1. Clone or download the project
2. Make your changes
3. Test in developer mode
4. Submit a pull request

### Adding New File Types
To add support for new file types:
1. Update the `isAttachmentUrl()` function in `content.js`
2. Add file extension detection in `getFileExtension()`
3. Add rendering logic in `createViewer()`
4. Update styles in `styles.css`

### Testing
Test the extension with:
- Different email clients (Gmail, Outlook, Yahoo Mail)
- Various file types and sizes
- Different browsers (Chrome, Firefox, Edge)
- Mobile and desktop views

## 📝 Changelog

### Version 1.0.0
- Initial release
- Support for .md, .json, .txt files
- Gmail and Outlook compatibility
- Dark mode support
- Mobile responsive design

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Thanks to the open-source community for inspiration
- Email providers for maintaining accessible APIs
- Users who provide feedback and suggestions

## 💡 Feature Requests

Have an idea for improvement? Please:
1. Check existing issues first
2. Create a detailed feature request
3. Explain the use case and benefits
4. Consider contributing the feature yourself

---

**Happy Email Reading! 📧✨**