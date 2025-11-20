import * as http from "http";
import * as XLSX from "xlsx";
import { CustomerStore } from "./store.js";

export class UploadServer {
  private server: http.Server | null = null;

  constructor(private store: CustomerStore) {}

  start(port: number): Promise<string> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (req.method === "GET") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(this.getHtml()); // Moved HTML string to helper method
        } else if (req.method === "POST" && req.url === "/upload") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const { fileContent, emailColumn } = JSON.parse(body);
              const buffer = Buffer.from(fileContent, "base64");
              const workbook = XLSX.read(buffer, { type: "buffer" });
              const sheetName = workbook.SheetNames[0];
              const data: any[] = XLSX.utils.sheet_to_json(
                workbook.Sheets[sheetName]
              );

              // Normalize data
              const cleanedData = data.map((row) => ({
                email: row[emailColumn || "email"],
                ...row,
              }));

              await this.store.save(cleanedData);

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ success: true, count: cleanedData.length })
              );
            } catch (e: any) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        }
      });

      this.server.listen(port, () => {
        resolve(`http://localhost:${port}`);
      });
    });
  }

  private getHtml() {
    return `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Data Upload - Gmail MCP Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 20px;
        }
        
        .upload-area:hover {
            border-color: #764ba2;
            background: #f8f9ff;
        }
        
        .upload-area.dragover {
            border-color: #764ba2;
            background: #f0f2ff;
        }
        
        .upload-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        
        input[type="file"] {
            display: none;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .file-info {
            background: #f8f9ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        
        .file-info.visible {
            display: block;
        }
        
        .file-name {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .file-size {
            color: #666;
            font-size: 14px;
        }
        
        .result {
            margin-top: 20px;
            padding: 20px;
            border-radius: 8px;
            display: none;
        }
        
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            display: block;
        }
        
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            display: block;
        }
        
        .result-title {
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .result-details {
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        
        .loading.visible {
            display: block;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📧 Customer Data Upload</h1>
        <p class="subtitle">Gmail MCP Server - Upload CSV or XLSX files</p>
        
        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📁</div>
            <p><strong>Click to select</strong> or drag and drop your file here</p>
            <p style="font-size: 12px; color: #999; margin-top: 10px;">Supported: CSV, XLSX, XLS</p>
        </div>
        
        <input type="file" id="fileInput" accept=".csv,.xlsx,.xls">
        
        <div class="file-info" id="fileInfo">
            <div class="file-name" id="fileName"></div>
            <div class="file-size" id="fileSize"></div>
        </div>
        
        <form id="uploadForm">
            <div class="form-group">
                <label for="emailColumn">Email Column Name</label>
                <input type="text" id="emailColumn" value="email" placeholder="Enter the column name containing emails">
            </div>
            
            <button type="submit" id="uploadBtn">Upload Customer Data</button>
        </form>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Uploading and processing...</p>
        </div>
        
        <div class="result" id="result">
            <div class="result-title" id="resultTitle"></div>
            <div class="result-details" id="resultDetails"></div>
        </div>
    </div>
    
    <script>
        let selectedFile = null;
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const uploadForm = document.getElementById('uploadForm');
        const uploadBtn = document.getElementById('uploadBtn');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        const resultTitle = document.getElementById('resultTitle');
        const resultDetails = document.getElementById('resultDetails');
        
        // Click to select file
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // File selected
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
        
        function handleFile(file) {
            selectedFile = file;
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileInfo.classList.add('visible');
            result.style.display = 'none';
        }
        
        function formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
        
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!selectedFile) {
                showResult('error', 'Please select a file first');
                return;
            }
            
            const emailColumn = document.getElementById('emailColumn').value.trim();
            if (!emailColumn) {
                showResult('error', 'Please enter an email column name');
                return;
            }
            
            uploadBtn.disabled = true;
            loading.classList.add('visible');
            result.style.display = 'none';
            
            try {
                // Convert file to base64
                const base64 = await fileToBase64(selectedFile);
                
                // Send to server
                const response = await fetch('/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileContent: base64,
                        fileName: selectedFile.name,
                        emailColumn: emailColumn
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showResult('success', 'Upload Successful!', data.message);
                } else {
                    showResult('error', 'Upload Failed', data.error || 'Unknown error occurred');
                }
            } catch (error) {
                showResult('error', 'Upload Failed', error.message);
            } finally {
                uploadBtn.disabled = false;
                loading.classList.remove('visible');
            }
        });
        
        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        function showResult(type, title, details = '') {
            result.className = 'result ' + type;
            resultTitle.textContent = title;
            resultDetails.textContent = details;
        }
    </script>
</body>
</html>
    `;
  }
}
