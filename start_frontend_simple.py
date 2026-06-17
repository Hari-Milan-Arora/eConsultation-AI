#!/usr/bin/env python3
"""
Simple Frontend Server
Serves the built React app using Python's built-in HTTP server
"""

import os
import sys
import subprocess
import logging
import http.server
import socketserver
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def serve_built_app():
    """Serve the built React app using Python HTTP server"""
    try:
        os.chdir('frontend')
        
        # Check if build folder exists
        if not os.path.exists('build'):
            logger.error("❌ Build folder not found")
            logger.info("The React app needs to be built first")
            logger.info("Options:")
            logger.info("1. Install Node.js and run: npm run build")
            logger.info("2. Use Docker: docker-compose up")
            return False
        
        # Change to build directory
        os.chdir('build')
        
        PORT = 3000
        
        class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                super().end_headers()
            
            def do_GET(self):
                # Serve index.html for all routes (SPA routing)
                if self.path != '/' and not os.path.exists(self.path[1:]):
                    self.path = '/index.html'
                return super().do_GET()
        
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            logger.info(f"🚀 Serving React app at http://localhost:{PORT}")
            logger.info("Press Ctrl+C to stop the server")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        return True
    except Exception as e:
        logger.error(f"❌ Error serving app: {e}")
        return False

def create_simple_html():
    """Create a simple HTML file if build doesn't exist"""
    logger.info("Creating simple HTML interface...")
    
    os.makedirs('frontend/simple', exist_ok=True)
    
    html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eConsultation AI - Simple Interface</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            font-size: 18px;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f9f9f9;
        }
        .section h2 {
            color: #333;
            margin-top: 0;
        }
        .form-group {
            margin: 15px 0;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        .form-group select,
        .form-group textarea,
        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        .form-group textarea {
            height: 100px;
            resize: vertical;
        }
        .btn {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
        }
        .btn:hover {
            background: #0056b3;
        }
        .btn-success {
            background: #28a745;
        }
        .btn-success:hover {
            background: #1e7e34;
        }
        .status {
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
            display: none;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .api-info {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .api-info h3 {
            margin-top: 0;
            color: #0066cc;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 eConsultation AI</h1>
            <p>AI-Powered Comment Analysis System</p>
        </div>

        <div class="api-info">
            <h3>📡 API Information</h3>
            <p><strong>Backend API:</strong> <a href="http://localhost:8000" target="_blank">http://localhost:8000</a></p>
            <p><strong>API Documentation:</strong> <a href="http://localhost:8000/docs" target="_blank">http://localhost:8000/docs</a></p>
            <p><strong>Health Check:</strong> <a href="http://localhost:8000/health" target="_blank">http://localhost:8000/health</a></p>
        </div>

        <div id="status" class="status"></div>

        <div class="section">
            <h2>📝 Submit Comment</h2>
            <form id="commentForm">
                <div class="form-group">
                    <label for="stakeholder_type">Stakeholder Type:</label>
                    <select id="stakeholder_type" name="stakeholder_type">
                        <option value="citizen">Citizen</option>
                        <option value="business">Business</option>
                        <option value="ngo">NGO</option>
                        <option value="academic">Academic</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="raw_text">Comment:</label>
                    <textarea id="raw_text" name="raw_text" placeholder="Enter your comment here..." required></textarea>
                </div>
                <button type="submit" class="btn btn-success">Submit Comment</button>
            </form>
        </div>

        <div class="section">
            <h2>📊 Quick Actions</h2>
            <button onclick="loadDashboard()" class="btn">Load Dashboard</button>
            <button onclick="loadComments()" class="btn">Load Comments</button>
            <button onclick="generateWordcloud()" class="btn">Generate Word Cloud</button>
            <button onclick="testSystem()" class="btn">Test System</button>
        </div>

        <div class="section">
            <h2>📤 CSV Upload</h2>
            <div class="form-group">
                <label for="csvFile">Choose CSV File:</label>
                <input type="file" id="csvFile" accept=".csv">
            </div>
            <button onclick="uploadCSV()" class="btn">Upload CSV</button>
        </div>

        <div id="results" class="section" style="display: none;">
            <h2>📋 Results</h2>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        const API_BASE = 'http://localhost:8000';

        function showStatus(message, isError = false) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = `status ${isError ? 'error' : 'success'}`;
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 5000);
        }

        function showResults(content) {
            const results = document.getElementById('results');
            const resultsContent = document.getElementById('resultsContent');
            resultsContent.innerHTML = content;
            results.style.display = 'block';
        }

        // Submit comment form
        document.getElementById('commentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                stakeholder_type: formData.get('stakeholder_type'),
                raw_text: formData.get('raw_text')
            };

            try {
                const response = await fetch(`${API_BASE}/api/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    const result = await response.json();
                    showStatus(`Comment processed! Sentiment: ${result.sentiment_label} (${(result.sentiment_score * 100).toFixed(1)}%)`);
                    document.getElementById('raw_text').value = '';
                } else {
                    showStatus('Failed to submit comment', true);
                }
            } catch (error) {
                showStatus('Error connecting to backend', true);
            }
        });

        // Load dashboard
        async function loadDashboard() {
            try {
                const response = await fetch(`${API_BASE}/api/dashboard`);
                if (response.ok) {
                    const data = await response.json();
                    const content = `
                        <h3>Dashboard Statistics</h3>
                        <p><strong>Total Comments:</strong> ${data.total_comments}</p>
                        <p><strong>Positive:</strong> ${data.positive_percentage.toFixed(1)}%</p>
                        <p><strong>Neutral:</strong> ${data.neutral_percentage.toFixed(1)}%</p>
                        <p><strong>Negative:</strong> ${data.negative_percentage.toFixed(1)}%</p>
                    `;
                    showResults(content);
                    showStatus('Dashboard data loaded');
                } else {
                    showStatus('Failed to load dashboard', true);
                }
            } catch (error) {
                showStatus('Error loading dashboard', true);
            }
        }

        // Load comments
        async function loadComments() {
            try {
                const response = await fetch(`${API_BASE}/api/comments?limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    let content = '<h3>Recent Comments</h3>';
                    data.forEach(comment => {
                        content += `
                            <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px;">
                                <strong>ID ${comment.id}</strong> - ${comment.stakeholder_type} - 
                                <span style="color: ${comment.sentiment_label === 'positive' ? 'green' : comment.sentiment_label === 'negative' ? 'red' : 'gray'}">
                                    ${comment.sentiment_label.toUpperCase()}
                                </span><br>
                                <em>${comment.summary}</em>
                            </div>
                        `;
                    });
                    showResults(content);
                    showStatus(`Loaded ${data.length} comments`);
                } else {
                    showStatus('Failed to load comments', true);
                }
            } catch (error) {
                showStatus('Error loading comments', true);
            }
        }

        // Generate word cloud
        async function generateWordcloud() {
            try {
                const response = await fetch(`${API_BASE}/api/wordcloud`);
                if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    const content = `
                        <h3>Generated Word Cloud</h3>
                        <img src="${imageUrl}" alt="Word Cloud" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;">
                    `;
                    showResults(content);
                    showStatus('Word cloud generated');
                } else {
                    showStatus('Failed to generate word cloud', true);
                }
            } catch (error) {
                showStatus('Error generating word cloud', true);
            }
        }

        // Test system
        async function testSystem() {
            try {
                const response = await fetch(`${API_BASE}/health`);
                if (response.ok) {
                    const data = await response.json();
                    const content = `
                        <h3>System Health</h3>
                        <p><strong>Status:</strong> ${data.status}</p>
                        <p><strong>Database:</strong> ${data.database}</p>
                        <p><strong>Comment Count:</strong> ${data.comment_count}</p>
                        <p><strong>Models:</strong> ${JSON.stringify(data.models)}</p>
                    `;
                    showResults(content);
                    showStatus('System is healthy');
                } else {
                    showStatus('System health check failed', true);
                }
            } catch (error) {
                showStatus('Error checking system health', true);
            }
        }

        // Upload CSV
        async function uploadCSV() {
            const fileInput = document.getElementById('csvFile');
            const file = fileInput.files[0];
            
            if (!file) {
                showStatus('Please select a CSV file', true);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${API_BASE}/api/comments/bulk`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    showStatus(`Successfully processed ${data.comments.length} comments from CSV`);
                    fileInput.value = '';
                } else {
                    showStatus('Failed to upload CSV', true);
                }
            } catch (error) {
                showStatus('Error uploading CSV', true);
            }
        }
    </script>
</body>
</html>'''
    
    with open('frontend/simple/index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    logger.info("✅ Simple HTML interface created at frontend/simple/index.html")

def main():
    """Main function"""
    logger.info("🚀 Starting eConsultation AI Frontend (Simple Version)")
    
    # Try to serve built app first
    if os.path.exists('frontend/build'):
        logger.info("Found built React app, serving...")
        serve_built_app()
    else:
        logger.info("No built React app found, creating simple interface...")
        create_simple_html()
        
        # Serve simple interface
        try:
            os.chdir('frontend/simple')
            PORT = 3000
            
            with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
                logger.info(f"🚀 Serving simple interface at http://localhost:{PORT}")
                logger.info("Press Ctrl+C to stop the server")
                httpd.serve_forever()
                
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"❌ Error serving simple interface: {e}")

if __name__ == "__main__":
    main()